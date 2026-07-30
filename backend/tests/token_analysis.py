#!/usr/bin/env python3
"""
Token Usage & Cost Estimator for ResumeX Analyzer
===================================================
Counts actual tokens per agent prompt using Gemini's count_tokens API
(separate quota, no generation cost), then calculates per-request cost
and compares free alternative models.

Run:
    uv run python tests/token_analysis.py
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field

from google import genai
from config import settings

client = genai.Client(api_key=settings.gemini_api_key)

# ─── Sample data (realistic size) ────────────────────────────────────────────

SAMPLE_RESUME_TEXT = """
John Doe
john.doe@email.com | +1-555-0100 | San Francisco, CA
linkedin.com/in/johndoe | github.com/johndoe

SUMMARY
Senior Backend Engineer with 5+ years of experience building scalable distributed
systems. Led teams of 4-6 engineers, shipped products used by 500K+ users.

SKILLS
Languages: Python, Go, TypeScript, SQL, Bash
Frameworks: FastAPI, Django, Flask, LangChain, LangGraph
Infrastructure: Docker, Kubernetes, Terraform, AWS (EC2, RDS, S3, Lambda)
Databases: PostgreSQL, Redis, MongoDB, Elasticsearch
Tools: Git, GitHub Actions, Prometheus, Grafana, Datadog

EXPERIENCE
Senior Backend Engineer — TechCorp Inc. (Jan 2021 – Present)
- Designed and built microservices handling 1M+ requests/day using FastAPI + PostgreSQL
- Led migration from monolith to microservices, reducing p99 latency by 60%
- Mentored 3 junior engineers; conducted weekly code reviews and 1:1s
- Built ML inference pipeline integrated with LLM APIs serving 200K daily active users

Backend Engineer — StartupXYZ (Jun 2019 – Dec 2020)
- Developed REST APIs for a SaaS project management platform (React + Node.js frontend)
- Reduced database query time by 40% via strategic indexing and query optimization
- Implemented CI/CD pipelines with GitHub Actions, cutting deploy time from 45 to 8 mins
- Integrated third-party payment APIs (Stripe, PayPal), handling $2M+ monthly transactions

Software Engineering Intern — BigTech Co. (May 2018 – Aug 2018)
- Built data pipeline for internal analytics dashboard using Python + BigQuery
- Contributed to open-source internal tooling (3 merged PRs)

EDUCATION
B.S. Computer Science — Stanford University (2019)
GPA: 3.8/4.0 | Dean's List 3 semesters

CERTIFICATIONS
- AWS Certified Solutions Architect – Associate
- Google Cloud Professional Data Engineer

LANGUAGES
English (Native), Spanish (Conversational)
"""

SAMPLE_JD_TEXT = """
Senior Backend Engineer — CloudScale Inc.
Location: San Francisco, CA (Hybrid) | Full-time

About the Role
We're looking for a Senior Backend Engineer to join our Platform team. You'll design
and build the core infrastructure powering our real-time data platform.

Required Skills
- 5+ years of backend engineering experience
- Expert-level Python (FastAPI or Django preferred)
- Strong understanding of distributed systems and microservices
- PostgreSQL and Redis at production scale
- Docker and Kubernetes
- AWS or GCP cloud infrastructure
- Strong system design and architecture skills

Preferred Skills
- Go or Rust
- Kafka or similar message queues
- gRPC and Protocol Buffers
- Experience with LLM/AI integrations
- Terraform or Pulumi for infrastructure-as-code

Responsibilities
- Design and implement scalable backend services
- Own the reliability and performance of production systems
- Collaborate with product and frontend teams on API design
- Mentor junior engineers and contribute to engineering culture
- Lead technical design reviews and architecture decisions

Requirements
- 5+ years professional software engineering experience
- B.S. or M.S. in Computer Science or equivalent
- Track record of building high-throughput production systems

Benefits
- Competitive salary ($180K-$230K)
- Equity package
- Comprehensive health/dental/vision
- $3,000 annual learning budget
- Remote-friendly culture
"""

SAMPLE_RESUME_DATA = {
    "name": "John Doe", "email": "john.doe@email.com", "phone": "+1-555-0100",
    "location": "San Francisco, CA", "summary": "Senior Backend Engineer with 5+ years...",
    "skills": ["Python", "Go", "TypeScript", "SQL", "FastAPI", "Django", "Docker",
               "Kubernetes", "Terraform", "AWS", "PostgreSQL", "Redis", "LangGraph"],
    "experience": [
        {"company": "TechCorp Inc.", "title": "Senior Backend Engineer",
         "start_date": "Jan 2021", "end_date": "Present",
         "description": "Built microservices handling 1M+ req/day. Led team of 4."},
        {"company": "StartupXYZ", "title": "Backend Engineer",
         "start_date": "Jun 2019", "end_date": "Dec 2020",
         "description": "REST APIs for SaaS platform. Reduced DB query time by 40%."},
    ],
    "education": [{"institution": "Stanford University", "degree": "B.S.",
                   "field": "Computer Science", "graduation_year": "2019"}],
    "certifications": ["AWS Certified Solutions Architect", "GCP Data Engineer"],
    "languages": ["English", "Spanish"],
}

SAMPLE_JD_DATA = {
    "job_title": "Senior Backend Engineer", "company": "CloudScale Inc.",
    "location": "San Francisco, CA", "employment_type": "Full-time",
    "required_skills": ["Python", "FastAPI", "PostgreSQL", "Redis", "Docker",
                        "Kubernetes", "AWS", "Distributed Systems"],
    "preferred_skills": ["Go", "Kafka", "gRPC", "LLM integrations", "Terraform"],
    "required_experience_years": 5, "required_education": "B.S. Computer Science",
    "responsibilities": ["Design scalable services", "Own production reliability",
                         "Mentor engineers", "Lead design reviews"],
    "benefits": ["$180K-$230K salary", "Equity", "Health insurance", "$3K learning budget"],
}

SAMPLE_GAPS = {
    "missing_required_skills": ["Redis (not explicit)"],
    "missing_preferred_skills": ["Kafka", "gRPC", "Rust"],
    "experience_gap": "None — 5 years matches requirement",
    "education_gap": "None",
    "improvement_suggestions": [
        "Add explicit Redis experience to skills section",
        "Highlight distributed systems design work more prominently",
        "Add Kafka/gRPC experience if any exists",
        "Quantify team impact more clearly",
    ],
    "mode": "jd_aware",
}


# ─── Agent prompts (mirrors real agent templates) ─────────────────────────────

def build_resume_parser_prompt() -> str:
    return f"""You are a resume-parsing assistant. Extract structured data from the resume text below.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "name": "<string>", "email": "<string>", "phone": "<string>",
  "location": "<string>", "summary": "<string or empty string if absent>",
  "skills": ["<string>"],
  "experience": [{{"company": "<string>", "title": "<string>",
    "start_date": "<string>", "end_date": "<string or 'Present'>", "description": "<string>"}}],
  "education": [{{"institution": "<string>", "degree": "<string>",
    "field": "<string>", "graduation_year": "<string>"}}],
  "certifications": ["<string>"], "languages": ["<string>"]
}}

RESUME TEXT:
{SAMPLE_RESUME_TEXT}"""


def build_jd_parser_prompt() -> str:
    return f"""You are a job-description parsing assistant. Extract structured data from the job description below.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "job_title": "<string>", "company": "<string>", "location": "<string>",
  "employment_type": "<string>", "required_skills": ["<string>"],
  "preferred_skills": ["<string>"], "required_experience_years": <integer or null>,
  "required_education": "<string>", "responsibilities": ["<string>"], "benefits": ["<string>"]
}}

JOB DESCRIPTION TEXT:
{SAMPLE_JD_TEXT}"""


def build_scoring_prompt_jd_aware() -> str:
    return f"""You are a professional resume scoring assistant. Score this resume against the provided
job description on a 0-100 scale.

Return ONLY a valid JSON object — no extra keys, no markdown:
{{
  "overall_score": <integer 0-100>, "label": "<Excellent|Good|Fair|Needs Work>",
  "breakdown": {{"skills_score": <int>, "experience_score": <int>,
    "education_score": <int>, "presentation_score": <int>, "jd_match_score": <int>}},
  "summary": "<1-2 sentence verdict>"
}}

RESUME DATA: {json.dumps(SAMPLE_RESUME_DATA)}
JOB DESCRIPTION DATA: {json.dumps(SAMPLE_JD_DATA)}"""


def build_scoring_prompt_standalone() -> str:
    return f"""You are a professional resume scoring assistant. Score this resume on its own merits
on a 0-100 scale.

Return ONLY a valid JSON object — no extra keys, no markdown:
{{
  "overall_score": <integer 0-100>, "label": "<Excellent|Good|Fair|Needs Work>",
  "breakdown": {{"skills_score": <int>, "experience_score": <int>,
    "education_score": <int>, "presentation_score": <int>, "jd_match_score": null}},
  "summary": "<1-2 sentence verdict>"
}}

RESUME DATA: {json.dumps(SAMPLE_RESUME_DATA)}"""


def build_gap_prompt_jd_aware() -> str:
    return f"""You are a senior career coach performing a gap analysis between a resume and a job description.

Return ONLY a valid JSON object — no extra keys, no markdown:
{{
  "missing_required_skills": ["<string>"], "missing_preferred_skills": ["<string>"],
  "experience_gap": "<string>", "education_gap": "<string>",
  "improvement_suggestions": ["<suggestion>"], "mode": "jd_aware"
}}

RESUME DATA: {json.dumps(SAMPLE_RESUME_DATA)}
JOB DESCRIPTION DATA: {json.dumps(SAMPLE_JD_DATA)}"""


def build_gap_prompt_standalone() -> str:
    return f"""You are a senior career coach reviewing a resume without a specific job description.

Return ONLY a valid JSON object — no extra keys, no markdown:
{{
  "missing_required_skills": [], "missing_preferred_skills": [],
  "experience_gap": "<string>", "education_gap": "<string>",
  "improvement_suggestions": ["<suggestion>"], "mode": "standalone"
}}

RESUME DATA: {json.dumps(SAMPLE_RESUME_DATA)}"""


def build_interview_prompt() -> str:
    return f"""You are an expert interview coach generating targeted interview preparation material.

Return ONLY a valid JSON object — no extra keys, no markdown:
{{
  "behavioral": ["<question>"], "technical": ["<question>"],
  "gap_based": ["<question>"], "tips": ["<tip>"]
}}

RESUME DATA: {json.dumps(SAMPLE_RESUME_DATA)}
JOB DESCRIPTION DATA: {json.dumps(SAMPLE_JD_DATA)}
GAP ANALYSIS: {json.dumps(SAMPLE_GAPS)}"""


# ─── Token counting ───────────────────────────────────────────────────────────

def count_tokens(prompt: str, model: str = "gemini-2.0-flash") -> int:
    """Count tokens using Gemini's count_tokens API (no generation quota used)."""
    try:
        result = client.models.count_tokens(model=model, contents=prompt)
        time.sleep(0.3)  # gentle rate limiting
        return result.total_tokens
    except Exception as e:
        # Fallback: ~4 chars per token (conservative for English/JSON)
        estimated = len(prompt) // 4
        print(f"    ⚠ count_tokens API error ({e.__class__.__name__}), estimating: {estimated}")
        return estimated


def estimate_output_tokens(agent_name: str) -> int:
    """Rough estimate of output tokens per agent based on expected JSON size."""
    estimates = {
        "Resume Parser":    400,  # large structured JSON
        "JD Parser":        250,  # medium structured JSON
        "Scoring (JD)":     120,  # small JSON with breakdown
        "Scoring (Standalone)": 110,
        "Gap (JD-aware)":   200,  # lists + suggestions
        "Gap (Standalone)": 180,
        "Interview Prep":   400,  # 4 lists of questions + tips
    }
    return estimates.get(agent_name, 200)


# ─── Pricing tables ───────────────────────────────────────────────────────────

@dataclass
class ModelPricing:
    name: str
    display: str
    input_per_1m: float   # USD per 1M input tokens
    output_per_1m: float  # USD per 1M output tokens
    free_tier: str
    context_window: str
    speed: str
    notes: str


MODELS = [
    ModelPricing(
        name="gemini-2.0-flash",
        display="Gemini 2.0 Flash (current)",
        input_per_1m=0.10,
        output_per_1m=0.40,
        free_tier="15 RPM / 1M TPM / 1500 RPD",
        context_window="1M tokens",
        speed="⚡⚡⚡ Very fast",
        notes="Currently in use. Free tier daily limit gets exhausted quickly with parallel agents."
    ),
    ModelPricing(
        name="gemini-2.0-flash-lite",
        display="Gemini 2.0 Flash-Lite",
        input_per_1m=0.075,
        output_per_1m=0.30,
        free_tier="30 RPM / 1M TPM / 1500 RPD",
        context_window="1M tokens",
        speed="⚡⚡⚡ Fastest",
        notes="25% cheaper. Higher RPM on free tier. Slightly lower quality — fine for structured JSON."
    ),
    ModelPricing(
        name="gemini-1.5-flash",
        display="Gemini 1.5 Flash",
        input_per_1m=0.075,
        output_per_1m=0.30,
        free_tier="15 RPM / 1M TPM / 1500 RPD",
        context_window="1M tokens",
        speed="⚡⚡⚡ Very fast",
        notes="Mature model. Very reliable structured output. Same free tier as 2.0 Flash."
    ),
    ModelPricing(
        name="gemini-1.5-flash-8b",
        display="Gemini 1.5 Flash-8B",
        input_per_1m=0.0375,
        output_per_1m=0.15,
        free_tier="15 RPM / 4M TPM / 1500 RPD (4x more tokens!)",
        context_window="1M tokens",
        speed="⚡⚡⚡ Fastest",
        notes="🏆 Best free tier value: 4M tokens/min vs 1M for other models. Good enough for parsing tasks."
    ),
    ModelPricing(
        name="groq/llama-3.1-8b-instant",
        display="Groq — Llama 3.1 8B Instant",
        input_per_1m=0.05,
        output_per_1m=0.08,
        free_tier="30 RPM / 131K tokens/day (generous free tier)",
        context_window="128K tokens",
        speed="⚡⚡⚡ Extremely fast (Groq hardware)",
        notes="Groq inference is fastest available. Free tier generous. Change LLM provider."
    ),
    ModelPricing(
        name="groq/llama-3.3-70b",
        display="Groq — Llama 3.3 70B",
        input_per_1m=0.59,
        output_per_1m=0.79,
        free_tier="30 RPM / 131K tokens/day",
        context_window="128K tokens",
        speed="⚡⚡ Fast (Groq hardware)",
        notes="Much smarter output quality at blazing speed. Paid tier only for high volume."
    ),
    ModelPricing(
        name="ollama/llama3.2",
        display="Ollama — Llama 3.2 (Local)",
        input_per_1m=0.0,
        output_per_1m=0.0,
        free_tier="Unlimited (runs locally)",
        context_window="128K tokens",
        speed="⚡ Slow (CPU) / ⚡⚡ (GPU)",
        notes="🆓 Completely free. No quota. Needs local machine. Slower without GPU."
    ),
    ModelPricing(
        name="openrouter/mistral-7b-free",
        display="OpenRouter — Mistral 7B (Free)",
        input_per_1m=0.0,
        output_per_1m=0.0,
        free_tier="Free tier available (rate limited)",
        context_window="32K tokens",
        speed="⚡⚡ Moderate",
        notes="OpenRouter provides free access to several OSS models. Good for testing."
    ),
]


# ─── Main analysis ────────────────────────────────────────────────────────────

@dataclass
class AgentResult:
    name: str
    prompt: str
    input_tokens: int = 0
    output_tokens: int = 0
    mode: str = ""

    @property
    def total_tokens(self) -> int:
        return self.input_tokens + self.output_tokens


def main():
    print("\n" + "="*70)
    print("  ResumeX Analyzer — Token Usage & Cost Estimator")
    print("="*70)

    # ── Build agent configs ───────────────────────────────────────────────────
    agents_jd = [
        AgentResult("Resume Parser",  build_resume_parser_prompt(),         mode="both"),
        AgentResult("JD Parser",      build_jd_parser_prompt(),             mode="jd_aware"),
        AgentResult("Scoring (JD)",   build_scoring_prompt_jd_aware(),      mode="jd_aware"),
        AgentResult("Gap (JD-aware)", build_gap_prompt_jd_aware(),          mode="jd_aware"),
        AgentResult("Interview Prep", build_interview_prompt(),              mode="both"),
    ]
    agents_standalone = [
        AgentResult("Resume Parser",       build_resume_parser_prompt(),    mode="both"),
        AgentResult("Scoring (Standalone)",build_scoring_prompt_standalone(),mode="standalone"),
        AgentResult("Gap (Standalone)",    build_gap_prompt_standalone(),    mode="standalone"),
        AgentResult("Interview Prep",      build_interview_prompt(),         mode="both"),
    ]

    # Job matcher uses NO LLM — always 0 tokens
    print("\n📊 Counting tokens via Gemini count_tokens API...")
    print("   (separate quota, no generation cost)\n")

    all_agents: dict[str, AgentResult] = {}

    # Count tokens for unique prompts
    unique = {a.name: a for a in agents_jd + agents_standalone}
    for name, agent in unique.items():
        tok = count_tokens(agent.prompt)
        out = estimate_output_tokens(name)
        agent.input_tokens = tok
        agent.output_tokens = out
        # Map back
        for lst in [agents_jd, agents_standalone]:
            for a in lst:
                if a.name == name and a.input_tokens == 0:
                    a.input_tokens = tok
                    a.output_tokens = out

    # ── Per-agent breakdown ───────────────────────────────────────────────────
    print("\n" + "─"*70)
    print("  PER-AGENT TOKEN BREAKDOWN (JD-aware mode)")
    print("─"*70)
    print(f"  {'Agent':<22} {'Input tok':>10} {'Output tok':>11} {'Total':>8}  {'Prompt chars':>13}")
    print("  " + "─"*66)

    jd_input_total = jd_output_total = 0
    for a in agents_jd:
        if a.input_tokens == 0:
            a.input_tokens = count_tokens(a.prompt)
            a.output_tokens = estimate_output_tokens(a.name)
        jd_input_total += a.input_tokens
        jd_output_total += a.output_tokens
        print(f"  {a.name:<22} {a.input_tokens:>10,} {a.output_tokens:>11,} "
              f"{a.total_tokens:>8,}  {len(a.prompt):>13,}")

    print(f"  {'Job Matcher (no LLM)':<22} {'0':>10} {'0':>11} {'0':>8}  {'N/A':>13}")
    print("  " + "─"*66)
    jd_total = jd_input_total + jd_output_total
    print(f"  {'TOTAL (JD-aware)':<22} {jd_input_total:>10,} {jd_output_total:>11,} {jd_total:>8,}")

    print("\n" + "─"*70)
    print("  PER-AGENT TOKEN BREAKDOWN (Standalone mode — no JD)")
    print("─"*70)
    print(f"  {'Agent':<22} {'Input tok':>10} {'Output tok':>11} {'Total':>8}  {'Prompt chars':>13}")
    print("  " + "─"*66)

    sa_input_total = sa_output_total = 0
    for a in agents_standalone:
        if a.input_tokens == 0:
            a.input_tokens = count_tokens(a.prompt)
            a.output_tokens = estimate_output_tokens(a.name)
        sa_input_total += a.input_tokens
        sa_output_total += a.output_tokens
        print(f"  {a.name:<22} {a.input_tokens:>10,} {a.output_tokens:>11,} "
              f"{a.total_tokens:>8,}  {len(a.prompt):>13,}")

    print(f"  {'Job Matcher (no LLM)':<22} {'0':>10} {'0':>11} {'0':>8}  {'N/A':>13}")
    print("  " + "─"*66)
    sa_total = sa_input_total + sa_output_total
    print(f"  {'TOTAL (Standalone)':<22} {sa_input_total:>10,} {sa_output_total:>11,} {sa_total:>8,}")

    # ── Cost comparison ───────────────────────────────────────────────────────
    print("\n" + "─"*70)
    print("  COST PER REQUEST — MODEL COMPARISON")
    print("─"*70)
    print(f"  Token baseline — JD-aware: {jd_input_total:,} in / {jd_output_total:,} out")
    print(f"  Token baseline — Standalone: {sa_input_total:,} in / {sa_output_total:,} out\n")
    print(f"  {'Model':<38} {'$/req (JD)':>10} {'$/req (SA)':>11} {'$/1K reqs':>11}  Free Tier")
    print("  " + "─"*90)

    for m in MODELS:
        cost_jd = (jd_input_total / 1_000_000 * m.input_per_1m +
                   jd_output_total / 1_000_000 * m.output_per_1m)
        cost_sa = (sa_input_total / 1_000_000 * m.input_per_1m +
                   sa_output_total / 1_000_000 * m.output_per_1m)
        cost_1k = cost_jd * 1000

        if cost_jd == 0:
            c_jd_str = "FREE"
            c_sa_str = "FREE"
            c_1k_str = "FREE"
        else:
            c_jd_str = f"${cost_jd:.5f}"
            c_sa_str = f"${cost_sa:.5f}"
            c_1k_str = f"${cost_1k:.3f}"

        marker = " ◀ current" if m.name == settings.gemini_model else ""
        print(f"  {m.display:<38} {c_jd_str:>10} {c_sa_str:>11} {c_1k_str:>11}  {m.free_tier}{marker}")

    # ── Free tier daily capacity ──────────────────────────────────────────────
    print("\n" + "─"*70)
    print("  FREE TIER DAILY REQUEST CAPACITY (JD-aware mode)")
    print(f"  Tokens per request: ~{jd_total:,}")
    print("─"*70)

    free_tier_data = [
        ("Gemini 2.0 Flash",      1_000_000, 1500, 5),
        ("Gemini 2.0 Flash-Lite", 1_000_000, 1500, 5),
        ("Gemini 1.5 Flash",      1_000_000, 1500, 5),
        ("Gemini 1.5 Flash-8B",   4_000_000, 1500, 4),  # 4M TPM!
    ]

    for name, tpm, rpd, agents in free_tier_data:
        # Parallel agents in one request may all fire within the same minute
        # tpm limits how many requests can run concurrently
        requests_by_rpd = rpd
        requests_by_tpm = tpm // jd_total  # requests per minute ceiling
        daily_cap = min(requests_by_rpd, requests_by_tpm * 60 * 24)  # conservative
        print(f"  {name:<28} RPD limit: {rpd:>5}  |  TPM limit: {requests_by_tpm:>4} req/min  "
              f"→  ~{min(rpd, requests_by_tpm * 60):>5} req/day practical")

    # ── Recommendations ───────────────────────────────────────────────────────
    print("\n" + "─"*70)
    print("  RECOMMENDATIONS")
    print("─"*70)

    recs = [
        ("🥇 Best free tier",      "gemini-1.5-flash-8b",
         "4M tokens/min free tier = 4x more headroom. Good JSON structured output."),
        ("🏆 Best quality/free",   "gemini-2.0-flash-lite",
         "Latest model, 30 RPM free (2x current), 25% cheaper on paid."),
        ("⚡ Best speed (free)",   "groq/llama-3.1-8b-instant",
         "Groq hardware is 10x faster than cloud GPUs. 131K tokens/day free."),
        ("🆓 Unlimited free",      "ollama/llama3.2 (local)",
         "Zero cost, zero quota. Run locally. Needs GPU for good speed."),
        ("💰 Cheapest paid",       "gemini-1.5-flash-8b",
         "$0.0375/M input — ~$0.003/request. 100K requests ≈ $30."),
    ]
    for label, model, reason in recs:
        print(f"\n  {label}")
        print(f"    Model:  {model}")
        print(f"    Why:    {reason}")

    print("\n" + "─"*70)
    print("  QUICK SWITCH: change GEMINI_MODEL in .env to swap models instantly.")
    print("  For Groq/Ollama: swap services/gemini_client.py for langchain-groq")
    print("  or ollama SDK — all agent prompts stay identical.")
    print("─"*70 + "\n")


if __name__ == "__main__":
    main()

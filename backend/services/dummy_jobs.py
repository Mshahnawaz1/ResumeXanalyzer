"""
Dummy Job Postings Service

Returns a static list of job postings filtered/ranked by resume skills.
Interface mirrors what a real job-board API response would look like —
swap this file's implementation to wire up a real API without touching
any agent code.

Each job dict:
{
  "id":          str,
  "title":       str,
  "company":     str,
  "location":    str,
  "type":        str,          # Full-time | Part-time | Contract | Remote
  "skills":      [str],        # skills this role requires
  "description": str,
  "match_score": float,        # 0-100, computed here against resume skills
}
"""

from __future__ import annotations

_JOB_POSTINGS: list[dict] = [
    {
        "id": "job-001",
        "title": "Backend Software Engineer",
        "company": "TechCorp",
        "location": "San Francisco, CA (Hybrid)",
        "type": "Full-time",
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "REST API", "SQL"],
        "description": "Build scalable backend services for our data platform.",
    },
    {
        "id": "job-002",
        "title": "Full Stack Developer",
        "company": "StartupXYZ",
        "location": "Remote",
        "type": "Full-time",
        "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "GraphQL", "Python"],
        "description": "Join our small team building next-gen SaaS products.",
    },
    {
        "id": "job-003",
        "title": "Machine Learning Engineer",
        "company": "AI Labs Inc.",
        "location": "New York, NY",
        "type": "Full-time",
        "skills": ["Python", "TensorFlow", "PyTorch", "scikit-learn", "SQL", "Docker", "LLM"],
        "description": "Design and deploy ML models at scale.",
    },
    {
        "id": "job-004",
        "title": "DevOps Engineer",
        "company": "CloudBase",
        "location": "Austin, TX (Remote OK)",
        "type": "Full-time",
        "skills": ["Docker", "Kubernetes", "Terraform", "AWS", "CI/CD", "Bash", "Python"],
        "description": "Own infrastructure automation and deployment pipelines.",
    },
    {
        "id": "job-005",
        "title": "Data Scientist",
        "company": "DataWorks",
        "location": "Seattle, WA",
        "type": "Full-time",
        "skills": ["Python", "pandas", "scikit-learn", "SQL", "Tableau", "Statistics"],
        "description": "Extract insights from large datasets and build predictive models.",
    },
    {
        "id": "job-006",
        "title": "Frontend Engineer",
        "company": "PixelPerfect",
        "location": "Remote",
        "type": "Contract",
        "skills": ["React", "JavaScript", "TypeScript", "CSS", "HTML", "Figma"],
        "description": "Craft beautiful, high-performance user interfaces.",
    },
    {
        "id": "job-007",
        "title": "Cloud Solutions Architect",
        "company": "Nexus Systems",
        "location": "Chicago, IL",
        "type": "Full-time",
        "skills": ["AWS", "Azure", "GCP", "Terraform", "Kubernetes", "Docker", "Architecture"],
        "description": "Design enterprise cloud architecture for Fortune 500 clients.",
    },
    {
        "id": "job-008",
        "title": "Platform Engineer",
        "company": "ScaleUp",
        "location": "Remote",
        "type": "Full-time",
        "skills": ["Python", "Go", "Kubernetes", "gRPC", "PostgreSQL", "Redis", "Kafka"],
        "description": "Build the internal developer platform powering all product teams.",
    },
    {
        "id": "job-009",
        "title": "AI/LLM Product Engineer",
        "company": "GenAI Co.",
        "location": "San Francisco, CA",
        "type": "Full-time",
        "skills": [
            "Python", "LLM", "LangChain", "LangGraph", "FastAPI", "Prompt Engineering", "AI",
        ],
        "description": "Build AI-native products powered by large language models.",
    },
    {
        "id": "job-010",
        "title": "Software Engineer (Java)",
        "company": "EnterpriseEdge",
        "location": "Boston, MA",
        "type": "Full-time",
        "skills": ["Java", "Spring Boot", "Microservices", "Kafka", "PostgreSQL", "Docker"],
        "description": "Develop high-throughput financial transaction processing systems.",
    },
]


def _compute_match_score(resume_skills: list[str], job_skills: list[str]) -> float:
    """Return 0-100 score: % of job skills that appear in the resume (case-insensitive)."""
    if not job_skills:
        return 0.0
    resume_lower = {s.lower() for s in resume_skills}
    matched = sum(1 for s in job_skills if s.lower() in resume_lower)
    return round((matched / len(job_skills)) * 100, 1)


def get_job_matches(resume_skills: list[str], top_n: int = 5) -> list[dict]:
    """
    Score all dummy postings against *resume_skills* and return the top-N matches,
    sorted descending by match_score.  Always returns at least 1 result.
    """
    scored = []
    for job in _JOB_POSTINGS:
        score = _compute_match_score(resume_skills, job["skills"])
        scored.append({**job, "match_score": score})

    scored.sort(key=lambda j: j["match_score"], reverse=True)
    return scored[:top_n]

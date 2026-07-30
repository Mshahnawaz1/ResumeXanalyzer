"""
Scoring Agent

Input:  state["resume_data"]  — structured resume dict from ResumeParser
        state["jd_data"]      — structured JD dict from JDParser (optional)

Output: state["score"]        — scoring result dict

Schema:
{
  "overall_score":        int,          # 0-100
  "label":                str,          # "Excellent" | "Good" | "Fair" | "Needs Work"
  "breakdown": {
    "skills_score":       int,          # 0-100
    "experience_score":   int,          # 0-100
    "education_score":    int,          # 0-100
    "presentation_score": int,          # 0-100
    "jd_match_score":     int | null    # 0-100 or null if no JD provided
  },
  "summary":              str           # 1-2 sentence overall verdict
}

Behaviour:
- If jd_data is present → JD-aware scoring (match alignment factored in).
- If jd_data is absent  → standalone resume quality scoring.
"""

from __future__ import annotations

from orchestrator.state import GraphState
from services.gemini_client import call_gemini

_PROMPT_WITH_JD = """\
You are a professional resume scoring assistant. Score this resume against the provided
job description on a 0-100 scale.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "overall_score": <integer 0-100>,
  "label": "<Excellent | Good | Fair | Needs Work>",
  "breakdown": {{
    "skills_score":       <integer 0-100>,
    "experience_score":   <integer 0-100>,
    "education_score":    <integer 0-100>,
    "presentation_score": <integer 0-100>,
    "jd_match_score":     <integer 0-100>
  }},
  "summary": "<1-2 sentence overall verdict>"
}}

Scoring rubric (JD-aware mode):
- skills_score:       how well resume skills cover JD required/preferred skills
- experience_score:   years + relevance of experience vs JD requirements
- education_score:    education level vs JD required education
- presentation_score: clarity, completeness, and formatting of the resume
- jd_match_score:     holistic alignment with the job description
- overall_score:      weighted average (skills 30%, experience 25%, education 15%,
                      presentation 15%, jd_match 15%)

Scoring labels:
- 80-100 → Excellent
- 60-79  → Good
- 40-59  → Fair
- 0-39   → Needs Work

RESUME DATA (parsed):
{resume_data}

JOB DESCRIPTION DATA (parsed):
{jd_data}
"""

_PROMPT_NO_JD = """\
You are a professional resume scoring assistant. Score this resume on its own merits
(no job description provided) on a 0-100 scale.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "overall_score": <integer 0-100>,
  "label": "<Excellent | Good | Fair | Needs Work>",
  "breakdown": {{
    "skills_score":       <integer 0-100>,
    "experience_score":   <integer 0-100>,
    "education_score":    <integer 0-100>,
    "presentation_score": <integer 0-100>,
    "jd_match_score":     null
  }},
  "summary": "<1-2 sentence overall verdict>"
}}

Scoring rubric (standalone mode):
- skills_score:       breadth, depth, and relevance of listed skills
- experience_score:   seniority, progression, and impact clarity in work history
- education_score:    relevance and level of education credentials
- presentation_score: completeness, formatting clarity, absence of red flags
- overall_score:      weighted average (skills 30%, experience 35%, education 15%,
                      presentation 20%) — jd_match_score is null in standalone mode

Scoring labels:
- 80-100 → Excellent
- 60-79  → Good
- 40-59  → Fair
- 0-39   → Needs Work

RESUME DATA (parsed):
{resume_data}
"""


def run_scoring_agent(state: GraphState) -> dict:
    """LangGraph node — scores the resume (with or without a JD)."""
    resume_data = state.get("resume_data")
    if not resume_data:
        return {"errors": ["ScoringAgent: resume_data not available — skipping."]}

    jd_data = state.get("jd_data")

    if jd_data:
        prompt = _PROMPT_WITH_JD.format(
            resume_data=resume_data,
            jd_data=jd_data,
        )
    else:
        prompt = _PROMPT_NO_JD.format(resume_data=resume_data)

    try:
        score = call_gemini(prompt)
    except Exception as exc:
        return {"errors": [f"ScoringAgent error: {exc}"], "score": None}

    return {"score": score}

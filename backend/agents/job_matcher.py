"""
Job Matcher Agent

Input:  state["resume_data"]   — structured resume dict from ResumeParser

Output: state["job_matches"]   — list of ranked job matches from dummy data

Each match:
{
  "id":          str,
  "title":       str,
  "company":     str,
  "location":    str,
  "type":        str,
  "skills":      [str],
  "description": str,
  "match_score": float   # 0-100
}

Uses local dummy_jobs service — swap implementation there for real API.
"""

from __future__ import annotations

from orchestrator.state import GraphState
from services.dummy_jobs import get_job_matches


def run_job_matcher(state: GraphState) -> dict:
    """LangGraph node — matches resume skills against dummy job postings."""
    resume_data = state.get("resume_data")
    if not resume_data:
        return {"errors": ["JobMatcher: resume_data not available — skipping."], "job_matches": []}

    resume_skills: list[str] = resume_data.get("skills", [])

    try:
        matches = get_job_matches(resume_skills, top_n=5)
    except Exception as exc:
        return {"errors": [f"JobMatcher error: {exc}"], "job_matches": []}

    return {"job_matches": matches}

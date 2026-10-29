"""
Gap Agent

Input:  state["resume_data"]  — structured resume dict from ResumeParser
        state["jd_data"]      — structured JD dict from JDParser (optional)

Output: state["gaps"]         — gap analysis result

Schema (with JD):
{
  "missing_required_skills":  [str],     # skills in JD required_skills not in resume
  "missing_preferred_skills": [str],     # skills in JD preferred_skills not in resume
  "experience_gap":           str,       # narrative about experience shortfall (or "None")
  "education_gap":            str,       # narrative about education shortfall (or "None")
  "improvement_suggestions":  [str],     # actionable steps to close gaps
  "mode":                     "jd_aware"
}

Schema (no JD — standalone review):
{
  "missing_required_skills":  [],
  "missing_preferred_skills": [],
  "experience_gap":           str,       # general experience quality issues
  "education_gap":            str,       # general education notes
  "improvement_suggestions":  [str],     # general resume improvement tips
  "mode":                     "standalone"
}
"""

from __future__ import annotations

from orchestrator.state import GraphState
from services.llm_client import call_llm

_PROMPT_WITH_JD = """\
You are a senior career coach performing a gap analysis between a resume and a job description.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "missing_required_skills":  ["<string>"],
  "missing_preferred_skills": ["<string>"],
  "experience_gap":           "<string — describe experience gap, or 'None' if none>",
  "education_gap":            "<string — describe education gap, or 'None' if none>",
  "improvement_suggestions":  ["<specific, actionable suggestion>"],
  "mode":                     "jd_aware"
}}

Rules:
- missing_required_skills: list every skill from jd required_skills that is absent from
  resume skills.
- missing_preferred_skills: list every skill from jd preferred_skills that is absent from
  resume skills.
- improvement_suggestions: 4-7 concrete, actionable suggestions to bridge the gaps.
- Use [] for empty lists. Use "None" string (not null) for no gap.

RESUME DATA (parsed):
{resume_data}

JOB DESCRIPTION DATA (parsed):
{jd_data}
"""

_PROMPT_NO_JD = """\
You are a senior career coach reviewing a resume without a specific job description.
Identify weaknesses and provide improvement suggestions.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "missing_required_skills":  [],
  "missing_preferred_skills": [],
  "experience_gap":           "<string — describe any experience section weaknesses, or 'None'>",
  "education_gap":            "<string — describe any education section weaknesses, or 'None'>",
  "improvement_suggestions":  ["<specific, actionable suggestion>"],
  "mode":                     "standalone"
}}

Rules:
- Provide 5-8 improvement_suggestions covering: content quality, quantification of impact,
  skill presentation, formatting, missing sections, modern best practices.
- Use "None" string (not null) for no gap.

RESUME DATA (parsed):
{resume_data}
"""


def run_gap_agent(state: GraphState) -> dict:
    """LangGraph node — identifies resume gaps (vs JD or standalone)."""
    resume_data = state.get("resume_data")
    if not resume_data:
        return {"errors": ["GapAgent: resume_data not available — skipping."]}

    jd_data = state.get("jd_data")

    if jd_data:
        prompt = _PROMPT_WITH_JD.format(
            resume_data=resume_data,
            jd_data=jd_data,
        )
    else:
        prompt = _PROMPT_NO_JD.format(resume_data=resume_data)

    try:
        gaps = call_llm(prompt)
    except Exception as exc:
        return {"errors": [f"GapAgent error: {exc}"], "gaps": None}

    return {"gaps": gaps}

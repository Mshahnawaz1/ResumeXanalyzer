"""
JD Parser Agent

Input:  state["jd_text"]  — raw job-description text (pasted by user, may be empty)
Output: state["jd_data"]  — structured JD dict, or None if no JD was provided

Schema:
{
  "job_title": str,
  "company": str,
  "location": str,
  "employment_type": str,
  "required_skills": [str],
  "preferred_skills": [str],
  "required_experience_years": int | null,
  "required_education": str,
  "responsibilities": [str],
  "benefits": [str]
}

If jd_text is empty, sets jd_data=None and returns without calling Gemini.
"""

from __future__ import annotations

from orchestrator.state import GraphState
from services.llm_client import call_llm

_PROMPT_TEMPLATE = """\
You are a job-description parsing assistant. Extract structured data from the job description below.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "job_title": "<string>",
  "company": "<string>",
  "location": "<string>",
  "employment_type": "<string e.g. Full-time | Part-time | Contract>",
  "required_skills": ["<string>"],
  "preferred_skills": ["<string>"],
  "required_experience_years": <integer or null>,
  "required_education": "<string>",
  "responsibilities": ["<string>"],
  "benefits": ["<string>"]
}}

Use empty string "" for missing scalar fields. Use [] for missing lists.
Use null for missing integer.
Do NOT invent data not present in the text.

JOB DESCRIPTION TEXT:
{jd_text}
"""


def run_jd_parser(state: GraphState) -> dict:
    """LangGraph node — parses raw JD text into structured data.

    If jd_text is empty, sets jd_data=None gracefully (no error logged).
    Downstream agents handle jd_data=None by switching to standalone mode.
    """
    jd_text = state.get("jd_text", "").strip()

    # No JD provided — downstream agents will use standalone mode
    if not jd_text:
        return {"jd_data": None}

    prompt = _PROMPT_TEMPLATE.format(jd_text=jd_text)

    try:
        jd_data = call_llm(prompt)
    except Exception as exc:
        return {"errors": [f"JDParser error: {exc}"], "jd_data": None}

    return {"jd_data": jd_data}

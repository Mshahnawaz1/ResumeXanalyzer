"""
Interview Prep Agent

Input:  state["resume_data"]  — structured resume from ResumeParser
        state["jd_data"]      — structured JD from JDParser (optional)
        state["gaps"]         — gap analysis from GapAgent (optional)

Output: state["interview_questions"]

Schema:
{
  "behavioral":   [str],     # 4-5 behavioral questions (STAR-based)
  "technical":    [str],     # 4-5 technical/role-specific questions
  "gap_based":    [str],     # 2-3 questions probing identified gaps (empty if no gaps/JD)
  "tips":         [str]      # 3-4 preparation tips tailored to this candidate
}
"""

from __future__ import annotations

from orchestrator.state import GraphState
from services.llm_client import call_llm

_PROMPT_TEMPLATE = """\
You are an expert interview coach generating targeted interview preparation material.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "behavioral": ["<question>"],
  "technical":  ["<question>"],
  "gap_based":  ["<question>"],
  "tips":       ["<tip>"]
}}

Rules:
- behavioral: 4-5 STAR-method behavioral questions relevant to the candidate's background.
- technical:  4-5 technical questions based on the candidate's skills and the role
              (use resume skills + JD required skills if JD is present).
- gap_based:  2-3 questions an interviewer might ask to probe the identified gaps;
              use [] if no gaps or no JD.
- tips:       3-4 specific, actionable preparation tips for this candidate.
- All questions should be concrete — no generic filler.

RESUME DATA (parsed):
{resume_data}

JOB DESCRIPTION DATA (parsed, may be empty dict if not provided):
{jd_data}

GAP ANALYSIS (may be empty dict if not available):
{gaps}
"""


def run_interview_prep_agent(state: GraphState) -> dict:
    """LangGraph node — generates tailored interview preparation questions and tips."""
    resume_data = state.get("resume_data")
    if not resume_data:
        return {"errors": ["InterviewPrepAgent: resume_data not available — skipping."]}

    jd_data = state.get("jd_data") or {}
    gaps = state.get("gaps") or {}

    prompt = _PROMPT_TEMPLATE.format(
        resume_data=resume_data,
        jd_data=jd_data,
        gaps=gaps,
    )

    try:
        questions = call_llm(prompt)
    except Exception as exc:
        return {"errors": [f"InterviewPrepAgent error: {exc}"], "interview_questions": None}

    return {"interview_questions": questions}

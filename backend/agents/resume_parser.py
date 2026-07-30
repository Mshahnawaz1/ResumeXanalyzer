"""
Resume Parser Agent

Input:  state["resume_text"]  — raw text extracted from the uploaded file
Output: state["resume_data"]  — structured resume dict

Schema (all fields):
{
  "name": str,
  "email": str,
  "phone": str,
  "location": str,
  "summary": str,
  "skills": [str],
  "experience": [
    {
      "company": str,
      "title": str,
      "start_date": str,
      "end_date": str,
      "description": str
    }
  ],
  "education": [
    {
      "institution": str,
      "degree": str,
      "field": str,
      "graduation_year": str
    }
  ],
  "certifications": [str],
  "languages": [str]
}
"""

from __future__ import annotations

from orchestrator.state import GraphState
from services.gemini_client import call_gemini


_PROMPT_TEMPLATE = """\
You are a resume-parsing assistant. Extract structured data from the resume text below.

Return ONLY a valid JSON object matching this exact schema — no extra keys, no markdown:

{{
  "name": "<string>",
  "email": "<string>",
  "phone": "<string>",
  "location": "<string>",
  "summary": "<string or empty string if absent>",
  "skills": ["<string>"],
  "experience": [
    {{
      "company": "<string>",
      "title": "<string>",
      "start_date": "<string>",
      "end_date": "<string or 'Present'>",
      "description": "<string>"
    }}
  ],
  "education": [
    {{
      "institution": "<string>",
      "degree": "<string>",
      "field": "<string>",
      "graduation_year": "<string>"
    }}
  ],
  "certifications": ["<string>"],
  "languages": ["<string>"]
}}

Use empty string "" for missing scalar fields. Use [] for missing list fields.
Do NOT invent data that is not present.

RESUME TEXT:
{resume_text}
"""


def run_resume_parser(state: GraphState) -> dict:
    """LangGraph node — parses raw resume text into structured data."""
    resume_text = state.get("resume_text", "").strip()
    if not resume_text:
        return {"errors": ["ResumeParser: resume_text is empty."]}

    prompt = _PROMPT_TEMPLATE.format(resume_text=resume_text)
    resume_data = call_gemini(prompt)
    return {"resume_data": resume_data}

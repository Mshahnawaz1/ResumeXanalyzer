"""
Live Integration Test for the ResumeX Analyzer Pipeline.
Runs the compiled LangGraph pipeline end-to-end using the live LLM provider.
"""

from __future__ import annotations

import json
from orchestrator.graph import pipeline
from config import settings

SAMPLE_RESUME = """
Jane Doe
jane.doe@example.com | +1-555-0199 | Austin, TX

SUMMARY
Dynamic Software Engineer with 4 years of experience building Python and FastAPI backends.

SKILLS
Python, FastAPI, SQL, Docker, Git

EXPERIENCE
CloudTech — Software Engineer (2022 – Present)
- Designed and maintained REST APIs using FastAPI and PostgreSQL.
- Dockerized service deployments, decreasing onboarding time by 30%.

EDUCATION
B.S. Computer Science — University of Texas, 2022
"""

SAMPLE_JD = """
We are looking for a Backend Developer who loves Python, FastAPI, and SQL.
Must have experience building RESTful APIs.
Experience with Docker is a plus.
"""


def test_live_pipeline():
    print("=" * 60)
    print("  LIVE RESUME PIPELINE INTEGRATION TEST")
    print("=" * 60)
    print(f"  Provider : {settings.llm_provider.upper()}")
    if settings.llm_provider.lower() == "openrouter":
        print(f"  Model    : {settings.openrouter_model}")
        print(f"  Base URL : {settings.openrouter_base_url}")
    else:
        print(f"  Model    : {settings.gemini_model}")
    print("=" * 60)

    # Initialize graph state
    initial_state = {
        "resume_text": SAMPLE_RESUME.strip(),
        "jd_text": SAMPLE_JD.strip(),
        "errors": []
    }

    print("\n🚀 Invoking pipeline...")
    result = pipeline.invoke(initial_state)

    print("\n✅ Pipeline completed!")
    print(f"   Errors logged: {result.get('errors', [])}")
    print("\n--- Pipeline Outputs ---")
    print(f"Score      : {json.dumps(result.get('score'), indent=2)}")
    print(f"Gaps       : {json.dumps(result.get('gaps'), indent=2)}")
    print(f"Matches    : {len(result.get('job_matches', []))} jobs found")
    print(f"Resume Data: {json.dumps(result.get('resume_data'), indent=2)}")
    print(f"JD Data    : {json.dumps(result.get('jd_data'), indent=2)}")
    print(f"Questions  : {json.dumps(result.get('interview_questions'), indent=2)}")
    print("=" * 60)

    # Simple validations
    assert result.get("resume_data") is not None
    assert result.get("jd_data") is not None
    assert result.get("score") is not None
    assert result.get("gaps") is not None
    assert result.get("interview_questions") is not None
    print("\n🎉 ALL LIVE INTEGRATION ASSERTIONS PASSED!")


if __name__ == "__main__":
    test_live_pipeline()

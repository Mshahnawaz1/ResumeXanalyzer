"""
Run:
uv run pytest tests/agents/test_interview_prep_agent.py -s
"""

import json
from unittest.mock import patch

from agents.interview_prep_agent import run_interview_prep_agent
from tests.conftest import MOCK_GAPS, MOCK_JD_DATA, MOCK_RESUME_DATA

MOCK_QUESTIONS = {
    "behavioral": ["Tell me about a time you scaled a system under pressure."],
    "technical": ["How would you design a rate limiter in Go?"],
    "gap_based": ["How have you worked with Docker in production?"],
    "tips": ["Prepare a STAR story about a Kubernetes migration."],
}


@patch("agents.interview_prep_agent.call_llm", return_value=MOCK_QUESTIONS)
def test_interview_prep_with_jd_and_gaps(mock_call):
    state = {"resume_data": MOCK_RESUME_DATA, "jd_data": MOCK_JD_DATA, "gaps": MOCK_GAPS}

    result = run_interview_prep_agent(state)

    print("\n--- InterviewPrepAgent result (mocked LLM) ---")
    print(json.dumps(result, indent=2))

    assert result == {"interview_questions": MOCK_QUESTIONS}
    prompt = mock_call.call_args.args[0]
    assert "Widgets Inc." in prompt
    assert "Add Docker projects" in prompt



@patch("agents.interview_prep_agent.call_llm")
def test_interview_prep_missing_resume(mock_call):
    result = run_interview_prep_agent({"jd_data": MOCK_JD_DATA})

    assert result == {"errors": ["InterviewPrepAgent: resume_data not available — skipping."]}
    mock_call.assert_not_called()


@patch("agents.interview_prep_agent.call_llm", side_effect=RuntimeError("timeout"))
def test_interview_prep_llm_error(mock_call):
    result = run_interview_prep_agent({"resume_data": MOCK_RESUME_DATA})

    assert result == {"errors": ["InterviewPrepAgent error: timeout"], "interview_questions": None}

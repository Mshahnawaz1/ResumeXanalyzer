"""
Run:
uv run pytest tests/agents/test_scoring_agent.py -s
"""

import json
from unittest.mock import patch

from agents.scoring_agent import run_scoring_agent
from tests.conftest import MOCK_JD_DATA, MOCK_RESUME_DATA

MOCK_SCORE = {
    "overall_score": 78,
    "breakdown": {
        "skills_score": 80,
        "experience_score": 75,
        "education_score": 60,
        "presentation_score": 85,
        "jd_match_score": 70,
    },
    "summary": "Strong backend profile with some gaps against the JD.",
}


@patch("agents.scoring_agent.call_llm", return_value=MOCK_SCORE)
def test_scoring_agent_with_jd(mock_call):
    result = run_scoring_agent({"resume_data": MOCK_RESUME_DATA, "jd_data": MOCK_JD_DATA})

    print("\n--- ScoringAgent result, JD-aware (mocked LLM) ---")
    print(json.dumps(result, indent=2))

    assert result == {"score": MOCK_SCORE}
    prompt = mock_call.call_args.args[0]
    assert "Widgets Inc." in prompt
    assert "John Doe" in prompt


@patch("agents.scoring_agent.call_llm", return_value=MOCK_SCORE)
def test_scoring_agent_standalone(mock_call):
    result = run_scoring_agent({"resume_data": MOCK_RESUME_DATA, "jd_data": None})

    print("\n--- ScoringAgent result, standalone (mocked LLM) ---")
    print(json.dumps(result, indent=2))

    assert result == {"score": MOCK_SCORE}
    assert "Widgets Inc." not in mock_call.call_args.args[0]


@patch("agents.scoring_agent.call_llm")
def test_scoring_agent_missing_resume(mock_call):
    result = run_scoring_agent({})

    assert result == {"errors": ["ScoringAgent: resume_data not available — skipping."]}
    mock_call.assert_not_called()


@patch("agents.scoring_agent.call_llm", side_effect=RuntimeError("timeout"))
def test_scoring_agent_llm_error(mock_call):
    result = run_scoring_agent({"resume_data": MOCK_RESUME_DATA})

    assert result == {"errors": ["ScoringAgent error: timeout"], "score": None}

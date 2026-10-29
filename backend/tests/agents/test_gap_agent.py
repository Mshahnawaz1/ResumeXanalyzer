"""
Run:
uv run pytest tests/agents/test_gap_agent.py -s
"""

import json
from unittest.mock import patch

from agents.gap_agent import run_gap_agent
from tests.conftest import MOCK_GAPS, MOCK_JD_DATA, MOCK_RESUME_DATA


@patch("agents.gap_agent.call_llm", return_value=MOCK_GAPS)
def test_gap_agent_with_jd(mock_call):
    result = run_gap_agent({"resume_data": MOCK_RESUME_DATA, "jd_data": MOCK_JD_DATA})

    print("\n--- GapAgent result, JD-aware (mocked LLM) ---")
    print(json.dumps(result, indent=2))

    assert result == {"gaps": MOCK_GAPS}
    prompt = mock_call.call_args.args[0]
    assert "JOB DESCRIPTION DATA" in prompt
    assert '"mode":                     "jd_aware"' in prompt


@patch("agents.gap_agent.call_llm", return_value={**MOCK_GAPS, "mode": "standalone"})
def test_gap_agent_standalone(mock_call):
    result = run_gap_agent({"resume_data": MOCK_RESUME_DATA})

    print("\n--- GapAgent result, standalone (mocked LLM) ---")
    print(json.dumps(result, indent=2))

    assert result["gaps"]["mode"] == "standalone"
    prompt = mock_call.call_args.args[0]
    assert "JOB DESCRIPTION DATA" not in prompt
    assert '"mode":                     "standalone"' in prompt


@patch("agents.gap_agent.call_llm")
def test_gap_agent_missing_resume(mock_call):
    result = run_gap_agent({"jd_data": MOCK_JD_DATA})

    assert result == {"errors": ["GapAgent: resume_data not available — skipping."]}
    mock_call.assert_not_called()


@patch("agents.gap_agent.call_llm", side_effect=ValueError("bad JSON"))
def test_gap_agent_llm_error(mock_call):
    result = run_gap_agent({"resume_data": MOCK_RESUME_DATA})

    assert result == {"errors": ["GapAgent error: bad JSON"], "gaps": None}

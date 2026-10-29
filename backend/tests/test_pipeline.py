"""
End-to-end LangGraph pipeline tests. Agent-level behaviour is covered in tests/agents/.

Run:
uv run pytest tests/test_pipeline.py -s
Live (real LLM, needs API keys):
uv run pytest tests/test_pipeline.py -s -m live
"""

import json
from unittest.mock import patch

import pytest

from orchestrator.graph import pipeline
from tests.conftest import MOCK_GAPS, MOCK_JD_DATA, MOCK_RESUME_DATA

MOCK_SCORE = {"overall_score": 78, "breakdown": {}, "summary": "Good."}
MOCK_QUESTIONS = {"behavioral": ["Q1"], "technical": ["Q2"], "gap_based": [], "tips": ["T1"]}

SAMPLE_RESUME = """\
Jane Doe — jane.doe@example.com — Austin, TX
Software Engineer, 4 years building Python and FastAPI backends.
Skills: Python, FastAPI, SQL, Docker, Git
CloudTech — Software Engineer (2022 – Present): REST APIs with FastAPI and PostgreSQL.
B.S. Computer Science — University of Texas, 2022
"""

SAMPLE_JD = "Backend Developer: Python, FastAPI, SQL, REST APIs. Docker is a plus."


@pytest.fixture
def mock_llm_agents():
    with (
        patch("agents.resume_parser.call_llm", return_value=MOCK_RESUME_DATA),
        patch("agents.jd_parser.call_llm", return_value=MOCK_JD_DATA) as jd,
        patch("agents.scoring_agent.call_llm", return_value=MOCK_SCORE),
        patch("agents.gap_agent.call_llm", return_value=MOCK_GAPS),
        patch("agents.interview_prep_agent.call_llm", return_value=MOCK_QUESTIONS),
    ):
        yield jd


def test_pipeline_with_jd(mock_llm_agents):
    result = pipeline.invoke({"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "errors": []})

    assert result["errors"] == []
    assert result["resume_data"] == MOCK_RESUME_DATA
    assert result["jd_data"] == MOCK_JD_DATA
    assert result["score"] == MOCK_SCORE
    assert result["gaps"] == MOCK_GAPS
    assert result["job_matches"]
    assert result["interview_questions"] == MOCK_QUESTIONS


def test_pipeline_without_jd_skips_jd_parser(mock_llm_agents):
    result = pipeline.invoke({"resume_text": SAMPLE_RESUME, "jd_text": "", "errors": []})

    assert result["errors"] == []
    assert result["jd_data"] is None
    assert result["interview_questions"] == MOCK_QUESTIONS
    mock_llm_agents.assert_not_called()


@pytest.mark.live
def test_pipeline_live():
    result = pipeline.invoke({"resume_text": SAMPLE_RESUME, "jd_text": SAMPLE_JD, "errors": []})

    print("\n--- Pipeline result (live LLM) ---")
    print(json.dumps(result, indent=2))

    assert result["errors"] == []
    for key in ("resume_data", "jd_data", "score", "gaps", "interview_questions"):
        assert result[key] is not None, key

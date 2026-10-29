"""
Run:
uv run pytest tests/agents/test_job_matcher.py -s
"""

import json

from agents.job_matcher import run_job_matcher
from tests.conftest import MOCK_RESUME_DATA


def test_job_matcher_ranks_matches():
    result = run_job_matcher({"resume_data": MOCK_RESUME_DATA})
    matches = result["job_matches"]

    print("\n--- JobMatcher result (dummy jobs) ---")
    print(json.dumps([(j["title"], j["company"], j["match_score"]) for j in matches], indent=2))

    assert "errors" not in result
    assert 1 <= len(matches) <= 5
    scores = [j["match_score"] for j in matches]
    assert scores == sorted(scores, reverse=True)
    assert all(0 <= s <= 100 for s in scores)


def test_job_matcher_no_skills_still_returns_jobs():
    result = run_job_matcher({"resume_data": {**MOCK_RESUME_DATA, "skills": []}})

    assert result["job_matches"]
    assert all(j["match_score"] == 0 for j in result["job_matches"])


def test_job_matcher_missing_resume():
    result = run_job_matcher({})

    assert result == {
        "errors": ["JobMatcher: resume_data not available — skipping."],
        "job_matches": [],
    }

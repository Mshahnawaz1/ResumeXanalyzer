"""
Run:
uv run pytest tests/agents/test_jd_parser.py -s
"""

import json
from unittest.mock import patch

from agents.jd_parser import run_jd_parser
from tests.conftest import MOCK_JD_DATA

JD_TEXT = """\
Backend Engineer — Widgets Inc. (Remote, Full-time)
Required: Python, REST APIs, SQL, Docker. 5+ years experience.
Preferred: Kubernetes, Go, Redis.
"""


@patch("agents.jd_parser.call_llm", return_value=MOCK_JD_DATA)
def test_jd_parser_happy_path(mock_call):
    result = run_jd_parser({"jd_text": JD_TEXT})

    print("\n--- JDParser result (mocked LLM) ---")
    print(json.dumps(result, indent=2))

    assert result == {"jd_data": MOCK_JD_DATA}
    assert JD_TEXT.strip() in mock_call.call_args.args[0]


@patch("agents.jd_parser.call_llm")
def test_jd_parser_empty_text_skips_llm(mock_call):
    assert run_jd_parser({"jd_text": ""}) == {"jd_data": None}
    assert run_jd_parser({}) == {"jd_data": None}
    mock_call.assert_not_called()


@patch("agents.jd_parser.call_llm", side_effect=ValueError("bad JSON"))
def test_jd_parser_llm_error(mock_call):
    result = run_jd_parser({"jd_text": JD_TEXT})

    assert result["jd_data"] is None
    assert result["errors"] == ["JDParser error: bad JSON"]

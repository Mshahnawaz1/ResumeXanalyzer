"""
Run:
uv run pytest tests/agents/test_resume_parser.py -s
Live (real LLM, needs API keys):
uv run pytest tests/agents/test_resume_parser.py -s -m live
"""

import json
from unittest.mock import patch

import pytest

from agents.resume_parser import run_resume_parser
from services.file_extraction import extract_text
from tests.conftest import MOCK_RESUME_DATA, SAMPLE_PDF


@patch("agents.resume_parser.call_llm", return_value=MOCK_RESUME_DATA)
def test_resume_parser_sends_resume_text_to_llm(mock_call, sample_pdf_bytes):
    resume_text = extract_text(sample_pdf_bytes, SAMPLE_PDF.name)

    result = run_resume_parser({"resume_text": resume_text})

    print("\n--- ResumeParser result (mocked LLM) ---")
    print(json.dumps(result, indent=2))

    assert result == {"resume_data": MOCK_RESUME_DATA}
    mock_call.assert_called_once()
    assert resume_text.strip() in mock_call.call_args.args[0]


@patch("agents.resume_parser.call_llm")
def test_resume_parser_empty_text(mock_call):
    result = run_resume_parser({"resume_text": "   "})

    assert result == {"errors": ["ResumeParser: resume_text is empty."]}
    mock_call.assert_not_called()


@pytest.mark.live
def test_resume_parser_live(sample_pdf_bytes):
    resume_text = extract_text(sample_pdf_bytes, SAMPLE_PDF.name)

    result = run_resume_parser({"resume_text": resume_text})

    print("\n--- ResumeParser result (live LLM) ---")
    print(json.dumps(result, indent=2))

    assert result["resume_data"]["skills"]

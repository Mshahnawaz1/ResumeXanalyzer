"""
FastAPI endpoint tests — the pipeline is mocked; it's covered in test_pipeline.py.

Run:
uv run pytest tests/test_api.py
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

PIPELINE_RESULT = {
    "resume_data": {"name": "John Doe"},
    "jd_data": None,
    "score": {"overall_score": 72},
    "job_matches": [],
    "gaps": {},
    "interview_questions": {},
    "errors": [],
}


def _upload(filename: str, content: bytes, **data):
    return client.post("/api/analyze", files={"resume": (filename, content)}, data=data)


def test_health():
    resp = client.get("/health")

    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.parametrize(("jd_text", "mode"), [("", "standalone"), ("Need Python.", "jd_aware")])
@patch("orchestrator.graph.pipeline.invoke", return_value=PIPELINE_RESULT)
def test_analyze(mock_invoke, jd_text, mode, sample_pdf_bytes):
    resp = _upload("resume.pdf", sample_pdf_bytes, jd_text=jd_text)

    assert resp.status_code == 200
    assert resp.json()["mode"] == mode
    assert resp.json()["score"] == {"overall_score": 72}
    assert mock_invoke.call_args.args[0]["jd_text"] == jd_text


def test_analyze_file_too_large():
    assert _upload("big.pdf", b"x" * (11 * 1024 * 1024)).status_code == 413


def test_analyze_unsupported_file_type():
    assert _upload("resume.txt", b"plain text").status_code == 422


def test_analyze_missing_resume():
    assert client.post("/api/analyze", data={"jd_text": "some jd"}).status_code == 422

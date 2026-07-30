"""
Comprehensive backend test suite.

Sections:
  1. Health endpoint
  2. File extraction (PDF/DOCX → text)
  3. Job matcher (no LLM — pure local scoring)
  4. Graph structure validation
  5. Agent unit tests with mocked Gemini
  6. Full pipeline mock run (no real LLM calls)
  7. API endpoint validation (FastAPI TestClient + mocked pipeline)

Run:
    cd backend
    uv run pytest tests/test_full.py -v

Mocking strategy:
  - Agent unit tests: patch `agents.<module>.call_gemini` (where agents
    bind the name at import time via `from services.gemini_client import call_gemini`)
  - Full pipeline tests: patch `services.gemini_client.call_gemini` which
    is the canonical name used by the already-imported singleton at module level
  - API tests: patch `orchestrator.graph.pipeline.invoke` directly
"""

from __future__ import annotations

import io
import json
from unittest.mock import patch, MagicMock

import pytest

# ─────────────────────────────────────────────────────────────
# 1. Health endpoint
# ─────────────────────────────────────────────────────────────

def test_health_endpoint():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "model" in data
    print(f"\n  ✅ /health → {data}")


# ─────────────────────────────────────────────────────────────
# 2. File extraction
# ─────────────────────────────────────────────────────────────

def test_extract_docx():
    import docx as _docx
    from services.file_extraction import extract_text

    doc = _docx.Document()
    doc.add_paragraph("Jane Smith")
    doc.add_paragraph("Skills: Python, FastAPI, Docker")
    doc.add_paragraph("Experience: 3 years at Acme Corp")
    buf = io.BytesIO()
    doc.save(buf)
    text = extract_text(buf.getvalue(), "resume.docx")
    assert "Jane Smith" in text
    assert "Python" in text
    print(f"\n  ✅ DOCX extraction OK — {len(text)} chars extracted")


def test_extract_unsupported_type():
    from services.file_extraction import extract_text
    with pytest.raises(ValueError, match="Unsupported file type"):
        extract_text(b"some bytes", "resume.txt")
    print("\n  ✅ Unsupported file type raises ValueError")


def test_extract_empty_docx():
    import docx as _docx
    from services.file_extraction import extract_text
    doc = _docx.Document()
    buf = io.BytesIO()
    doc.save(buf)
    with pytest.raises(ValueError, match="no extractable text"):
        extract_text(buf.getvalue(), "empty.docx")
    print("\n  ✅ Empty DOCX raises ValueError")


# ─────────────────────────────────────────────────────────────
# 3. Job matcher (no LLM)
# ─────────────────────────────────────────────────────────────

def test_job_matcher_returns_top_n():
    from services.dummy_jobs import get_job_matches
    matches = get_job_matches(["Python", "FastAPI", "Docker", "PostgreSQL"], top_n=5)
    assert len(matches) == 5
    assert all("match_score" in m for m in matches)
    # sorted descending
    scores = [m["match_score"] for m in matches]
    assert scores == sorted(scores, reverse=True)
    print(f"\n  ✅ Job matcher returned {len(matches)} matches, sorted by score")
    for m in matches:
        print(f"     [{m['match_score']}%] {m['title']} @ {m['company']}")


def test_job_matcher_skill_scoring():
    from services.dummy_jobs import get_job_matches, _compute_match_score
    # 100% match
    score = _compute_match_score(["Python", "FastAPI", "PostgreSQL", "Docker", "REST API", "SQL"],
                                  ["Python", "FastAPI", "PostgreSQL", "Docker", "REST API", "SQL"])
    assert score == 100.0
    # 0% match
    score = _compute_match_score(["Java", "Spring"], ["Python", "React"])
    assert score == 0.0
    # 50% match
    score = _compute_match_score(["Python", "Java"], ["Python", "Docker"])
    assert score == 50.0
    print("\n  ✅ Skill scoring: 100%, 0%, 50% cases all pass")


def test_job_matcher_case_insensitive():
    from services.dummy_jobs import _compute_match_score
    score = _compute_match_score(["python", "DOCKER"], ["Python", "Docker"])
    assert score == 100.0
    print("\n  ✅ Skill match is case-insensitive")


def test_job_matcher_empty_skills():
    from services.dummy_jobs import get_job_matches
    matches = get_job_matches([], top_n=5)
    assert len(matches) == 5
    assert all(m["match_score"] == 0.0 for m in matches)
    print("\n  ✅ Empty skills → all matches score 0.0")


# ─────────────────────────────────────────────────────────────
# 4. Graph structure validation
# ─────────────────────────────────────────────────────────────

def test_graph_compiles():
    from orchestrator.graph import pipeline
    assert pipeline is not None
    print("\n  ✅ LangGraph pipeline compiled successfully")


def test_graph_node_names():
    from orchestrator.graph import pipeline
    nodes = list(pipeline.nodes.keys())
    expected = ["resume_parser", "jd_parser", "scoring_agent",
                "job_matcher", "gap_agent", "interview_prep"]
    for name in expected:
        assert name in nodes, f"Missing node: {name}"
    print(f"\n  ✅ All 6 agent nodes present: {[n for n in nodes if n != '__start__']}")


def test_graph_state_schema():
    from orchestrator.state import GraphState
    # Verify all expected keys exist in annotations
    annotations = GraphState.__annotations__
    for key in ["resume_text", "jd_text", "resume_data", "jd_data",
                 "score", "job_matches", "gaps", "interview_questions", "errors"]:
        assert key in annotations, f"Missing state key: {key}"
    print(f"\n  ✅ GraphState has all {len(annotations)} required keys")


# ─────────────────────────────────────────────────────────────
# 5. Agent unit tests (mocked Gemini)
# ─────────────────────────────────────────────────────────────

MOCK_RESUME_DATA = {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "location": "San Francisco, CA",
    "summary": "Experienced backend engineer.",
    "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
    "experience": [{"company": "TechCorp", "title": "Senior Engineer",
                    "start_date": "2021", "end_date": "Present", "description": "Built APIs."}],
    "education": [{"institution": "Stanford", "degree": "B.S.", "field": "CS", "graduation_year": "2019"}],
    "certifications": ["AWS Certified"],
    "languages": ["English"],
}

MOCK_JD_DATA = {
    "job_title": "Backend Engineer",
    "company": "Acme",
    "location": "Remote",
    "employment_type": "Full-time",
    "required_skills": ["Python", "FastAPI", "Kubernetes"],
    "preferred_skills": ["Go", "Redis"],
    "required_experience_years": 3,
    "required_education": "B.S. Computer Science",
    "responsibilities": ["Build APIs", "Write tests"],
    "benefits": ["Health insurance"],
}

MOCK_SCORE = {
    "overall_score": 78,
    "label": "Good",
    "breakdown": {
        "skills_score": 80, "experience_score": 75,
        "education_score": 90, "presentation_score": 70, "jd_match_score": 72
    },
    "summary": "Strong candidate with minor gaps.",
}

MOCK_GAPS = {
    "missing_required_skills": ["Kubernetes"],
    "missing_preferred_skills": ["Go", "Redis"],
    "experience_gap": "None",
    "education_gap": "None",
    "improvement_suggestions": ["Add Kubernetes experience", "Learn Go basics"],
    "mode": "jd_aware",
}

MOCK_INTERVIEW_QUESTIONS = {
    "behavioral": ["Tell me about a time you scaled a service."],
    "technical": ["How does Kubernetes handle pod scheduling?"],
    "gap_based": ["How would you approach learning Kubernetes on the job?"],
    "tips": ["Review Kubernetes concepts before the interview."],
}


@patch("agents.resume_parser.call_gemini", return_value=MOCK_RESUME_DATA)
def test_resume_parser_node(mock_gemini):
    from agents.resume_parser import run_resume_parser
    state = {"resume_text": "John Doe, john@example.com, Python developer.", "errors": []}
    result = run_resume_parser(state)
    assert result["resume_data"]["name"] == "John Doe"
    assert result["resume_data"]["skills"] == ["Python", "FastAPI", "Docker", "PostgreSQL"]
    mock_gemini.assert_called_once()
    print("\n  ✅ ResumeParser: returns structured resume_data")


@patch("agents.jd_parser.call_gemini", return_value=MOCK_JD_DATA)
def test_jd_parser_with_text(mock_gemini):
    from agents.jd_parser import run_jd_parser
    state = {"jd_text": "We need a Backend Engineer with Python skills.", "errors": []}
    result = run_jd_parser(state)
    assert result["jd_data"]["job_title"] == "Backend Engineer"
    mock_gemini.assert_called_once()
    print("\n  ✅ JDParser: parses JD text into structured data")


def test_jd_parser_empty_text():
    from agents.jd_parser import run_jd_parser
    # Should not call Gemini at all
    state = {"jd_text": "", "errors": []}
    result = run_jd_parser(state)
    assert result["jd_data"] is None
    assert result.get("errors", []) == []  # no error on empty JD
    print("\n  ✅ JDParser: empty jd_text → jd_data=None, no error logged")


def test_jd_parser_whitespace_only():
    from agents.jd_parser import run_jd_parser
    state = {"jd_text": "   \n\t  ", "errors": []}
    result = run_jd_parser(state)
    assert result["jd_data"] is None
    print("\n  ✅ JDParser: whitespace-only jd_text → jd_data=None")


@patch("agents.scoring_agent.call_gemini", return_value=MOCK_SCORE)
def test_scoring_agent_with_jd(mock_gemini):
    from agents.scoring_agent import run_scoring_agent
    state = {"resume_data": MOCK_RESUME_DATA, "jd_data": MOCK_JD_DATA, "errors": []}
    result = run_scoring_agent(state)
    assert result["score"]["overall_score"] == 78
    assert result["score"]["label"] == "Good"
    assert result["score"]["breakdown"]["jd_match_score"] == 72
    print(f"\n  ✅ ScoringAgent (JD-aware): score={result['score']['overall_score']}, label={result['score']['label']}")


@patch("agents.scoring_agent.call_gemini", return_value={
    "overall_score": 65,
    "label": "Good",
    "breakdown": {
        "skills_score": 70, "experience_score": 60,
        "education_score": 80, "presentation_score": 65, "jd_match_score": None
    },
    "summary": "Solid resume with room for improvement.",
})
def test_scoring_agent_standalone(mock_gemini):
    from agents.scoring_agent import run_scoring_agent
    state = {"resume_data": MOCK_RESUME_DATA, "errors": []}  # no jd_data
    result = run_scoring_agent(state)
    assert result["score"]["overall_score"] == 65
    assert result["score"]["breakdown"]["jd_match_score"] is None
    print(f"\n  ✅ ScoringAgent (standalone): score={result['score']['overall_score']}, jd_match=null")


def test_scoring_agent_no_resume_data():
    from agents.scoring_agent import run_scoring_agent
    state = {"errors": []}
    result = run_scoring_agent(state)
    assert any("ScoringAgent" in e for e in result["errors"])
    print("\n  ✅ ScoringAgent: missing resume_data → error logged, no crash")


@patch("agents.gap_agent.call_gemini", return_value=MOCK_GAPS)
def test_gap_agent_with_jd(mock_gemini):
    from agents.gap_agent import run_gap_agent
    state = {"resume_data": MOCK_RESUME_DATA, "jd_data": MOCK_JD_DATA, "errors": []}
    result = run_gap_agent(state)
    assert "Kubernetes" in result["gaps"]["missing_required_skills"]
    assert result["gaps"]["mode"] == "jd_aware"
    print(f"\n  ✅ GapAgent (JD-aware): missing={result['gaps']['missing_required_skills']}")


@patch("agents.gap_agent.call_gemini", return_value={
    "missing_required_skills": [],
    "missing_preferred_skills": [],
    "experience_gap": "Lack of quantified impact in bullet points",
    "education_gap": "None",
    "improvement_suggestions": ["Quantify achievements", "Add a summary section"],
    "mode": "standalone",
})
def test_gap_agent_standalone(mock_gemini):
    from agents.gap_agent import run_gap_agent
    state = {"resume_data": MOCK_RESUME_DATA, "errors": []}
    result = run_gap_agent(state)
    assert result["gaps"]["mode"] == "standalone"
    assert len(result["gaps"]["improvement_suggestions"]) >= 2
    print(f"\n  ✅ GapAgent (standalone): {len(result['gaps']['improvement_suggestions'])} suggestions")


def test_job_matcher_agent_node():
    from agents.job_matcher import run_job_matcher
    state = {"resume_data": MOCK_RESUME_DATA, "errors": []}
    result = run_job_matcher(state)
    assert isinstance(result["job_matches"], list)
    assert len(result["job_matches"]) == 5
    assert result["job_matches"][0]["match_score"] >= result["job_matches"][-1]["match_score"]
    print(f"\n  ✅ JobMatcher: {len(result['job_matches'])} matches, top={result['job_matches'][0]['title']} ({result['job_matches'][0]['match_score']}%)")


@patch("agents.interview_prep_agent.call_gemini", return_value=MOCK_INTERVIEW_QUESTIONS)
def test_interview_prep_agent(mock_gemini):
    from agents.interview_prep_agent import run_interview_prep_agent
    state = {
        "resume_data": MOCK_RESUME_DATA,
        "jd_data": MOCK_JD_DATA,
        "gaps": MOCK_GAPS,
        "errors": [],
    }
    result = run_interview_prep_agent(state)
    iq = result["interview_questions"]
    assert len(iq["behavioral"]) > 0
    assert len(iq["technical"]) > 0
    assert len(iq["tips"]) > 0
    print(f"\n  ✅ InterviewPrepAgent: {len(iq['behavioral'])} behavioral, {len(iq['technical'])} technical, {len(iq['tips'])} tips")


# ─────────────────────────────────────────────────────────────
# 6. Full pipeline mock run (no real LLM)
# ─────────────────────────────────────────────────────────────

@patch("agents.resume_parser.call_gemini")
@patch("agents.jd_parser.call_gemini")
@patch("agents.scoring_agent.call_gemini")
@patch("agents.gap_agent.call_gemini")
@patch("agents.interview_prep_agent.call_gemini")
def test_full_pipeline_standalone_mode(mock_iq, mock_gap, mock_score, mock_jd, mock_resume):
    """Run the entire LangGraph pipeline with Gemini mocked — no JD."""
    from orchestrator.graph import pipeline

    standalone_score = {
        "overall_score": 70, "label": "Good",
        "breakdown": {"skills_score": 72, "experience_score": 68,
                      "education_score": 85, "presentation_score": 60, "jd_match_score": None},
        "summary": "Good resume overall.",
    }
    standalone_gaps = {
        "missing_required_skills": [], "missing_preferred_skills": [],
        "experience_gap": "Needs more quantified impact",
        "education_gap": "None",
        "improvement_suggestions": ["Add metrics to experience bullets", "Include a summary"],
        "mode": "standalone",
    }
    standalone_iq = {
        "behavioral": ["Describe a time you solved a hard engineering problem."],
        "technical": ["Explain how Python's GIL affects concurrency."],
        "gap_based": [],
        "tips": ["Prepare examples of measurable impact."],
    }

    # Pipeline calls: resume_parser → scoring_agent → gap_agent → interview_prep
    # (jd_parser returns early with no LLM call since jd_text is empty)
    # Set each agent's mock return value directly
    mock_resume.return_value = MOCK_RESUME_DATA
    # jd_parser won't call Gemini when jd_text is empty — mock_jd won't be called
    mock_score.return_value = standalone_score
    mock_gap.return_value = standalone_gaps
    mock_iq.return_value = standalone_iq

    state = {"resume_text": "John Doe resume text...", "jd_text": "", "errors": []}
    result = pipeline.invoke(state)

    assert result["resume_data"]["name"] == "John Doe"
    assert result["jd_data"] is None
    assert result["score"]["overall_score"] == 70
    assert result["gaps"]["mode"] == "standalone"
    assert isinstance(result["job_matches"], list)
    assert len(result["job_matches"]) == 5
    assert result["interview_questions"]["behavioral"]
    assert result["errors"] == []

    print("\n  ✅ Full pipeline (standalone): all 5 outputs populated, 0 errors")
    print(f"     score={result['score']['overall_score']}, jd_data=None, "
          f"jobs={len(result['job_matches'])}, gaps_mode={result['gaps']['mode']}")


@patch("agents.resume_parser.call_gemini")
@patch("agents.jd_parser.call_gemini")
@patch("agents.scoring_agent.call_gemini")
@patch("agents.gap_agent.call_gemini")
@patch("agents.interview_prep_agent.call_gemini")
def test_full_pipeline_jd_aware_mode(mock_iq, mock_gap, mock_score, mock_jd, mock_resume):
    """Run the entire LangGraph pipeline with Gemini mocked — with JD."""
    from orchestrator.graph import pipeline

    mock_resume.return_value = MOCK_RESUME_DATA
    mock_jd.return_value = MOCK_JD_DATA
    mock_score.return_value = MOCK_SCORE
    mock_gap.return_value = MOCK_GAPS
    mock_iq.return_value = MOCK_INTERVIEW_QUESTIONS

    state = {
        "resume_text": "John Doe resume text...",
        "jd_text": "Backend Engineer with Python skills required.",
        "errors": [],
    }
    result = pipeline.invoke(state)

    assert result["resume_data"]["name"] == "John Doe"
    assert result["jd_data"]["job_title"] == "Backend Engineer"
    assert result["score"]["overall_score"] == 78
    assert result["score"]["breakdown"]["jd_match_score"] == 72
    assert "Kubernetes" in result["gaps"]["missing_required_skills"]
    assert result["gaps"]["mode"] == "jd_aware"
    assert len(result["job_matches"]) == 5
    assert result["interview_questions"]["gap_based"]
    assert result["errors"] == []

    print("\n  ✅ Full pipeline (JD-aware): all 5 outputs populated, 0 errors")
    print(f"     score={result['score']['overall_score']}, jd_match={result['score']['breakdown']['jd_match_score']}, "
          f"missing={result['gaps']['missing_required_skills']}")


# ─────────────────────────────────────────────────────────────
# 7. API endpoint tests (TestClient + mocked pipeline)
# ─────────────────────────────────────────────────────────────

def _make_docx_bytes() -> bytes:
    import docx as _docx
    doc = _docx.Document()
    doc.add_paragraph("Alice Chen")
    doc.add_paragraph("Skills: Python, Docker, FastAPI")
    doc.add_paragraph("Experience: Software Engineer at TechCorp 2020-Present")
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


MOCK_PIPELINE_RESULT = {
    "resume_data": MOCK_RESUME_DATA,
    "jd_data": None,
    "score": {"overall_score": 72, "label": "Good",
              "breakdown": {"skills_score": 70, "experience_score": 65,
                            "education_score": 90, "presentation_score": 65, "jd_match_score": None},
              "summary": "Good resume."},
    "job_matches": [{"id": "job-001", "title": "Backend Software Engineer",
                     "company": "TechCorp", "location": "SF", "type": "Full-time",
                     "skills": ["Python"], "description": "Build stuff.", "match_score": 80.0}],
    "gaps": {"missing_required_skills": [], "missing_preferred_skills": [],
             "experience_gap": "None", "education_gap": "None",
             "improvement_suggestions": ["Quantify impact"], "mode": "standalone"},
    "interview_questions": {"behavioral": ["Q1"], "technical": ["Q2"], "gap_based": [], "tips": ["T1"]},
    "errors": [],
}


@patch("orchestrator.graph.pipeline.invoke", return_value=MOCK_PIPELINE_RESULT)
def test_api_analyze_standalone(mock_invoke):
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)

    docx_bytes = _make_docx_bytes()
    resp = client.post(
        "/api/analyze",
        files={"resume": ("resume.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"jd_text": ""},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "standalone"
    assert data["resume_data"] is not None
    assert data["jd_data"] is None
    assert data["score"]["overall_score"] == 72
    assert len(data["job_matches"]) == 1
    assert data["gaps"]["mode"] == "standalone"
    assert data["errors"] == []
    print(f"\n  ✅ POST /api/analyze (standalone): 200 OK, mode=standalone, score={data['score']['overall_score']}")


@patch("orchestrator.graph.pipeline.invoke", return_value={**MOCK_PIPELINE_RESULT,
    "jd_data": MOCK_JD_DATA,
    "score": {**MOCK_PIPELINE_RESULT["score"],
              "breakdown": {**MOCK_PIPELINE_RESULT["score"]["breakdown"], "jd_match_score": 72}},
    "gaps": {**MOCK_PIPELINE_RESULT["gaps"], "mode": "jd_aware"},
})
def test_api_analyze_jd_aware(mock_invoke):
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)

    docx_bytes = _make_docx_bytes()
    resp = client.post(
        "/api/analyze",
        files={"resume": ("resume.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"jd_text": "We need a Backend Engineer with Python and Kubernetes."},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["mode"] == "jd_aware"
    assert data["jd_data"] is not None
    assert data["score"]["breakdown"]["jd_match_score"] == 72
    assert data["gaps"]["mode"] == "jd_aware"
    print(f"\n  ✅ POST /api/analyze (JD-aware): 200 OK, mode=jd_aware, jd_match={data['score']['breakdown']['jd_match_score']}")


def test_api_file_too_large():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    huge = b"x" * (11 * 1024 * 1024)  # 11 MB
    resp = client.post(
        "/api/analyze",
        files={"resume": ("big.pdf", huge, "application/pdf")},
    )
    assert resp.status_code == 413
    print("\n  ✅ POST /api/analyze: 11MB file → 413 File Too Large")


def test_api_unsupported_file_type():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    resp = client.post(
        "/api/analyze",
        files={"resume": ("resume.txt", b"some text content", "text/plain")},
    )
    assert resp.status_code == 422
    print("\n  ✅ POST /api/analyze: .txt file → 422 Unsupported type")


def test_api_missing_resume():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    resp = client.post("/api/analyze", data={"jd_text": "some jd"})
    assert resp.status_code == 422  # FastAPI validation error
    print("\n  ✅ POST /api/analyze: missing resume field → 422 Validation Error")

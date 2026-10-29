"""
Smoke tests for the Day 1 pipeline.

Run with:  uv run pytest tests/ -v
"""

from __future__ import annotations

from unittest.mock import patch

from agents.jd_parser import run_jd_parser
from agents.resume_parser import run_resume_parser
from orchestrator.state import GraphState

SAMPLE_RESUME = """
John Doe
john@example.com | +1-555-0100 | San Francisco, CA

SUMMARY
Senior software engineer with 8 years building distributed systems.

SKILLS
Python, Go, Kubernetes, PostgreSQL, Redis

EXPERIENCE
Acme Corp — Senior Engineer (2019 – Present)
  Led migration of monolith to microservices; reduced p99 latency by 40%.

TechStartup — Engineer (2016 – 2019)
  Built real-time data pipeline processing 1M events/day.

EDUCATION
B.S. Computer Science — Stanford University, 2016

CERTIFICATIONS
AWS Certified Solutions Architect
"""

SAMPLE_JD = """
Role: Backend Engineer
Company: Widgets Inc.
Location: Remote
Type: Full-time

We need a backend engineer with 5+ years of Python and cloud experience.

Required Skills: Python, REST APIs, SQL, Docker
Preferred Skills: Kubernetes, Go, Redis

Responsibilities:
- Design and build scalable APIs
- Maintain CI/CD pipelines
- Code reviews

Benefits: Health, 401k, Remote-first
"""

MOCK_RESUME_DATA = {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "location": "San Francisco, CA",
    "summary": "Senior software engineer with 8 years building distributed systems.",
    "skills": ["Python", "Go", "Kubernetes", "PostgreSQL", "Redis"],
    "experience": [],
    "education": [],
    "certifications": ["AWS Certified Solutions Architect"],
    "languages": [],
}

MOCK_JD_DATA = {
    "job_title": "Backend Engineer",
    "company": "Widgets Inc.",
    "location": "Remote",
    "employment_type": "Full-time",
    "required_skills": ["Python", "REST APIs", "SQL", "Docker"],
    "preferred_skills": ["Kubernetes", "Go", "Redis"],
    "required_experience_years": 5,
    "required_education": "",
    "responsibilities": ["Design and build scalable APIs"],
    "benefits": ["Health", "401k", "Remote-first"],
}


@patch("agents.resume_parser.call_llm", return_value=MOCK_RESUME_DATA)
def test_resume_parser_happy_path(mock_call):
    state: GraphState = {"resume_text": SAMPLE_RESUME, "errors": []}
    result = run_resume_parser(state)
    assert result["resume_data"]["name"] == "John Doe"
    assert "Python" in result["resume_data"]["skills"]
    assert result.get("errors", []) == []


def test_resume_parser_empty_text():
    state: GraphState = {"resume_text": "", "errors": []}
    result = run_resume_parser(state)
    assert any("empty" in e for e in result["errors"])


@patch("agents.jd_parser.call_llm", return_value=MOCK_JD_DATA)
def test_jd_parser_happy_path(mock_call):
    state: GraphState = {"jd_text": SAMPLE_JD, "errors": []}
    result = run_jd_parser(state)
    assert result["jd_data"]["job_title"] == "Backend Engineer"
    assert "Python" in result["jd_data"]["required_skills"]


def test_jd_parser_empty_text():
    state: GraphState = {"jd_text": "", "errors": []}
    result = run_jd_parser(state)
    assert result.get("jd_data") is None
    assert result.get("errors", []) == []


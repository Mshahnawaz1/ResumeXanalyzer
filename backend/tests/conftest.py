"""
Shared fixtures and mock agent outputs for the test suite.

Run (with printed output):
uv run pytest tests -s
"""

from __future__ import annotations

from pathlib import Path

import pytest

SAMPLE_PDF = Path(__file__).parent / "agents" / "MShahnawaz.pdf"

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

MOCK_GAPS = {
    "missing_required_skills": ["REST APIs", "SQL", "Docker"],
    "missing_preferred_skills": [],
    "experience_gap": "None",
    "education_gap": "No education listed.",
    "improvement_suggestions": ["Add Docker projects", "Quantify impact"],
    "mode": "jd_aware",
}


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    return SAMPLE_PDF.read_bytes()

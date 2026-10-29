"""
Shared state schema passed through every node in the LangGraph.
Every agent reads from and writes into this TypedDict.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any

from typing_extensions import TypedDict


class GraphState(TypedDict, total=False):
    # --- inputs ---
    resume_text: str          # raw extracted text from the uploaded file
    jd_text: str              # raw job-description text (may be empty string)

    # --- agent outputs: parsers ---
    resume_data: dict[str, Any]        # structured output from ResumeParser
    jd_data: dict[str, Any] | None     # structured output from JDParser (None if no JD)

    # --- agent outputs: downstream ---
    score: dict[str, Any] | None               # ScoringAgent output
    job_matches: list[dict] | None             # JobMatcher output
    gaps: dict[str, Any] | None                # GapAgent output
    interview_questions: dict[str, Any] | None # InterviewPrepAgent output

    # --- meta ---
    # Annotated with operator.add so parallel nodes can append without conflict
    errors: Annotated[list[str], operator.add]

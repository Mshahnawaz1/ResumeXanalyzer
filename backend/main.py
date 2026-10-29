"""
FastAPI application entry point.

Routes:
  POST /api/analyze  — upload resume file + optional jd text, run pipeline, return results
  GET  /health       — liveness check

Run:
    uv run uvicorn main:app --reload
"""

from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from orchestrator.graph import pipeline
from services.file_extraction import extract_text

settings.validate()

app = FastAPI(
    title="ResumeX Analyzer API",
    description="Multi-agent resume analysis powered by LLMs + LangGraph",
    version="0.2.0",
)

allowed_origins_list = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://resume-x-analyzer.vercel.app",
]
if settings.allowed_origins:
    allowed_origins_list.extend(
        o.strip() for o in settings.allowed_origins.split(",") if o.strip()
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "model": settings.active_model, "provider": settings.provider}


@app.post("/api/analyze", tags=["pipeline"])
async def analyze(
    resume: Annotated[UploadFile, File(description="Resume file (PDF or DOCX)")],
    jd_text: Annotated[str, Form(description="Job description as plain text (optional)")] = "",
):
    """
    Run the full agent pipeline on a resume, with an optional job description.

    - **With JD**: full gap analysis, JD-aware scoring, JD-aligned interview questions.
    - **Without JD**: standalone resume quality score + improvement suggestions + job matches.

    Returns partial results even if some agents error — check the `errors` list.
    """
    # --- file size guard ---
    max_bytes = settings.max_file_size_mb * 1024 * 1024
    content = await resume.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max allowed: {settings.max_file_size_mb} MB.",
        )

    # --- text extraction (CPU-bound, keep it off the event loop) ---
    try:
        resume_text = await run_in_threadpool(extract_text, content, resume.filename or "upload")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # --- pipeline ---
    jd_text = jd_text.strip()
    initial_state = {
        "resume_text": resume_text,
        "jd_text": jd_text,
        "errors": [],
    }

    try:
        # pipeline.invoke makes blocking LLM calls; run it in a worker thread
        result = await run_in_threadpool(pipeline.invoke, initial_state)
    except Exception as exc:
        err_str = str(exc)
        model, provider = settings.active_model, settings.provider
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate limit" in err_str.lower():
            raise HTTPException(
                status_code=503,
                detail=(
                    f"API quota exceeded or rate limited for model '{model}' ({provider}). "
                    f"Please try again later. Details: {exc}"
                ),
            ) from exc
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline error using model '{model}' ({provider}): {exc}",
        ) from exc

    return {
        "mode": "jd_aware" if jd_text else "standalone",
        "resume_data": result.get("resume_data"),
        "jd_data": result.get("jd_data"),
        "score": result.get("score"),
        "job_matches": result.get("job_matches"),
        "gaps": result.get("gaps"),
        "interview_questions": result.get("interview_questions"),
        "errors": result.get("errors", []),
    }

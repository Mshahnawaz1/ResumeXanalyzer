"""
FastAPI application entry point.

Routes:
  POST /api/analyze  — upload resume file + optional jd text, run pipeline, return results
  GET  /health       — liveness check

Run: 
    uv run uvicorn main:app --reload
"""

from __future__ import annotations

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from orchestrator.graph import pipeline
from services.file_extraction import extract_text

settings.validate()

app = FastAPI(
    title="ResumeX Analyzer API",
    description="Multi-agent resume analysis powered by Gemini + LangGraph",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://resume-x-analyzer.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
def health():
    provider = settings.llm_provider.lower()
    model = settings.openrouter_model if provider == "openrouter" else settings.gemini_model
    return {"status": "ok", "model": model, "provider": provider}


@app.post("/api/analyze", tags=["pipeline"])
async def analyze(
    resume: UploadFile = File(..., description="Resume file (PDF or DOCX)"),
    jd_text: str = Form(default="", description="Job description as plain text (optional)"),
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

    # --- text extraction ---
    try:
        resume_text = extract_text(content, resume.filename or "upload")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # --- pipeline ---
    initial_state = {
        "resume_text": resume_text,
        "jd_text": jd_text.strip(),
        "errors": [],
    }

    try:
        result = pipeline.invoke(initial_state)
    except Exception as exc:
        err_str = str(exc)
        provider = settings.llm_provider.lower()
        model = settings.openrouter_model if provider == "openrouter" else settings.gemini_model
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate limit" in err_str.lower():
            raise HTTPException(
                status_code=503,
                detail=f"API quota exceeded or rate limited for model '{model}' ({provider}). Please try again later. Details: {exc}",
            )
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline error using model '{model}' ({provider}): {exc}"
        )

    has_jd = bool(jd_text.strip())

    return {
        "mode": "jd_aware" if has_jd else "standalone",
        "resume_data": result.get("resume_data"),
        "jd_data": result.get("jd_data"),
        "score": result.get("score"),
        "job_matches": result.get("job_matches"),
        "gaps": result.get("gaps"),
        "interview_questions": result.get("interview_questions"),
        "errors": result.get("errors", []),
    }

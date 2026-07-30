# ResumeX Analyzer — Progress Tracker

> Last updated: 2026-07-30  
> Phase: Day 1 complete — full backend pipeline functional

---

## 🟢 Current Status: Backend Complete

The server is running at `http://localhost:8000`.  
Interactive API docs: `http://localhost:8000/docs`

```
uv run uvicorn main:app --reload
```

---

## ✅ Features Implemented

### Infrastructure

| Component | Status | Notes |
|---|---|---|
| FastAPI app (`main.py`) | ✅ Done | CORS enabled, `uvicorn` hot-reload |
| Config / env loading (`config.py`) | ✅ Done | `GEMINI_API_KEY`, `GEMINI_MODEL`, `MAX_FILE_SIZE_MB` |
| File extraction service | ✅ Done | PDF (pdfplumber) + DOCX (python-docx) → raw text |
| Gemini client wrapper | ✅ Done | JSON-mode, 1 auto-retry on parse failure, raises on 2nd failure |
| LangGraph orchestrator | ✅ Done | 7-node compiled graph, parallel execution |
| Dummy job board service | ✅ Done | 10 static roles, same shape as real API — drop-in replaceable |

---

### API Endpoints

| Endpoint | Method | Status | Description |
|---|---|---|---|
| `/health` | GET | ✅ Working | Liveness check, returns model name |
| `/api/analyze` | POST | ✅ Working | Main pipeline — resume file + optional JD text |
| `/docs` | GET | ✅ Working | Auto-generated Swagger UI |

#### `/api/analyze` — Request
- `resume` — multipart file upload (PDF or DOCX, max 10 MB)
- `jd_text` — plain text job description (**optional** — omit for standalone review)

#### `/api/analyze` — Response shape
```json
{
  "mode":                 "jd_aware | standalone",
  "resume_data":          { ... },
  "jd_data":              { ... } | null,
  "score":                { "overall_score": 0-100, "label": "...", "breakdown": { ... }, "summary": "..." },
  "job_matches":          [ { "title": "...", "company": "...", "match_score": 0-100, ... } ],
  "gaps":                 { "missing_required_skills": [...], "improvement_suggestions": [...], ... },
  "interview_questions":  { "behavioral": [...], "technical": [...], "gap_based": [...], "tips": [...] },
  "errors":               []
}
```

---

### Agent Pipeline

```
[START]
  ├── resume_parser ──────────────────────────────────────┐
  └── jd_parser (handles empty JD → sets jd_data=null) ───┤
                                                           ├── scoring_agent ──┐
                                                           ├── job_matcher ────┤ (parallel)
                                                           └── gap_agent ──────┤
                                                                                └── interview_prep → [END]
```

| Agent | File | Status | Mode Support |
|---|---|---|---|
| Resume Parser | `agents/resume_parser.py` | ✅ Done | Always runs |
| JD Parser | `agents/jd_parser.py` | ✅ Done | Empty JD → `jd_data=null`, no error |
| Scoring Agent | `agents/scoring_agent.py` | ✅ Done | JD-aware + standalone |
| Job Matcher | `agents/job_matcher.py` | ✅ Done | Always runs (no LLM, local scoring) |
| Gap Agent | `agents/gap_agent.py` | ✅ Done | JD-aware + standalone |
| Interview Prep | `agents/interview_prep_agent.py` | ✅ Done | JD-aware + standalone |

---

### Two Operating Modes

#### Mode 1 — `jd_aware` (JD provided)
- Scoring is weighted against JD requirements (skills match, experience fit, education fit, JD alignment)
- Gap analysis: lists exact missing required/preferred skills from JD
- Interview questions include gap-probing questions targeting identified weaknesses
- Job matcher still runs (useful for related-role discovery)

#### Mode 2 — `standalone` (no JD)
- Scoring based on resume quality alone (skills breadth, experience clarity, education, presentation)
- Gap analysis provides general improvement suggestions (no skill-gap list since no JD target)
- Interview questions generated from resume background only
- Job matcher runs — returns top-5 dummy roles ranked by skill overlap

---

### Scoring Breakdown

| Category | Weight (JD-aware) | Weight (Standalone) |
|---|---|---|
| Skills score | 30% | 30% |
| Experience score | 25% | 35% |
| Education score | 15% | 15% |
| Presentation score | 15% | 20% |
| JD match score | 15% | — (null) |

Labels: **Excellent** (80–100) · **Good** (60–79) · **Fair** (40–59) · **Needs Work** (0–39)

---

### Error Handling

| Scenario | Behaviour |
|---|---|
| File > 10 MB | `413` — file too large |
| Unsupported file type (not PDF/DOCX) | `422` — unsupported type |
| PDF/DOCX with no extractable text | `422` — extraction failed |
| Gemini quota exceeded (429) | `503` — clear message, retry suggested |
| Agent internal error | Non-fatal — added to `errors[]`, pipeline continues |
| Gemini JSON parse fails twice | Agent logs error in `errors[]`, returns null for that field |

---

## 🔧 Known Limitations / Issues

| Issue | Severity | Notes |
|---|---|---|
| API key on free tier | 🔴 Blocker (for testing) | Free tier quota hits quickly with parallel agents; upgrade to paid key |
| No SSE / streaming | 🟡 Missing feature | Agents run silently; frontend can't show live progress yet |
| Job matcher is dummy data | 🟡 Expected | Interface is identical to real API shape — swap `services/dummy_jobs.py` |
| No resume rewrite / export | ⚪ Non-goal | Intentional per locked decisions |

---

## 📁 File Map (current state)

```
backend/
├── main.py                          ✅ FastAPI app, /api/analyze (JD optional), /health
├── config.py                        ✅ Settings from .env
├── progress.md                      ✅ This file
├── AGENT.md                         ✅ Agent session tracker
├── pyproject.toml                   ✅ Dependencies
├── .env                             ✅ GEMINI_API_KEY (not committed)
│
├── agents/
│   ├── __init__.py
│   ├── resume_parser.py             ✅ Parses resume → structured dict
│   ├── jd_parser.py                 ✅ Parses JD → structured dict (handles empty)
│   ├── scoring_agent.py             ✅ Scores resume 0-100 (JD-aware + standalone)
│   ├── job_matcher.py               ✅ Matches skills → top-5 dummy jobs
│   ├── gap_agent.py                 ✅ Gap analysis + improvement suggestions
│   └── interview_prep_agent.py      ✅ Interview questions + tips
│
├── orchestrator/
│   ├── __init__.py
│   ├── state.py                     ✅ GraphState TypedDict (all slots)
│   └── graph.py                     ✅ Full 7-node LangGraph pipeline
│
├── services/
│   ├── __init__.py
│   ├── gemini_client.py             ✅ Gemini SDK wrapper (JSON-mode + retry)
│   ├── file_extraction.py           ✅ PDF + DOCX → raw text
│   └── dummy_jobs.py                ✅ 10 static job postings + skill-match scorer
│
└── tests/
    └── test_pipeline.py             ✅ Unit tests (4/4 passing on Day 1)
```

---

## 🔜 Next Up (Day 2)

- [ ] **SSE streaming** — emit agent-start/agent-done events so frontend can show live progress log
- [ ] **Reviewer agent** (stretch) — synthesises score + gaps + job matches into a final verdict
- [ ] **Frontend scaffold** — form (resume upload + optional JD textarea) + results display
- [ ] **Live agent activity feed** — UI component that consumes the SSE stream
- [ ] **Real resume testing** — run against actual PDF/DOCX resumes, tune prompts
- [ ] **Paid API key** — swap free-tier key to remove quota blocker

---

## 🧪 Quick Test Commands

```bash
# Health check
curl http://localhost:8000/health

# Standalone review (no JD)
curl -X POST http://localhost:8000/api/analyze \
  -F "resume=@/path/to/resume.pdf"

# Full JD-aware analysis
curl -X POST http://localhost:8000/api/analyze \
  -F "resume=@/path/to/resume.pdf" \
  -F "jd_text=We are looking for a Senior Python Backend Engineer..."

# Pretty-print response
curl -X POST http://localhost:8000/api/analyze \
  -F "resume=@/path/to/resume.docx" | python3 -m json.tool
```

---

## 📝 Change Log

| Date | Session | Summary |
|---|---|---|
| 2026-07-30 | Day 1 AM | Repo scaffold: FastAPI, LangGraph, Gemini client, file extraction, Resume Parser, JD Parser, /health endpoint, 4 unit tests passing |
| 2026-07-30 | Day 1 PM | Full pipeline: Scoring Agent, Job Matcher (dummy data), Gap Agent, Interview Prep Agent, LangGraph full wiring, optional JD support, rate-limit 503 handling |

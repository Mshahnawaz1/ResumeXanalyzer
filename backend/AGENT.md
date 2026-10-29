# .agent.md — Project Tracker

This file exists to give any coding agent (Antigravity, Claude Code, etc.) working on this repo fast context without re-reading the full history. Update it at the end of every work session — treat stale entries here as worse than no entries.

**Read order for a new agent session:** this file first, then `AGENTS.md` (full agent
specs/schemas/prompts) and `design.md` (frontend design system) as needed for the task
at hand. Don't re-derive decisions already recorded below.

---

## Project snapshot

**What:** Multi-agent resume analyzer — upload resume + JD, agents parse/score/gap-check/
match-jobs/generate-interview-questions, orchestrated via LangGraph, live agent activity
shown to the user.

**Context:** 3-day solo hackathon build. Judging is technical/innovation-focused, so
agent architecture and visible orchestration matter more than UI polish.

**Current phase:** `Day 1 — backend foundation`

---

## Locked decisions (do not re-litigate without asking)

- LLM provider: **Gemini API** (`gemini-2.0-flash`), not Claude — changed from initial
  plan, confirmed final.
- Orchestration: **LangGraph**, chosen specifically because it can visibly represent
  the dependency graph for the demo.
- Job matching: **dummy/local data for now** (`services/dummy_jobs.py`), same output
  shape as a real API so it's a drop-in swap later. Do not wire up a real job-board API
  unless explicitly asked.
- Score display: **single overall score**, not a radar/category breakdown.
- Gap Agent: **flags issues + suggests direction only** — does not rewrite resume
  bullets.
- Job Matcher: **ranked list only** — no "why it matched" explanation in the UI.
- No user accounts, no login, no saved history — single session, in-memory only.
- UI: kept deliberately minimal/clean (see `design.md`) — the one place design effort
  goes is the live agent run-log, not general visual polish.

## Explicit non-goals (whole project)

- Resume rewriting / export
- Multi-JD comparison in one run
- Cover letter generation
- Auth, persistence, saved history
- Real job-board API integration (until/unless the dummy-data phase is explicitly closed out)

---

## Agent roster (see AGENTS.md for full schemas/prompts)

| Agent | Status | Depends on |
|---|---|---|
| Resume Parser | done | — |
| JD Parser | done (handles empty JD gracefully) | — |
| Scoring Agent | done (JD-aware + standalone modes) | Resume Parser |
| Job Matcher (dummy data) | done | Resume Parser |
| Gap Agent | done (JD-aware + standalone modes) | Resume Parser + JD Parser |
| Interview Prep Agent | done | JD Parser + Gap Agent |
| Reviewer (stretch) | not started | Scoring + Gap + Job Matcher |

Update the Status column as work lands: `not started` → `in progress` → `done` →
`done, needs revisit` (use the last one plus a note if something is working but rough).

---

## Day-by-day plan status

- [x] **Day 1 AM:** repo scaffold, Gemini + job API keys wired, Resume Parser + JD Parser agents
- [x] **Day 1 PM:** LangGraph full wiring (parallel parsers → parallel mid-tier → interview prep), Scoring Agent, Job Matcher (dummy data), Gap Agent, Interview Prep Agent, `/api/analyze` endpoint with optional JD
- [ ] **Day 2 AM:** Gap Agent, Interview Prep Agent, full graph dependency wiring, SSE streaming
- [ ] **Day 2 PM:** Reviewer agent (if on schedule), start frontend (form + basic results, no live feed yet)
- [ ] **Day 3 AM:** live agent activity feed UI, light visual pass, error handling (malformed resume, empty JD, zero job matches)
- [ ] **Day 3 PM:** test with real resumes, write + rehearse demo script, buffer for bugs

---

## File map

```
backend/
├── main.py                  # FastAPI app, /api/analyze endpoint
├── config.py                 # env var loading
├── agents/                   # one file per agent, see AGENTS.md for schemas
├── orchestrator/
│   ├── graph.py               # LangGraph definition — edges encode dependencies above
│   └── state.py                # GraphState (shared schema across all agents)
├── services/
│   ├── gemini_client.py        # single wrapper all agents call through
│   ├── dummy_jobs.py            # static job postings, placeholder for real API
│   └── file_extraction.py      # PDF/DOCX -> raw text
└── tests/test_pipeline.py

frontend/                     # not started yet — see design.md for the plan
```

Reference docs in repo root:
- `AGENTS.md` — full agent specs, JSON schemas, prompt templates, API contract, error handling conventions
- `design.md` — frontend design system, token system, component specs
- `antigravity_backend_prompt.md` — the exact scaffold prompt used to generate the Day 1 backend

---

## Conventions to follow

- All LLM calls go through `services/gemini_client.py` — don't call the Gemini SDK
  directly from an agent file.
- Every agent function takes and returns `GraphState` (or a piece of it) — don't invent
  a different calling convention between agents.
- JSON-mode / structured output from the LLM, with one retry-with-correction on parse
  failure, then a raised exception — never fail silently, never fabricate a response.
- Secrets only via `.env` (see `.env.example`) — never hardcoded, never committed.
- Keep `job_matcher.py`'s dummy-data interface identical to what a real API response
  would look like, so swapping in a real job board later touches one file.

---

## Open questions / things to confirm before building further

- Reviewer agent: still officially a stretch goal — confirm on Day 2 afternoon whether
  on-schedule enough to include it.
- Real job API swap-in: not currently planned, but interface is kept ready in case
  there's spare time on Day 3.

---

## Change log

Keep this short — one line per session, most recent first.

- Day 1 AM — full backend scaffold: FastAPI app, LangGraph graph (parallel parsers), Gemini client (google-genai SDK), file extraction service (PDF/DOCX), Resume Parser + JD Parser agents, unit tests (4/4 passing), /health endpoint verified.
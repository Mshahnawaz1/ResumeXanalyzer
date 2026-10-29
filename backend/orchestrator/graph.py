"""
LangGraph pipeline definition — full pipeline.

Graph topology:

  [START]
     |
  ┌──┴──┐
  │     │
resume  jd          ← parallel (both read raw text only)
parser  parser
  │     │
  └──┬──┘
     │
  ┌──┼──┐
  │  │  │
score  job  gap     ← parallel (all read resume_data; gap + score also read jd_data)
agent  match agent
  │  │  │
  └──┴──┘
     │
  interview_prep    ← reads resume_data + jd_data + gaps
     │
  [END]

Notes:
- jd_parser gracefully handles empty jd_text (sets jd_data=None, logs no error).
- Every downstream agent handles missing jd_data — falls back to standalone mode.
- job_matcher uses no LLM; it's a local scoring function over dummy data.
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from agents.gap_agent import run_gap_agent
from agents.interview_prep_agent import run_interview_prep_agent
from agents.jd_parser import run_jd_parser
from agents.job_matcher import run_job_matcher
from agents.resume_parser import run_resume_parser
from agents.scoring_agent import run_scoring_agent
from orchestrator.state import GraphState


def build_graph():
    """Build and compile the LangGraph pipeline. Returns a compiled graph."""
    g = StateGraph(GraphState)

    # --- parser nodes (parallel, both start from START) ---
    g.add_node("resume_parser", run_resume_parser)
    g.add_node("jd_parser", run_jd_parser)

    g.add_edge(START, "resume_parser")
    g.add_edge(START, "jd_parser")

    # --- mid-tier nodes (parallel, all wait for both parsers) ---
    g.add_node("scoring_agent", run_scoring_agent)
    g.add_node("job_matcher", run_job_matcher)
    g.add_node("gap_agent", run_gap_agent)

    g.add_edge("resume_parser", "scoring_agent")
    g.add_edge("jd_parser", "scoring_agent")

    g.add_edge("resume_parser", "job_matcher")
    g.add_edge("jd_parser", "job_matcher")

    g.add_edge("resume_parser", "gap_agent")
    g.add_edge("jd_parser", "gap_agent")

    # --- final node (waits for gap_agent + scoring_agent + job_matcher) ---
    g.add_node("interview_prep", run_interview_prep_agent)

    g.add_edge("scoring_agent", "interview_prep")
    g.add_edge("job_matcher", "interview_prep")
    g.add_edge("gap_agent", "interview_prep")

    g.add_edge("interview_prep", END)

    return g.compile()


# Singleton — imported by main.py
pipeline = build_graph()

Project overview

Name: Resumod

What it does: Takes a resume (PDF/DOCX) and a job description (text), then runs a team of specialized LLM agents — coordinated through a LangGraph dependency graph — to produce: a resume score, flagged gaps vs. the JD, matched real job postings, and JD-specific interview questions. Agent progress streams live to the frontend via SSE.

Frontend part: Takes two user input, a file (pdf for now) for resume, and a job description using textarea. 

Layout design: Keep the current UI theme, but make the content it 
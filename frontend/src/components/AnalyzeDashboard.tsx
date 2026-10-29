import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { NavBar } from './NavBar';

/* ── Icon helpers ────────────────────────────────────────────────────── */

const UploadIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const FileIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const SparkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} width="16" height="16">
    <path d="M12 2c-.3 3.8-3.2 6.7-7 7 3.8.3 6.7 3.2 7 7 .3-3.8 3.2-6.7 7-7-3.8-.3-6.7-3.2-7-7z"/>
  </svg>
);

const TrashIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

/* ── Types ───────────────────────────────────────────────────────────── */

type AgentStatus = 'idle' | 'running' | 'done' | 'error';

interface AgentState {
  status: AgentStatus;
  label: string;
  icon: string;
}

interface ResumeData {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string[];
  experience: {
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    description: string;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    graduation_year: string;
  }[];
  certifications: string[];
  languages: string[];
}

interface JdData {
  job_title: string;
  company: string;
  location: string;
  employment_type: string;
  required_skills: string[];
  preferred_skills: string[];
  required_experience_years: number | null;
  required_education: string;
  responsibilities: string[];
  benefits: string[];
}

interface ScoreBreakdown {
  skills_score: number;
  experience_score: number;
  education_score: number;
  presentation_score: number;
  jd_match_score: number | null;
}

interface ScoreData {
  overall_score: number;
  label: string;
  breakdown: ScoreBreakdown;
  summary: string;
}

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  skills: string[];
  description: string;
  match_score: number;
}

interface GapsData {
  missing_required_skills: string[];
  missing_preferred_skills: string[];
  experience_gap: string;
  education_gap: string;
  improvement_suggestions: string[];
}

interface InterviewQuestions {
  behavioral: string[];
  technical: string[];
  gap_based: string[];
  tips: string[];
}

interface AnalysisResult {
  mode: 'standalone' | 'jd_aware';
  resume_data: ResumeData | null;
  jd_data: JdData | null;
  // Each agent's output is null when that agent failed — see `errors`
  score: ScoreData | null;
  job_matches: JobMatch[] | null;
  gaps: GapsData | null;
  interview_questions: InterviewQuestions | null;
  errors: string[];
}

const INITIAL_AGENTS: Record<string, AgentState> = {
  scorer:    { status: 'idle', label: 'Resume Scorer',    icon: '📊' },
  detector:  { status: 'idle', label: 'Gap Detector',     icon: '🔍' },
  matcher:   { status: 'idle', label: 'Job Matcher',      icon: '💼' },
  coach:     { status: 'idle', label: 'Interview Coach',  icon: '🎙️' },
};

// JD Alignment is only shown in jd_aware mode (see render below)
const SCORE_BARS: { key: keyof ScoreBreakdown; label: string }[] = [
  { key: 'skills_score',       label: 'Skills Fit' },
  { key: 'experience_score',   label: 'Experience' },
  { key: 'education_score',    label: 'Education' },
  { key: 'presentation_score', label: 'Presentation' },
  { key: 'jd_match_score',     label: 'JD Alignment' },
];

// Matches the extensions the backend's file extraction accepts
const ACCEPTED_EXTENSIONS = ['.pdf', '.docx'];

const isAcceptedFile = (file: File) =>
  ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext));

// LLM output doesn't always honour the schema, so treat missing lists as empty
const list = <T,>(items?: T[] | null): T[] => items ?? [];

// Gap agent uses the string "None" to mean no gap
const hasGap = (text?: string | null) => !!text && text !== 'None';

/* ── Result building blocks ──────────────────────────────────────────── */

const ChipList: React.FC<{ items: string[]; className?: string; prefix?: string }> = ({
  items,
  className = '',
  prefix = '',
}) => (
  <div className="chip-row">
    {items.map((item, idx) => (
      <span key={idx} className={`chip ${className}`}>
        {prefix}{item}
      </span>
    ))}
  </div>
);

const AgentUnavailable: React.FC<{ agent: string }> = ({ agent }) => (
  <p className="empty-result">The {agent} agent didn't return results for this run.</p>
);

const QuestionGroup: React.FC<{ title: string; items?: string[] | null; variant?: 'gap' }> = ({
  title,
  items,
  variant,
}) => {
  if (!items?.length) return null;
  return (
    <div className={`question-group ${variant ?? ''}`}>
      <div className="question-group-title">{title}</div>
      <ol className="question-list">
        {items.map((q, i) => (
          <li key={i} className="question-item">{q}</li>
        ))}
      </ol>
    </div>
  );
};

/* ── Component ───────────────────────────────────────────────────────── */

export const AnalyzeDashboard: React.FC = () => {
  const { token } = useAuth();

  // Input state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Analysis state
  const [isRunning, setIsRunning] = useState(false);
  const [agents, setAgents] = useState<Record<string, AgentState>>(INITIAL_AGENTS);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'score' | 'gaps' | 'jobs' | 'questions'>('score');

  /* ── File handling ─────────────────────────────────── */

  const handleFileSelect = (file: File) => {
    if (!isAcceptedFile(file)) {
      setError('Only PDF and DOCX files are supported.');
      return;
    }
    setError(null);
    setResumeFile(file);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  /* ── Analysis run ──────────────────────────── */

  const updateAgent = (key: string, patch: Partial<AgentState>) => {
    setAgents(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleRunAnalysis = async () => {
    if (!resumeFile) return;
    setIsRunning(true);
    setError(null);
    setResult(null);
    setActiveResultTab('score');
    setAgents(INITIAL_AGENTS);

    // Simulated agent progress to show live activity
    let simulatedStep = 0;
    const progressKeys = ['scorer', 'detector', 'matcher', 'coach'];
    updateAgent('scorer', { status: 'running' });

    const intervalId = setInterval(() => {
      if (simulatedStep < progressKeys.length) {
        const currentKey = progressKeys[simulatedStep];
        updateAgent(currentKey, { status: 'done' });

        simulatedStep++;
        if (simulatedStep < progressKeys.length) {
          const nextKey = progressKeys[simulatedStep];
          updateAgent(nextKey, { status: 'running' });
        }
      }
    }, 3000);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('jd_text', jobDescription.trim());

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: 'POST',
        headers,
        body: formData,
      });

      clearInterval(intervalId);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to analyze resume.');
      }

      const data: AnalysisResult = await res.json();

      // Mark each agent by whether it actually produced output
      const outputs: Record<string, unknown> = {
        scorer: data.score,
        detector: data.gaps,
        matcher: data.job_matches,
        coach: data.interview_questions,
      };
      progressKeys.forEach(k => {
        updateAgent(k, { status: outputs[k] ? 'done' : 'error' });
      });

      setResult(data);
      setIsRunning(false);
    } catch (err: any) {
      clearInterval(intervalId);
      progressKeys.forEach(k => {
        updateAgent(k, { status: 'error' });
      });
      setError(err.message || 'An unexpected error occurred.');
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setResumeFile(null);
    setJobDescription('');
    setResult(null);
    setError(null);
    setIsRunning(false);
    setAgents(INITIAL_AGENTS);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canRun = !!resumeFile && !isRunning;

  const completedCount = Object.values(agents).filter(a => a.status === 'done').length;

  const score = result?.score ?? null;
  const gaps = result?.gaps ?? null;
  const questions = result?.interview_questions ?? null;
  const jobMatches = list(result?.job_matches);
  const resumeData = result?.resume_data ?? null;
  const jdData = result?.mode === 'jd_aware' ? result.jd_data : null;
  const warnings = list(result?.errors);
  const flaggedCount =
    list(gaps?.missing_required_skills).length + list(gaps?.missing_preferred_skills).length;
  const questionCount = list(questions?.behavioral).length + list(questions?.technical).length;
  const candidateSkills = new Set(list(resumeData?.skills).map(s => s.toLowerCase()));

  /* ── Render ────────────────────────────────────────── */

  return (
    <div className="chat-dashboard-page">
      <NavBar />

      <div className="dashboard-container">
        {/* ── Left Sidebar: Inputs + Agent progress ── */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <span className="sidebar-sec-title">Resume (PDF or DOCX)</span>

            {/* Drop zone */}
            <div
              id="resume-drop-zone"
              className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${resumeFile ? 'has-file' : ''}`}
              onClick={() => !resumeFile && fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                className="upload-hidden-input"
                onChange={onFileInputChange}
                id="resume-file-input"
              />
              {resumeFile ? (
                <div className="upload-file-info">
                  <div className="upload-file-icon">
                    <FileIcon />
                  </div>
                  <div className="upload-file-details">
                    <span className="upload-filename">{resumeFile.name}</span>
                    <span className="upload-filesize">{(resumeFile.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button
                    className="upload-remove-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setResumeFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    title="Remove file"
                    id="remove-resume-btn"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ) : (
                <div className="upload-prompt">
                  <div className="upload-prompt-icon">
                    <UploadIcon />
                  </div>
                  <span className="upload-prompt-text">Drop your resume here</span>
                  <span className="upload-prompt-sub">or click to browse</span>
                </div>
              )}
            </div>
          </div>

          <div className="sidebar-section divider-top">
            <span className="sidebar-sec-title">Job Description (Optional)</span>
            <textarea
              id="job-description-input"
              className="jd-textarea"
              placeholder="Paste the target job description here to analyze specific fit, detect skill gaps, and get aligned practice questions."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              disabled={isRunning}
            />
            <span className="jd-char-count">{jobDescription.length} chars</span>
          </div>

          {/* Run button */}
          <div className="sidebar-section">
            <button
              id="run-analysis-btn"
              className={`btn-run-analysis ${isRunning ? 'running' : ''}`}
              onClick={handleRunAnalysis}
              disabled={!canRun}
            >
              {isRunning ? (
                <>
                  <span className="run-spinner"></span>
                  Analyzing…
                </>
              ) : (
                <>
                  <SparkIcon className="run-spark-icon" />
                  Run Analysis
                </>
              )}
            </button>

            {(result || error) && !isRunning && (
              <button
                id="reset-analysis-btn"
                className="btn-reset"
                onClick={handleReset}
              >
                Start Over
              </button>
            )}
          </div>

          {/* Agent progress */}
          <div className="sidebar-section divider-top">
            <span className="sidebar-sec-title">
              Agent Progress
              {isRunning && <span className="agent-count-badge">{completedCount}/4</span>}
            </span>
            <div className="agent-progress-list">
              {Object.entries(agents).map(([key, agent]) => (
                <div key={key} className={`agent-progress-item status-${agent.status}`}>
                  <span className="agent-emoji">{agent.icon}</span>
                  <span className="agent-label">{agent.label}</span>
                  <span className="agent-status-dot"></span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Main workspace: Results ── */}
        <main className="chat-workspace">
          <header className="chat-header">
            <div className="header-title">
              <h1>Analysis Results</h1>
              {isRunning && (
                <div className="status-indicator">
                  <span className="dot online"></span>
                  <span>Agents running…</span>
                </div>
              )}
              {result && !isRunning && (
                <div className="status-indicator">
                  <span className="dot online"></span>
                  <span>Analysis complete</span>
                </div>
              )}
            </div>
          </header>

          <div className="message-container">
            {/* Empty state */}
            {!result && !isRunning && !error && (
              <div className="chat-placeholder">
                <div className="placeholder-icon">
                  <SparkIcon className="spark-icon-placeholder" />
                </div>
                <h3>Ready to analyze</h3>
                <p>Upload your resume and paste an optional job description on the left, then hit <strong>Run Analysis</strong>. Specialized AI agents will evaluate your fit and display the results instantly.</p>

                <div className="suggested-prompts-grid">
                  <div className="suggested-card">
                    <div className="card-icon">📊</div>
                    <div className="card-info">
                      <h4>Resume Score</h4>
                      <p>0–100 fit score with detailed breakdowns</p>
                    </div>
                  </div>
                  <div className="suggested-card">
                    <div className="card-icon">🔍</div>
                    <div className="card-info">
                      <h4>Skill Gaps</h4>
                      <p>Missing requirements and improvements flagged</p>
                    </div>
                  </div>
                  <div className="suggested-card">
                    <div className="card-icon">💼</div>
                    <div className="card-info">
                      <h4>Job Matches</h4>
                      <p>Real postings ranked by compatibility</p>
                    </div>
                  </div>
                  <div className="suggested-card">
                    <div className="card-icon">🎙️</div>
                    <div className="card-info">
                      <h4>Interview Prep</h4>
                      <p>Tailored behavioral and technical questions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Running state — progress */}
            {isRunning && !result && (
              <div className="analysis-running-view">
                <div className="running-header">
                  <SparkIcon className="running-spark" />
                  <h3>Agents are working…</h3>
                  <p>Coordinating LangGraph agent workflows sequentially.</p>
                </div>
                <div className="running-agents-grid">
                  {Object.entries(agents).map(([key, agent]) => (
                    <div key={key} className={`running-agent-card status-${agent.status}`}>
                      <div className="running-agent-icon">{agent.icon}</div>
                      <div className="running-agent-name">{agent.label}</div>
                      <div className="running-agent-status">
                        {agent.status === 'idle'    && <span className="status-pill idle">Waiting</span>}
                        {agent.status === 'running' && <span className="status-pill running"><span className="pill-dot-anim"></span>Running</span>}
                        {agent.status === 'done'    && <span className="status-pill done">✓ Done</span>}
                        {agent.status === 'error'   && <span className="status-pill error-pill">Error</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="chat-error-banner dashboard-error animate-fade-in">
                <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Results */}
            {result && !isRunning && (
              <div className="results-view animate-fade-in">
                {warnings.length > 0 && (
                  <div className="result-warnings" role="status">
                    <strong>Some agents reported problems — results may be incomplete.</strong>
                    <ul>
                      {warnings.map((msg, i) => (
                        <li key={i}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Score hero */}
                <div className="score-hero">
                  <div className="score-ring">
                    <svg viewBox="0 0 100 100" className="score-ring-svg">
                      <circle cx="50" cy="50" r="42" className="ring-track" />
                      {score && (
                        <circle
                          cx="50" cy="50" r="42"
                          className="ring-fill"
                          strokeDasharray={`${(score.overall_score / 100) * 263.9} 263.9`}
                          transform="rotate(-90 50 50)"
                        />
                      )}
                    </svg>
                    <div className="score-value">
                      <span className="score-number">{score ? score.overall_score : '–'}</span>
                      <span className="score-100">/100</span>
                    </div>
                  </div>
                  <div className="score-meta">
                    <h2 className="score-label">{score ? `${score.label} Match Rating` : 'Score unavailable'}</h2>
                    <p className="score-desc">
                      {result.mode === 'jd_aware' ? 'Job description analyzed · ' : 'Standalone resume evaluation · '}
                      {flaggedCount} skills flagged · {jobMatches.length} jobs matched · {questionCount} questions coached
                    </p>
                  </div>
                </div>

                {/* Tab switcher */}
                <div className="result-tabs">
                  {(['score', 'gaps', 'jobs', 'questions'] as const).map(tab => (
                    <button
                      key={tab}
                      id={`tab-${tab}`}
                      className={`result-tab ${activeResultTab === tab ? 'active' : ''}`}
                      onClick={() => setActiveResultTab(tab)}
                    >
                      {tab === 'score'     && '📊 Score & Profiles'}
                      {tab === 'gaps'      && '🔍 Gaps & Suggestions'}
                      {tab === 'jobs'      && `💼 Job Matches (${jobMatches.length})`}
                      {tab === 'questions' && '🎙️ Interview Coach'}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="result-tab-content">
                  {/* TAB 1: SCORE & PROFILES */}
                  {activeResultTab === 'score' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Resume Fit Breakdown</div>
                      {score ? (
                        <div className="score-breakdown">
                          {SCORE_BARS.map(({ key, label }) => {
                            const value = score.breakdown?.[key];
                            if (value == null || (key === 'jd_match_score' && result.mode !== 'jd_aware')) return null;
                            return (
                              <div key={key} className="score-bar-row">
                                <span>{label}</span>
                                <div className="score-bar-track">
                                  <div className="score-bar-fill" style={{ width: `${value}%` }}></div>
                                </div>
                                <span className="score-bar-pct">{value}%</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <AgentUnavailable agent="Resume Scorer" />
                      )}

                      {score?.summary && (
                        <div className="result-card score-summary">
                          <div className="result-card-title">Summary Evaluation</div>
                          <p className="result-card-text">{score.summary}</p>
                        </div>
                      )}

                      <div className="profiles-grid">
                        {/* Extracted Resume Profile */}
                        <div className="profile-card">
                          <h3 className="profile-card-title">👤 Extracted Resume Profile</h3>
                          {resumeData ? (
                            <div className="profile-stack">
                              <div>
                                <span className="profile-name">{resumeData.name || 'Candidate Name'}</span>
                                <div className="profile-contact">
                                  {resumeData.email && <span>📧 {resumeData.email}</span>}
                                  {resumeData.phone && <span>📞 {resumeData.phone}</span>}
                                  {resumeData.location && <span>📍 {resumeData.location}</span>}
                                </div>
                              </div>

                              {resumeData.summary && (
                                <div>
                                  <strong className="profile-label">Summary:</strong>
                                  <p className="profile-text">{resumeData.summary}</p>
                                </div>
                              )}

                              {list(resumeData.skills).length > 0 && (
                                <div>
                                  <strong className="profile-label">Skills:</strong>
                                  <ChipList items={resumeData.skills} />
                                </div>
                              )}

                              {list(resumeData.experience).length > 0 && (
                                <div className="profile-section">
                                  <strong className="profile-label block">Work Experience:</strong>
                                  <div className="timeline">
                                    {resumeData.experience.map((exp, idx) => (
                                      <div key={idx} className="timeline-item accent">
                                        <div className="timeline-title">{exp.title}</div>
                                        <div className="timeline-meta">
                                          {exp.company && `${exp.company} `}
                                          {(exp.start_date || exp.end_date) && `· (${exp.start_date || ''} - ${exp.end_date || ''})`}
                                        </div>
                                        {exp.description && <p className="timeline-text">{exp.description}</p>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {list(resumeData.education).length > 0 && (
                                <div className="profile-section">
                                  <strong className="profile-label block">Education:</strong>
                                  <div className="timeline tight">
                                    {resumeData.education.map((edu, idx) => (
                                      <div key={idx} className="timeline-item">
                                        <div className="timeline-title">{edu.degree}{edu.field && ` in ${edu.field}`}</div>
                                        <div className="timeline-meta">
                                          {edu.institution} {edu.graduation_year && `(${edu.graduation_year})`}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {list(resumeData.certifications).length > 0 && (
                                <div className="profile-section">
                                  <strong className="profile-label">Certifications:</strong>
                                  <ul className="profile-list">
                                    {resumeData.certifications.map((cert, idx) => (
                                      <li key={idx}>{cert}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="muted-text">No profile data extracted.</p>
                          )}
                        </div>

                        {/* Target Job Profile (if jd_aware) */}
                        {jdData && (
                          <div className="profile-card jd">
                            <h3 className="profile-card-title">💼 Target Job Description</h3>
                            <div className="profile-stack">
                              <div>
                                <span className="profile-name">{jdData.job_title}</span>
                                <div className="profile-contact">
                                  <span>
                                    {jdData.company} {jdData.location && `· ${jdData.location}`}
                                    {jdData.employment_type && ` (${jdData.employment_type})`}
                                  </span>
                                </div>
                              </div>

                              {list(jdData.required_skills).length > 0 && (
                                <div>
                                  <strong className="profile-label">Required Skills:</strong>
                                  <ChipList items={jdData.required_skills} className="chip-accent" />
                                </div>
                              )}

                              {list(jdData.preferred_skills).length > 0 && (
                                <div>
                                  <strong className="profile-label">Preferred Skills:</strong>
                                  <ChipList items={jdData.preferred_skills} />
                                </div>
                              )}

                              {jdData.required_education && (
                                <div>
                                  <strong className="profile-label">Education Requirement:</strong>
                                  <p className="profile-text">{jdData.required_education}</p>
                                </div>
                              )}

                              {list(jdData.responsibilities).length > 0 && (
                                <div>
                                  <strong className="profile-label">Key Responsibilities:</strong>
                                  <ul className="profile-list">
                                    {jdData.responsibilities.slice(0, 4).map((resp, idx) => (
                                      <li key={idx}>{resp}</li>
                                    ))}
                                    {jdData.responsibilities.length > 4 && (
                                      <li className="more">
                                        + {jdData.responsibilities.length - 4} more responsibilities
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: GAPS & SUGGESTIONS */}
                  {activeResultTab === 'gaps' && (
                    <div className="tab-panel animate-fade-in">
                      {!gaps ? (
                        <AgentUnavailable agent="Gap Detector" />
                      ) : (
                        <>
                          {result.mode === 'jd_aware' ? (
                            <>
                              <div>
                                <div className="result-section-title">Missing Required Skills</div>
                                {list(gaps.missing_required_skills).length === 0 ? (
                                  <p className="gap-ok">
                                    ✓ Excellent! You have all the required skills listed in the job description.
                                  </p>
                                ) : (
                                  <ChipList items={gaps.missing_required_skills} className="chip-lg chip-danger" prefix="⚠️ " />
                                )}
                              </div>

                              <div className="result-spaced">
                                <div className="result-section-title">Missing Preferred Skills</div>
                                {list(gaps.missing_preferred_skills).length === 0 ? (
                                  <p className="muted-text">No preferred skills missing.</p>
                                ) : (
                                  <ChipList items={gaps.missing_preferred_skills} className="chip-lg chip-warning" />
                                )}
                              </div>

                              {hasGap(gaps.experience_gap) && (
                                <div className="result-spaced">
                                  <div className="result-section-title">Experience Fit Review</div>
                                  <div className="review-box accent">{gaps.experience_gap}</div>
                                </div>
                              )}

                              {hasGap(gaps.education_gap) && (
                                <div className="result-spaced">
                                  <div className="result-section-title">Education Fit Review</div>
                                  <div className="review-box">{gaps.education_gap}</div>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              {hasGap(gaps.experience_gap) && (
                                <div>
                                  <div className="result-section-title">Experience & Work History Check</div>
                                  <div className="review-box">{gaps.experience_gap}</div>
                                </div>
                              )}
                              {hasGap(gaps.education_gap) && (
                                <div className="result-spaced">
                                  <div className="result-section-title">Education & Profile Check</div>
                                  <div className="review-box">{gaps.education_gap}</div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Actionable Suggestions */}
                          <div className="result-spaced">
                            <div className="result-section-title">Actionable Resume Improvement Suggestions</div>
                            {list(gaps.improvement_suggestions).length === 0 ? (
                              <p className="empty-result">No suggestions needed — your resume is highly optimized!</p>
                            ) : (
                              <ul className="gap-list">
                                {gaps.improvement_suggestions.map((suggestion, i) => (
                                  <li key={i} className="gap-item positive">
                                    <span className="gap-bullet">✓</span>
                                    {suggestion}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB 3: MATCHED JOBS */}
                  {activeResultTab === 'jobs' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Job Matches (Ranked by Alignment)</div>
                      {jobMatches.length === 0 ? (
                        <p className="empty-result">No matching job postings found for this analysis.</p>
                      ) : (
                        <div className="job-list">
                          {jobMatches.map(job => (
                            <div key={job.id} className="job-card detailed">
                              <div className="job-card-header">
                                <div className="job-info">
                                  <div className="job-title">{job.title}</div>
                                  <div className="job-meta">
                                    {job.company} · {job.location} · <span className="job-type">{job.type}</span>
                                  </div>
                                </div>
                                <div className="job-match-pct">{job.match_score.toFixed(0)}% Match</div>
                              </div>

                              {job.description && <p className="job-description">{job.description}</p>}

                              {list(job.skills).length > 0 && (
                                <div className="job-skills">
                                  <div className="job-skills-label">KEY SKILLS REQUIRED:</div>
                                  <div className="chip-row">
                                    {job.skills.map((skill, idx) => {
                                      // Highlight skills the candidate already has
                                      const isMatch = candidateSkills.has(skill.toLowerCase());
                                      return (
                                        <span key={idx} className={`chip chip-job ${isMatch ? 'chip-match' : ''}`}>
                                          {isMatch && '✓'} {skill}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: INTERVIEW PREP */}
                  {activeResultTab === 'questions' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Coached Interview Practice</div>
                      {!questions ? (
                        <AgentUnavailable agent="Interview Coach" />
                      ) : (
                        <>
                          {list(questions.tips).length > 0 && (
                            <div className="tips-card">
                              <div className="tips-card-title">💡 Interview Strategy & Preparation Tips</div>
                              <ul>
                                {questions.tips.map((tip, idx) => (
                                  <li key={idx}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <QuestionGroup
                            title="🤝 Behavioral Questions (Practice STAR Method responses)"
                            items={questions.behavioral}
                          />
                          <QuestionGroup
                            title="💻 Technical & Domain Knowledge Questions"
                            items={questions.technical}
                          />
                          {result.mode === 'jd_aware' && (
                            <QuestionGroup
                              title="🔍 Skill-Gap & Resume-Specific Questions"
                              items={questions.gap_based}
                              variant="gap"
                            />
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

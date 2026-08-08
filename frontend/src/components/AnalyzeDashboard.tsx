import React, { useState, useRef, useCallback } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
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
  result?: string;
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
  score: ScoreData;
  job_matches: JobMatch[];
  gaps: GapsData;
  interview_questions: InterviewQuestions;
  errors: string[];
}

const INITIAL_AGENTS: Record<string, AgentState> = {
  scorer:    { status: 'idle', label: 'Resume Scorer',    icon: '📊' },
  detector:  { status: 'idle', label: 'Gap Detector',     icon: '🔍' },
  matcher:   { status: 'idle', label: 'Job Matcher',      icon: '💼' },
  coach:     { status: 'idle', label: 'Interview Coach',  icon: '🎙️' },
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
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are supported at this time.');
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
    
    // Reset agents
    setAgents(Object.fromEntries(
      Object.entries(INITIAL_AGENTS).map(([k, v]) => [k, { ...v, status: 'idle', result: undefined }])
    ));

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

      // POST to the correct request url using API_BASE_URL
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
      
      // Update all agents to done
      progressKeys.forEach(k => {
        updateAgent(k, { status: 'done' });
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
    setAgents(Object.fromEntries(
      Object.entries(INITIAL_AGENTS).map(([k, v]) => [k, { ...v, status: 'idle', result: undefined }])
    ));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canRun = !!resumeFile && !isRunning;

  const completedCount = Object.values(agents).filter(a => a.status === 'done').length;

  /* ── Render ────────────────────────────────────────── */

  return (
    <div className="chat-dashboard-page">
      <NavBar />

      <div className="dashboard-container">
        {/* ── Left Sidebar: Inputs + Agent progress ── */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <span className="sidebar-sec-title">Resume (PDF)</span>

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
                accept=".pdf"
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
                  <span className="upload-prompt-text">Drop your PDF here</span>
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
              <div className="chat-error-banner animate-fade-in" style={{ margin: '24px', maxWidth: '100%' }}>
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
                {/* Score hero */}
                <div className="score-hero">
                  <div className="score-ring">
                    <svg viewBox="0 0 100 100" className="score-ring-svg">
                      <circle cx="50" cy="50" r="42" className="ring-track" />
                      <circle
                        cx="50" cy="50" r="42"
                        className="ring-fill"
                        strokeDasharray={`${(result.score.overall_score / 100) * 263.9} 263.9`}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="score-value">
                      <span className="score-number">{result.score.overall_score}</span>
                      <span className="score-100">/100</span>
                    </div>
                  </div>
                  <div className="score-meta">
                    <h2 className="score-label">{result.score.label} Match Rating</h2>
                    <p className="score-desc">
                      {result.mode === 'jd_aware' ? 'Job description analyzed · ' : 'Standalone resume evaluation · '}
                      {result.gaps.missing_required_skills.length + result.gaps.missing_preferred_skills.length} skills flagged · {result.job_matches.length} jobs matched · {result.interview_questions.behavioral.length + result.interview_questions.technical.length} questions coached
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
                      {tab === 'gaps'      && `🔍 Gaps & Suggestions`}
                      {tab === 'jobs'      && `💼 Job Matches (${result.job_matches.length})`}
                      {tab === 'questions' && `🎙️ Interview Coach`}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="result-tab-content">
                  {/* TAB 1: SCORE & PROFILES */}
                  {activeResultTab === 'score' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Resume Fit Breakdown</div>
                      <div className="score-breakdown">
                        <div className="score-bar-row">
                          <span>Skills Fit</span>
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${result.score.breakdown.skills_score}%` }}></div>
                          </div>
                          <span className="score-bar-pct">{result.score.breakdown.skills_score}%</span>
                        </div>
                        <div className="score-bar-row">
                          <span>Experience</span>
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${result.score.breakdown.experience_score}%` }}></div>
                          </div>
                          <span className="score-bar-pct">{result.score.breakdown.experience_score}%</span>
                        </div>
                        <div className="score-bar-row">
                          <span>Education</span>
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${result.score.breakdown.education_score}%` }}></div>
                          </div>
                          <span className="score-bar-pct">{result.score.breakdown.education_score}%</span>
                        </div>
                        <div className="score-bar-row">
                          <span>Presentation</span>
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${result.score.breakdown.presentation_score}%` }}></div>
                          </div>
                          <span className="score-bar-pct">{result.score.breakdown.presentation_score}%</span>
                        </div>
                        {result.mode === 'jd_aware' && result.score.breakdown.jd_match_score !== null && (
                          <div className="score-bar-row">
                            <span>JD Alignment</span>
                            <div className="score-bar-track">
                              <div className="score-bar-fill" style={{ width: `${result.score.breakdown.jd_match_score}%` }}></div>
                            </div>
                            <span className="score-bar-pct">{result.score.breakdown.jd_match_score}%</span>
                          </div>
                        )}
                      </div>

                      {result.score.summary && (
                        <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(17, 17, 17, 0.01)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>Summary Evaluation</div>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>{result.score.summary}</p>
                        </div>
                      )}

                      {/* Profiles Side-by-Side/Grid */}
                      <div className="profiles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginTop: '24px' }}>
                        {/* Extracted Resume Profile */}
                        <div className="profile-card" style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'rgba(17, 17, 17, 0.01)' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--text-primary)' }}>
                            👤 Extracted Resume Profile
                          </h3>
                          {result.resume_data ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: '15px' }}>{result.resume_data.name || 'Candidate Name'}</span>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {result.resume_data.email && <span>📧 {result.resume_data.email}</span>}
                                  {result.resume_data.phone && <span>📞 {result.resume_data.phone}</span>}
                                  {result.resume_data.location && <span>📍 {result.resume_data.location}</span>}
                                </div>
                              </div>

                              {result.resume_data.summary && (
                                <div>
                                  <strong style={{ fontSize: '12px' }}>Summary:</strong>
                                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.4', margin: 0 }}>{result.resume_data.summary}</p>
                                </div>
                              )}

                              {result.resume_data.skills && result.resume_data.skills.length > 0 && (
                                <div>
                                  <strong style={{ fontSize: '12px' }}>Skills:</strong>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                    {result.resume_data.skills.map((skill, idx) => (
                                      <span key={idx} style={{ fontSize: '10.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'rgba(17, 17, 17, 0.04)', color: 'var(--text-secondary)' }}>
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Experience timeline */}
                              {result.resume_data.experience && result.resume_data.experience.length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Work Experience:</strong>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {result.resume_data.experience.map((exp, idx) => (
                                      <div key={idx} style={{ fontSize: '12px', borderLeft: '2px solid var(--accent)', paddingLeft: '10px' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{exp.title}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '2px 0' }}>
                                          {exp.company && `${exp.company} `}
                                          {(exp.start_date || exp.end_date) && `· (${exp.start_date || ''} - ${exp.end_date || ''})`}
                                        </div>
                                        {exp.description && (
                                          <p style={{ marginTop: '4px', color: 'var(--text-secondary)', lineHeight: '1.4', fontSize: '11.5px', margin: 0 }}>{exp.description}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Education Timeline */}
                              {result.resume_data.education && result.resume_data.education.length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  <strong style={{ display: 'block', marginBottom: '8px', fontSize: '12px' }}>Education:</strong>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {result.resume_data.education.map((edu, idx) => (
                                      <div key={idx} style={{ fontSize: '12px', borderLeft: '2px solid var(--border)', paddingLeft: '10px' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{edu.degree}{edu.field && ` in ${edu.field}`}</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                                          {edu.institution} {edu.graduation_year && `(${edu.graduation_year})`}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Certifications */}
                              {result.resume_data.certifications && result.resume_data.certifications.length > 0 && (
                                <div style={{ marginTop: '4px' }}>
                                  <strong style={{ fontSize: '12px' }}>Certifications:</strong>
                                  <ul style={{ paddingLeft: '16px', margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                    {result.resume_data.certifications.map((cert, idx) => (
                                      <li key={idx} style={{ marginBottom: '3px' }}>{cert}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>No profile data extracted.</p>
                          )}
                        </div>

                        {/* Target Job Profile (if jd_aware) */}
                        {result.mode === 'jd_aware' && result.jd_data && (
                          <div className="profile-card" style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'rgba(231, 138, 83, 0.01)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '14px', borderBottom: '1px solid rgba(231, 138, 83, 0.15)', paddingBottom: '8px', color: 'var(--text-primary)' }}>
                              💼 Target Job Description
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div>
                                <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent)' }}>{result.jd_data.job_title}</span>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                  {result.jd_data.company} {result.jd_data.location && `· ${result.jd_data.location}`}
                                  {result.jd_data.employment_type && ` (${result.jd_data.employment_type})`}
                                </div>
                              </div>

                              {result.jd_data.required_skills && result.jd_data.required_skills.length > 0 && (
                                <div>
                                  <strong style={{ fontSize: '12px' }}>Required Skills:</strong>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                    {result.jd_data.required_skills.map((skill, idx) => (
                                      <span key={idx} style={{ fontSize: '10.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'rgba(231, 138, 83, 0.08)', color: 'var(--accent)' }}>
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {result.jd_data.preferred_skills && result.jd_data.preferred_skills.length > 0 && (
                                <div>
                                  <strong style={{ fontSize: '12px' }}>Preferred Skills:</strong>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                    {result.jd_data.preferred_skills.map((skill, idx) => (
                                      <span key={idx} style={{ fontSize: '10.5px', fontWeight: 600, padding: '3px 8px', borderRadius: '12px', background: 'rgba(17, 17, 17, 0.04)', color: 'var(--text-secondary)' }}>
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {result.jd_data.required_education && (
                                <div>
                                  <strong style={{ fontSize: '12px' }}>Education Requirement:</strong>
                                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>{result.jd_data.required_education}</p>
                                </div>
                              )}

                              {result.jd_data.responsibilities && result.jd_data.responsibilities.length > 0 && (
                                <div>
                                  <strong style={{ fontSize: '12px' }}>Key Responsibilities:</strong>
                                  <ul style={{ paddingLeft: '16px', margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                    {result.jd_data.responsibilities.slice(0, 4).map((resp, idx) => (
                                      <li key={idx} style={{ marginBottom: '3px' }}>{resp}</li>
                                    ))}
                                    {result.jd_data.responsibilities.length > 4 && (
                                      <li style={{ listStyleType: 'none', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '11px' }}>
                                        + {result.jd_data.responsibilities.length - 4} more responsibilities
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
                      {result.mode === 'jd_aware' ? (
                        <>
                          {/* Missing Required Skills */}
                          <div>
                            <div className="result-section-title">Missing Required Skills</div>
                            {result.gaps.missing_required_skills.length === 0 ? (
                              <p style={{ fontSize: '13px', color: '#065f46', background: 'rgba(16, 185, 129, 0.06)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16, 185, 129, 0.2)', margin: 0 }}>
                                ✓ Excellent! You have all the required skills listed in the job description.
                              </p>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                {result.gaps.missing_required_skills.map((skill, idx) => (
                                  <span key={idx} style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.08)', color: '#b91c1c', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                                    ⚠️ {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Missing Preferred Skills */}
                          <div style={{ marginTop: '12px' }}>
                            <div className="result-section-title">Missing Preferred Skills</div>
                            {result.gaps.missing_preferred_skills.length === 0 ? (
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>No preferred skills missing.</p>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                {result.gaps.missing_preferred_skills.map((skill, idx) => (
                                  <span key={idx} style={{ fontSize: '12px', fontWeight: 600, padding: '6px 12px', borderRadius: '16px', background: 'rgba(245, 158, 11, 0.06)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Experience Gap */}
                          {result.gaps.experience_gap && result.gaps.experience_gap !== "None" && (
                            <div style={{ marginTop: '12px' }}>
                              <div className="result-section-title">Experience Fit Review</div>
                              <div style={{ padding: '14px', border: '1px solid rgba(231, 138, 83, 0.2)', background: 'rgba(231, 138, 83, 0.03)', borderRadius: 'var(--radius-sm)', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                                {result.gaps.experience_gap}
                              </div>
                            </div>
                          )}

                          {/* Education Gap */}
                          {result.gaps.education_gap && result.gaps.education_gap !== "None" && (
                            <div style={{ marginTop: '12px' }}>
                              <div className="result-section-title">Education Fit Review</div>
                              <div style={{ padding: '14px', border: '1px solid var(--border)', background: 'rgba(17, 17, 17, 0.01)', borderRadius: 'var(--radius-sm)', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                                {result.gaps.education_gap}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Standalone gap items */}
                          {result.gaps.experience_gap && (
                            <div>
                              <div className="result-section-title">Experience & Work History Check</div>
                              <div style={{ padding: '14px', border: '1px solid var(--border)', background: 'rgba(17, 17, 17, 0.01)', borderRadius: 'var(--radius-sm)', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                                {result.gaps.experience_gap}
                              </div>
                            </div>
                          )}
                          {result.gaps.education_gap && (
                            <div style={{ marginTop: '12px' }}>
                              <div className="result-section-title">Education & Profile Check</div>
                              <div style={{ padding: '14px', border: '1px solid var(--border)', background: 'rgba(17, 17, 17, 0.01)', borderRadius: 'var(--radius-sm)', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                                {result.gaps.education_gap}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Actionable Suggestions */}
                      <div style={{ marginTop: '12px' }}>
                        <div className="result-section-title">Actionable Resume Improvement Suggestions</div>
                        {result.gaps.improvement_suggestions.length === 0 ? (
                          <p className="empty-result">No suggestions needed — your resume is highly optimized!</p>
                        ) : (
                          <ul className="gap-list">
                            {result.gaps.improvement_suggestions.map((suggestion, i) => (
                              <li key={i} className="gap-item" style={{ background: 'rgba(16, 185, 129, 0.03)', borderColor: 'rgba(16, 185, 129, 0.15)' }}>
                                <span className="gap-bullet" style={{ color: '#10b981' }}>✓</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: MATCHED JOBS */}
                  {activeResultTab === 'jobs' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Job Matches (Ranked by Alignment)</div>
                      {result.job_matches.length === 0 ? (
                        <p className="empty-result">No matching job postings found for this analysis.</p>
                      ) : (
                        <div className="job-list">
                          {result.job_matches.map((job, i) => {
                            // Highlight skills that candidate already has
                            const candidateSkills = new Set((result.resume_data?.skills || []).map(s => s.toLowerCase()));
                            
                            return (
                              <div key={i} className="job-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', padding: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                  <div className="job-info">
                                    <div className="job-title" style={{ fontSize: '15px', fontWeight: 700 }}>{job.title}</div>
                                    <div className="job-meta">{job.company} · {job.location} · <span style={{ fontWeight: 600 }}>{job.type}</span></div>
                                  </div>
                                  <div className="job-match-pct" style={{ padding: '6px 12px', background: 'var(--accent-glow)', borderRadius: '16px', fontSize: '13px', minWidth: 'auto', border: '1px solid var(--accent-border)' }}>
                                    {job.match_score.toFixed(0)}% Match
                                  </div>
                                </div>
                                
                                {job.description && (
                                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.45', margin: 0 }}>{job.description}</p>
                                )}
                                
                                {job.skills && job.skills.length > 0 && (
                                  <div style={{ marginTop: '4px' }}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>KEY SKILLS REQUIRED:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {job.skills.map((skill, idx) => {
                                        const isMatch = candidateSkills.has(skill.toLowerCase());
                                        return (
                                          <span 
                                            key={idx} 
                                            style={{ 
                                              fontSize: '11px', 
                                              fontWeight: 600, 
                                              padding: '3px 8px', 
                                              borderRadius: '12px', 
                                              background: isMatch ? 'rgba(16, 185, 129, 0.08)' : 'rgba(17, 17, 17, 0.04)', 
                                              color: isMatch ? '#047857' : 'var(--text-secondary)',
                                              border: isMatch ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid transparent',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '4px'
                                            }}
                                          >
                                            {isMatch && '✓'} {skill}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 4: INTERVIEW PREP */}
                  {activeResultTab === 'questions' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Coached Interview Practice</div>
                      
                      {/* Tips card */}
                      {result.interview_questions.tips && result.interview_questions.tips.length > 0 && (
                        <div style={{ padding: '16px', border: '1px solid rgba(231, 138, 83, 0.25)', background: 'rgba(231, 138, 83, 0.03)', borderRadius: 'var(--radius-md)', marginBottom: '8px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            💡 Interview Strategy & Preparation Tips
                          </div>
                          <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            {result.interview_questions.tips.map((tip, idx) => (
                              <li key={idx} style={{ marginBottom: '6px' }}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Behavioral questions */}
                      {result.interview_questions.behavioral && result.interview_questions.behavioral.length > 0 && (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px', marginTop: '8px' }}>
                            🤝 Behavioral Questions (Practice STAR Method responses)
                          </div>
                          <ol className="question-list">
                            {result.interview_questions.behavioral.map((q, i) => (
                              <li key={i} className="question-item">{q}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Technical questions */}
                      {result.interview_questions.technical && result.interview_questions.technical.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                            💻 Technical & Domain Knowledge Questions
                          </div>
                          <ol className="question-list">
                            {result.interview_questions.technical.map((q, i) => (
                              <li key={i} className="question-item">{q}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Gap-based questions (only in jd_aware mode) */}
                      {result.mode === 'jd_aware' && result.interview_questions.gap_based && result.interview_questions.gap_based.length > 0 && (
                        <div style={{ marginTop: '16px' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#b45309', marginBottom: '8px' }}>
                            🔍 Skill-Gap & Resume-Specific Questions
                          </div>
                          <ol className="question-list">
                            {result.interview_questions.gap_based.map((q, i) => (
                              <li key={i} className="question-item" style={{ borderColor: 'rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.02)' }}>{q}</li>
                            ))}
                          </ol>
                        </div>
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

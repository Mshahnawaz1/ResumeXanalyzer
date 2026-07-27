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

interface AnalysisResult {
  score: number;
  scoreLabel: string;
  gaps: string[];
  jobs: { title: string; company: string; location: string; match: number }[];
  questions: string[];
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

  /* ── Analysis run (SSE) ────────────────────────────── */

  const updateAgent = (key: string, patch: Partial<AgentState>) => {
    setAgents(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleRunAnalysis = async () => {
    if (!resumeFile || !jobDescription.trim()) return;
    setIsRunning(true);
    setError(null);
    setResult(null);
    setActiveResultTab('score');
    // Reset agents
    setAgents(Object.fromEntries(
      Object.entries(INITIAL_AGENTS).map(([k, v]) => [k, { ...v, status: 'idle', result: undefined }])
    ));

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('job_description', jobDescription.trim());

      // POST to start analysis; backend returns a run_id then streams SSE
      const initRes = await fetch(`${API_BASE_URL}/api/v1/analyze/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!initRes.ok) {
        const errData = await initRes.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to start analysis.');
      }

      const { run_id } = await initRes.json();

      // Open SSE stream
      const evtSource = new EventSource(
        `${API_BASE_URL}/api/v1/analyze/stream/${run_id}?token=${token}`
      );

      evtSource.addEventListener('agent_start', (e: MessageEvent) => {
        const { agent } = JSON.parse(e.data);
        updateAgent(agent, { status: 'running' });
      });

      evtSource.addEventListener('agent_done', (e: MessageEvent) => {
        const { agent, result: res } = JSON.parse(e.data);
        updateAgent(agent, { status: 'done', result: res });
      });

      evtSource.addEventListener('agent_error', (e: MessageEvent) => {
        const { agent } = JSON.parse(e.data);
        updateAgent(agent, { status: 'error' });
      });

      evtSource.addEventListener('analysis_complete', (e: MessageEvent) => {
        const data: AnalysisResult = JSON.parse(e.data);
        setResult(data);
        setIsRunning(false);
        evtSource.close();
      });

      evtSource.addEventListener('error_event', (e: MessageEvent) => {
        const { message } = JSON.parse(e.data);
        setError(message || 'An error occurred during analysis.');
        setIsRunning(false);
        evtSource.close();
      });

      evtSource.onerror = () => {
        setError('Connection to the analysis stream was lost. Please try again.');
        setIsRunning(false);
        evtSource.close();
      };
    } catch (err: any) {
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

  const canRun = !!resumeFile && jobDescription.trim().length > 20 && !isRunning;

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
            <span className="sidebar-sec-title">Job Description</span>
            <textarea
              id="job-description-input"
              className="jd-textarea"
              placeholder="Paste the full job description here — the more detail, the better the analysis."
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
                <p>Upload your resume and paste a job description on the left, then hit <strong>Run Analysis</strong>. Four AI agents will evaluate your fit and stream results here live.</p>

                <div className="suggested-prompts-grid">
                  <div className="suggested-card">
                    <div className="card-icon">📊</div>
                    <div className="card-info">
                      <h4>Resume Score</h4>
                      <p>0–100 fit score with rationale</p>
                    </div>
                  </div>
                  <div className="suggested-card">
                    <div className="card-icon">🔍</div>
                    <div className="card-info">
                      <h4>Skill Gaps</h4>
                      <p>Every missing requirement flagged</p>
                    </div>
                  </div>
                  <div className="suggested-card">
                    <div className="card-icon">💼</div>
                    <div className="card-info">
                      <h4>Job Matches</h4>
                      <p>Real postings ranked by fit</p>
                    </div>
                  </div>
                  <div className="suggested-card">
                    <div className="card-icon">🎙️</div>
                    <div className="card-info">
                      <h4>Interview Prep</h4>
                      <p>Tailored questions to practice</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Running state — streaming progress */}
            {isRunning && !result && (
              <div className="analysis-running-view">
                <div className="running-header">
                  <SparkIcon className="running-spark" />
                  <h3>Agents are working…</h3>
                  <p>Results will appear as each agent completes.</p>
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
                        strokeDasharray={`${(result.score / 100) * 263.9} 263.9`}
                        strokeDashoffset="0"
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <div className="score-value">
                      <span className="score-number">{result.score}</span>
                      <span className="score-100">/100</span>
                    </div>
                  </div>
                  <div className="score-meta">
                    <h2 className="score-label">{result.scoreLabel}</h2>
                    <p className="score-desc">{result.gaps.length} gaps flagged · {result.jobs.length} jobs matched · {result.questions.length} interview questions generated</p>
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
                      {tab === 'score'     && '📊 Score'}
                      {tab === 'gaps'      && `🔍 Gaps (${result.gaps.length})`}
                      {tab === 'jobs'      && `💼 Jobs (${result.jobs.length})`}
                      {tab === 'questions' && `🎙️ Interview`}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div className="result-tab-content">
                  {activeResultTab === 'score' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Resume Fit Analysis</div>
                      <div className="score-breakdown">
                        <div className="score-bar-row">
                          <span>Overall Fit</span>
                          <div className="score-bar-track">
                            <div className="score-bar-fill" style={{ width: `${result.score}%` }}></div>
                          </div>
                          <span className="score-bar-pct">{result.score}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeResultTab === 'gaps' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Flagged Skill Gaps</div>
                      {result.gaps.length === 0 ? (
                        <p className="empty-result">No gaps detected — excellent match!</p>
                      ) : (
                        <ul className="gap-list">
                          {result.gaps.map((gap, i) => (
                            <li key={i} className="gap-item">
                              <span className="gap-bullet">!</span>
                              {gap}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {activeResultTab === 'jobs' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Matched Job Postings</div>
                      {result.jobs.length === 0 ? (
                        <p className="empty-result">No job matches found for this analysis.</p>
                      ) : (
                        <div className="job-list">
                          {result.jobs.map((job, i) => (
                            <div key={i} className="job-card">
                              <div className="job-match-pct">{job.match}%</div>
                              <div className="job-info">
                                <div className="job-title">{job.title}</div>
                                <div className="job-meta">{job.company} · {job.location}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeResultTab === 'questions' && (
                    <div className="tab-panel animate-fade-in">
                      <div className="result-section-title">Interview Prep Questions</div>
                      {result.questions.length === 0 ? (
                        <p className="empty-result">No questions generated.</p>
                      ) : (
                        <ol className="question-list">
                          {result.questions.map((q, i) => (
                            <li key={i} className="question-item">{q}</li>
                          ))}
                        </ol>
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

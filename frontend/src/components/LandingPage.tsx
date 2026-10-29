import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from './NavBar';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'What file formats are supported?',
      a: 'PDF and DOCX resumes are supported. The file is processed securely and never stored on our servers permanently.',
    },
    {
      q: 'How are the agents coordinated?',
      a: 'Under the hood, four specialized LLM agents run inside a LangGraph dependency graph. Each agent handles a specific task — scoring, gap detection, job matching, and question generation — and their outputs compose into a single unified report.',
    },
    {
      q: 'Do I need an account to use ResumeXAnalyzer?',
      a: 'Yes. An account keeps the analyzer behind a sign-in so each analysis session is scoped to you.',
    },
    {
      q: 'Is my resume data stored or used for training?',
      a: 'No. Your resume and job description are used only for your analysis run. We do not store, log, or use your personal documents for any model training.',
    },
  ];

  const agents = [
    {
      icon: '📊',
      name: 'Resume Scorer',
      description: 'Evaluates your resume holistically against the job description — assigning a fit score from 0–100 with a breakdown of what helps and what hurts.',
    },
    {
      icon: '🔍',
      name: 'Gap Detector',
      description: 'Flags every missing skill, tool, certification, and experience the job description demands that your resume doesn\'t address.',
    },
    {
      icon: '💼',
      name: 'Job Matcher',
      description: 'Ranks job postings by how closely their required skills match your resume — giving you a shortlist of positions to look at.',
    },
    {
      icon: '🎙️',
      name: 'Interview Coach',
      description: 'Generates tailored interview questions based specifically on the role and your gaps, so you know exactly what to prepare for.',
    },
  ];

  return (
    <div className="landing-wrapper">
      <NavBar />

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Know your resume score<br />
            <span className="text-fade">before the recruiter does.</span>
          </h1>
          <p className="hero-subtitle">
            Upload your resume and paste the job description. Four specialized AI agents run in parallel — scoring your fit, flagging skill gaps, matching job openings, and building your interview prep list.
          </p>
          <div className="hero-actions">
            <button
              onClick={() => navigate('/register')}
              className="btn-hero-primary"
              id="hero-get-started-btn"
            >
              Analyze My Resume
            </button>
            <a href="#how-it-works" className="btn-hero-secondary">
              See how it works
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="arrow-right-icon"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </a>
          </div>

          <div className="hero-bullets">
            <span className="bullet-item">
              <span className="bullet-dot"></span>Resume Scoring
            </span>
            <span className="bullet-item">
              <span className="bullet-dot"></span>Skill Gap Analysis
            </span>
            <span className="bullet-item">
              <span className="bullet-dot"></span>Live Job Matches
            </span>
            <span className="bullet-item">
              <span className="bullet-dot"></span>Interview Questions
            </span>
          </div>
        </div>
      </header>

      {/* App Mockup Preview */}
      <section className="mockup-section">
        <div className="mockup-container">
          <div className="mockup-gradient-bg">
            <div className="app-mockup">
              {/* Window Header */}
              <div className="mockup-header">
                <div className="window-controls">
                  <span className="control-dot close"></span>
                  <span className="control-dot minimize"></span>
                  <span className="control-dot expand"></span>
                </div>
                <div className="mockup-title">resumexanalyzer — analysis workspace</div>
                <div className="mockup-header-actions">
                  <span className="action-pill">4 Agents Running</span>
                </div>
              </div>

              {/* Window Body — two-panel layout */}
              <div className="mockup-body">
                {/* Left input panel */}
                <div className="mockup-sidebar" style={{ width: '200px' }}>
                  <div className="sidebar-sec-title">Resume Upload</div>
                  <div style={{ background: 'rgba(231,138,83,0.07)', border: '1.5px dashed rgba(231,138,83,0.35)', borderRadius: '8px', padding: '14px 10px', textAlign: 'center', fontSize: '10px', color: 'rgba(17,17,17,0.45)' }}>
                    <div style={{ fontSize: '18px', marginBottom: '6px' }}>📄</div>
                    <div style={{ fontWeight: 600, color: '#e78a53', marginBottom: '3px' }}>resume_final.pdf</div>
                    <div>Uploaded · 1.2 MB</div>
                  </div>

                  <div className="sidebar-sec-title" style={{ marginTop: '12px' }}>Job Description</div>
                  <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '6px', padding: '8px', fontSize: '9px', color: 'rgba(17,17,17,0.5)', lineHeight: 1.5 }}>
                    Senior Frontend Engineer — React, TypeScript, GraphQL...
                  </div>

                  <div className="sidebar-bottom">
                    <div style={{ background: '#111', color: '#fff', borderRadius: '8px', padding: '8px 12px', textAlign: 'center', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                      ▶ Run Analysis
                    </div>
                  </div>
                </div>

                {/* Right results panel */}
                <div className="mockup-chat">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                    {/* Score card */}
                    <div style={{ background: 'rgba(231,138,83,0.06)', border: '1px solid rgba(231,138,83,0.15)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#e78a53', lineHeight: 1 }}>82</div>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#111' }}>Resume Score</div>
                        <div style={{ fontSize: '9px', color: 'rgba(17,17,17,0.45)', marginTop: '1px' }}>Strong match — 3 gaps flagged</div>
                      </div>
                    </div>

                    {/* Gaps */}
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flagged Gaps</div>
                    {['GraphQL experience', 'CI/CD pipeline knowledge', 'System design interview prep'].map((gap, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'rgba(17,17,17,0.7)', padding: '5px 8px', background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '6px' }}>
                        <span style={{ color: '#e78a53', fontWeight: 700 }}>!</span> {gap}
                      </div>
                    ))}

                    {/* Job match */}
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(0,0,0,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Job Match</div>
                    <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '6px', padding: '8px 10px', fontSize: '9.5px' }}>
                      <div style={{ fontWeight: 600, color: '#111' }}>Frontend Engineer — Stripe</div>
                      <div style={{ color: 'rgba(17,17,17,0.45)', marginTop: '2px' }}>San Francisco / Remote · 95% match</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="security-section">
        <div className="security-container">
          <div className="security-content">
            <h2 className="section-title">Four agents. One report. Live.</h2>
            <p className="section-description">
              ResumeXAnalyzer runs a LangGraph dependency graph that coordinates four specialized LLM agents. Agent progress streams directly to your browser via SSE — no waiting for a bulk result at the end.
            </p>
            <div className="security-stats">
              <div className="stat-box">
                <span className="stat-num">4</span>
                <span className="stat-label">AI Agents</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">Live</span>
                <span className="stat-label">SSE Streaming</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">0–100</span>
                <span className="stat-label">Fit Score</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features / Agent Grid */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">What each agent does</h2>
          <p className="section-subtitle">
            Each agent is purpose-built for one job. Together they give you a full picture of your candidacy.
          </p>
        </div>

        <div className="features-grid">
          {agents.map((agent) => (
            <div className="feature-card" key={agent.name}>
              <div className="feature-icon">{agent.icon}</div>
              <h3>{agent.name}</h3>
              <p>{agent.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Everything you need to know before uploading your first resume.
          </p>
        </div>

        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${activeFaq === index ? 'active' : ''}`}
              onClick={() => toggleFaq(index)}
            >
              <div className="faq-question">
                <h3>{faq.q}</h3>
                <span className="faq-toggle-icon">
                  {activeFaq === index ? '−' : '+'}
                </span>
              </div>
              <div className="faq-answer">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to know your fit score?</h2>
          <p>Create an account in seconds and run your first resume analysis for free.</p>
          <div className="cta-buttons">
            <button
              id="cta-analyze-btn"
              onClick={() => navigate('/register')}
              className="btn-cta-primary"
            >
              Analyze My Resume
            </button>
            <button
              id="cta-signin-btn"
              onClick={() => navigate('/login')}
              className="btn-cta-secondary"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" className="footer-logo-svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span>ResumeXAnalyzer</span>
          </div>
          <p className="footer-copy">© 2026 ResumeXAnalyzer. Powered by LangGraph &amp; LLM Agents.</p>
          <div className="footer-links">
            <button onClick={() => navigate('/about')}>About</button>
            <button onClick={() => navigate('/privacy')}>Privacy Policy</button>
            <button onClick={() => navigate('/terms')}>Terms of Service</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

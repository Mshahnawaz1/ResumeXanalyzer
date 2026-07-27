import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from './NavBar';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-wrapper">
      <NavBar />


      {/* Content Section */}
      <main className="info-page-main">
        <article className="info-article">
          <span className="article-eyebrow">Our Mission</span>
          <h1 className="article-title">About Gemini Nexus</h1>
          <p className="article-lead">
            We believe that powerful AI assistants should be accessible, beautiful, and completely private. 
            Gemini Nexus was founded to give developers and creators a local-first interface that keeps data on their own machine.
          </p>

          <div className="article-content">
            <h2>Why Local-First?</h2>
            <p>
              Most modern AI platforms send your keystrokes, history, and context to cloud databases where they are parsed, analyzed, 
              and used for telemetry. We designed Gemini Nexus to be client-side only. By storing conversations locally 
              and authenticating directly with Supabase, your prompts remain yours.
            </p>

            <h2>The Technology Stack</h2>
            <p>
              Gemini Nexus is built using modern client-side standards to ensure speed, security, and portability:
            </p>
            <ul>
              <li><strong>Supabase Auth:</strong> Secure user accounts and authentication sessions are guarded directly on the client.</li>
              <li><strong>Google Gemini API:</strong> Prompts are sent directly from your browser to Google AI Studio, using your own API credentials.</li>
              <li><strong>Vanilla CSS System:</strong> Fast rendering, responsive layout constraints, and elegant typography styling.</li>
            </ul>

            <div className="about-stats-grid">
              <div className="about-stat-card">
                <h3>Privacy Focus</h3>
                <p>No telemetry, no tracking cookies, and no middleman servers.</p>
              </div>
              <div className="about-stat-card">
                <h3>Developer Ready</h3>
                <p>Advanced syntax highlighting, copy-paste snippets, and keyboard hotkeys.</p>
              </div>
            </div>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand" onClick={() => navigate('/')}>
            <svg viewBox="0 0 24 24" className="footer-logo-svg">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Gemini Nexus</span>
          </div>
          <p className="footer-copy">© 2026 Gemini Nexus. Built with Supabase & Gemini AI.</p>
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

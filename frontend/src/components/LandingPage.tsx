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
      q: 'Is Gemini Nexus free to use?',
      a: 'Yes, Gemini Nexus offers a free tier. You can sign up using Supabase and enter your Gemini API key from Google AI Studio to start chatting.',
    },
    {
      q: 'How does the authentication work?',
      a: 'We use Supabase directly on the client side to authenticate your session. Your passwords and credentials are fully secured and managed by Supabase, never touched by intermediate APIs.',
    },
    {
      q: 'Where are my chat history and API keys stored?',
      a: 'All data is stored local-first on your machine. API keys are kept securely in browser local storage and used directly in secure requests, ensuring complete privacy.',
    },
    {
      q: 'Can I use custom system prompts?',
      a: 'Absolutely. You can configure custom persona settings in your workspace, allowing you to tailor the response style and model guidelines for each conversation.',
    },
  ];

  return (
    <div className="landing-wrapper">
      <NavBar />


      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Talk to Gemini. <br />
            <span className="text-fade">Keep it private, make it beautiful.</span>
          </h1>
          <p className="hero-subtitle">
            Gemini Nexus is a sleek, local-first workspace for Gemini AI. 
            Zero intermediate servers, custom layouts, advanced syntax highlighting, and secure auth via Supabase.
          </p>
          <div className="hero-actions">
            <button
              onClick={() => navigate('/register')}
              className="btn-hero-primary"
            >
              Get Started for Free
            </button>
            <a href="#features" className="btn-hero-secondary">
              Explore Features
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
              <span className="bullet-dot"></span>Direct Supabase Auth
            </span>
            <span className="bullet-item">
              <span className="bullet-dot"></span>Local-First Data
            </span>
            <span className="bullet-item">
              <span className="bullet-dot"></span>Gemini v2.5 Online
            </span>
            <span className="bullet-item">
              <span className="bullet-dot"></span>Keyboard Shortcuts
            </span>
          </div>
        </div>
      </header>

      {/* Signature App Mockup (Visual Highlight) */}
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
                <div className="mockup-title">gemini_nexus_workspace</div>
                <div className="mockup-header-actions">
                  <span className="action-pill">Workspace Agent</span>
                </div>
              </div>

              {/* Window Workspace */}
              <div className="mockup-body">
                {/* Sidebar */}
                <div className="mockup-sidebar">
                  <div className="sidebar-sec-title">Conversations</div>
                  <div className="sidebar-item active">
                    <span className="sidebar-icon">💬</span>
                    <span>TypeScript Debounce</span>
                  </div>
                  <div className="sidebar-item">
                    <span className="sidebar-icon">💬</span>
                    <span>FastAPI CORS Settings</span>
                  </div>
                  <div className="sidebar-item">
                    <span className="sidebar-icon">💬</span>
                    <span>React Suspense Guide</span>
                  </div>
                  <div className="sidebar-bottom">
                    <div className="user-profile">
                      <div className="avatar-small">U</div>
                      <div className="user-email-text">user@bettershot.site</div>
                    </div>
                  </div>
                </div>

                {/* Chat Panel */}
                <div className="mockup-chat">
                  <div className="chat-messages">
                    <div className="mock-message user">
                      <div className="avatar-circle">U</div>
                      <div className="bubble">
                        Write a TypeScript debounce function signature.
                      </div>
                    </div>

                    <div className="mock-message model">
                      <div className="avatar-circle ai">AI</div>
                      <div className="bubble">
                        <p>Here is a clean implementation of a debounce function in TypeScript:</p>
                        <div className="mock-code-block">
                          <div className="code-header">
                            <span>typescript</span>
                            <span className="copy-text">Copy</span>
                          </div>
                          <pre>
{`function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mock-input-area">
                    <div className="mock-input-box">
                      <span>Ask Gemini a question...</span>
                      <div className="mock-send-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">Designed for developer velocity</h2>
          <p className="section-subtitle">
            A minimalist, powerful interface engineered for clarity and fluid interaction.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3>Supabase Client Auth</h3>
            <p>
              Direct, serverless connection to Supabase for secure signup and signin. 
              No backend proxy required, keeping authentication standard and transparent.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Instant Load Times</h3>
            <p>
              Written with React and optimized vanilla CSS. No bloated packages, 
              rendering your markdown and code blocks in milliseconds.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Local-First Privacy</h3>
            <p>
              Your chat history and settings are stored safely in local storage. 
              We never upload your data, code, or prompts to any secondary database.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎹</div>
            <h3>Keyboard-First Navigation</h3>
            <p>
              Submit chats, insert snippet chips, navigate sidebar channels, and clear history 
              effortlessly using configurable hotkeys.
            </p>
          </div>
        </div>
      </section>

      {/* Security Focus Section */}
      <section id="security" className="security-section">
        <div className="security-container">
          <div className="security-content">
            <h2 className="section-title">Security you can inspect</h2>
            <p className="section-description">
              Traditional SaaS products proxy your calls through their private servers, harvesting your telemetry and prompts. 
              Gemini Nexus operates entirely on the client, directly communicating with Supabase and Gemini's API. 
              Your credentials are yours alone.
            </p>
            <div className="security-stats">
              <div className="stat-box">
                <span className="stat-num">100%</span>
                <span className="stat-label">Client-Side Logic</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">0</span>
                <span className="stat-label">Tracking Cookies</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">Secure</span>
                <span className="stat-label">Supabase Guarded</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-header">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <p className="section-subtitle">
            Everything you need to know about the Gemini Nexus client dashboard.
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

      {/* Call To Action */}
      <section className="cta-section">
        <div className="cta-container">
          <h2>Ready to experience Gemini Nexus?</h2>
          <p>Create a secure account in seconds and unlock developer workspace utilities.</p>
          <div className="cta-buttons">
             <button
              onClick={() => navigate('/register')}
              className="btn-cta-primary"
            >
              Get Started Now
            </button>
            <button
              onClick={() => navigate('/login')}
              className="btn-cta-secondary"
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

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

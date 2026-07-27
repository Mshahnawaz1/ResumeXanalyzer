import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from './NavBar';

export const PrivacyPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-wrapper">
      <NavBar />


      {/* Content Section */}
      <main className="info-page-main">
        <article className="info-article">
          <span className="article-eyebrow">Data Safeguards</span>
          <h1 className="article-title">Privacy Policy</h1>
          <p className="article-lead">
            Your privacy is the core design parameter of Gemini Nexus. Because we utilize a local-first, serverless architecture, 
            we do not collect, store, or sell your chat logs or security tokens.
          </p>

          <div className="article-content">
            <h2>1. Information We Do Not Collect</h2>
            <p>
              Unlike traditional SaaS solutions, we do not stand between your client app and Gemini AI. 
            </p>
            <ul>
              <li><strong>Prompts & Chats:</strong> All request prompts, context history, and responses are kept inside browser local storage and memory on your machine.</li>
              <li><strong>API Credentials:</strong> Your Gemini API keys are processed and stored directly in your local environment, never sent to secondary servers.</li>
              <li><strong>Telemetry:</strong> We do not deploy behavioral tracking scripts, hotjars, or session recordings.</li>
            </ul>

            <h2>2. Authentication via Supabase</h2>
            <p>
              We integrate directly with Supabase to manage user signin and registration. Your auth session keys, emails, 
              and hashed passwords are encrypted and sent directly to Supabase APIs, governed by their enterprise-grade security protocols.
            </p>

            <h2>3. Third-Party API Calls (Google Gemini)</h2>
            <p>
              When sending prompts, your browser directly makes HTTP requests to Google's API endpoints. These requests are governed by 
              Google's AI Studio Terms of Service. We recommend reviewing their policies regarding data usage on API keys.
            </p>

            <h2>4. Changes to This Policy</h2>
            <p>
              As a local-first project, any updates to the client will be delivered through versioned git releases. If we ever implement 
              optional cloud sync features, they will remain strictly opt-in.
            </p>
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

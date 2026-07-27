import React from 'react';
import { useNavigate } from 'react-router-dom';
import { NavBar } from './NavBar';

export const TermsPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-wrapper">
      <NavBar />


      {/* Content Section */}
      <main className="info-page-main">
        <article className="info-article">
          <span className="article-eyebrow">Operating Guidelines</span>
          <h1 className="article-title">Terms of Service</h1>
          <p className="article-lead">
            Welcome to Gemini Nexus. By registering an account and using our dashboard, you agree to these operating parameters.
          </p>

          <div className="article-content">
            <h2>1. Service Scope</h2>
            <p>
              Gemini Nexus provides a frontend UI workspace client. We do not provision hosting for artificial intelligence models, 
              nor do we sell API tokens. You are responsible for registering and securing your own developer keys from Google AI Studio.
            </p>

            <h2>2. User Accountability</h2>
            <p>
              You represent and warrant that your use of the client and the prompts submitted to the Gemini models comply with all applicable local, 
              national, and international laws, including Google's generative AI usage policies.
            </p>

            <h2>3. Security & Hashing</h2>
            <p>
              Your credentials are password-hashed and managed directly by Supabase auth instances. You are solely responsible for maintaining 
              the confidentiality of your login credentials and preventing unauthorized workspace access.
            </p>

            <h2>4. No Warranties (As-Is)</h2>
            <p>
              Gemini Nexus is provided "as is" and "as available", without warranty of any kind, express or implied. 
              We do not guarantee that the workspace will operate uninterrupted or error-free at all times.
            </p>

            <h2>5. Limitation of Liability</h2>
            <p>
              In no event shall Gemini Nexus or its contributors be liable for any direct, indirect, incidental, or consequential damages 
              resulting from the use of, or inability to use, our service or API tokens.
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
            <span><span>Gemini Nexus</span></span>
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

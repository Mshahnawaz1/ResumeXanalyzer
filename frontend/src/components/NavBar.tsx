import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

// Document scan icon for brand
const BrandIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" className="nav-logo-svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

export const NavBar: React.FC = () => {
  const { isAuthenticated, user, logout, isMockMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  const handleBrandClick = () => {
    if (isAuthenticated) {
      navigate('/analyze');
    } else {
      navigate('/');
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      {isMockMode && (
        <div className="mock-banner">
          <span>
            <strong>Demo Mode:</strong> Supabase environment variables are not set. Authentication uses a local mock system.
          </span>
        </div>
      )}

      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand" onClick={handleBrandClick}>
            <BrandIcon />
            <span className="brand-name">ResumeXAnalyzer</span>
          </div>

          <div className="nav-links">
            {/* Landing-page section anchors */}
            {!isAuthenticated && currentPath === '/' && (
              <>
                <a href="#how-it-works" className="nav-link-item">How It Works</a>
                <a href="#features" className="nav-link-item">Features</a>
                <a href="#faq" className="nav-link-item">FAQ</a>
              </>
            )}

            {/* General nav when on inner pages */}
            {(isAuthenticated || currentPath !== '/') && (
              <button
                onClick={() => navigate('/')}
                className={`nav-link-item ${currentPath === '/' ? 'active-nav-link' : ''}`}
              >
                Home
              </button>
            )}

            {isAuthenticated && (
              <button
                onClick={() => navigate('/analyze')}
                className={`nav-link-item ${currentPath === '/analyze' ? 'active-nav-link' : ''}`}
              >
                Analyzer
              </button>
            )}

            {/* Auth actions */}
            {isAuthenticated ? (
              <div className="nav-user-area">
                <div className="nav-avatar-badge" title={user?.email}>
                  <div className="avatar-letter">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="nav-user-email">{user?.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="btn-nav-signout"
                  title="Sign Out"
                >
                  <svg className="signout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className={`btn-nav-signin ${currentPath === '/login' ? 'active-nav-link' : ''}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="btn-nav-primary"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const NavBar: React.FC = () => {
  const { isAuthenticated, user, logout, isMockMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  const handleBrandClick = () => {
    if (isAuthenticated) {
      navigate('/chat');
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
            <strong>Demo Mode:</strong> Supabase environment variables are not set. The authentication uses a local mock system.
          </span>
        </div>
      )}

      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand" onClick={handleBrandClick}>
            <svg viewBox="0 0 24 24" className="nav-logo-svg">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="brand-name">Gemini Nexus</span>
          </div>

          <div className="nav-links">
            {/* If on landing and NOT authenticated, show section scrolls */}
            {!isAuthenticated && currentPath === '/' && (
              <>
                <a href="#features" className="nav-link-item">Features</a>
                <a href="#security" className="nav-link-item">Security</a>
                <a href="#faq" className="nav-link-item">FAQ</a>
              </>
            )}

            {/* General Navigation Links */}
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
                onClick={() => navigate('/chat')} 
                className={`nav-link-item ${currentPath === '/chat' ? 'active-nav-link' : ''}`}
              >
                Workspace
              </button>
            )}

            <button 
              onClick={() => navigate('/about')} 
              className={`nav-link-item ${currentPath === '/about' ? 'active-nav-link' : ''}`}
            >
              About
            </button>
            <button 
              onClick={() => navigate('/privacy')} 
              className={`nav-link-item ${currentPath === '/privacy' ? 'active-nav-link' : ''}`}
            >
              Privacy
            </button>
            <button 
              onClick={() => navigate('/terms')} 
              className={`nav-link-item ${currentPath === '/terms' ? 'active-nav-link' : ''}`}
            >
              Terms
            </button>

            {/* Auth Actions on Right */}
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

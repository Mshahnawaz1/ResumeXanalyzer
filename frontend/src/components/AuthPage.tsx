import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const { login, loginWithGithub, register, error, clearError, isMockMode } = useAuth();
  const [isLogin, setIsLogin] = useState<boolean>(initialMode === 'login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync mode with initialMode prop changes
  useEffect(() => {
    setIsLogin(initialMode === 'login');
    clearError();
    setValidationError(null);
    setSuccessMessage(null);
  }, [initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);
    setSuccessMessage(null);

    // Simple client-side validation
    if (!email || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        const msg = await register(email, password);
        setSuccessMessage(msg || 'Registration successful! You can now log in.');
        setIsLogin(true); // Switch to login view on success
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      // Errors are handled by the context and stored in the "error" state
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (isLogin) {
      navigate('/register');
    } else {
      navigate('/login');
    }
  };

  const handleGithubLogin = async () => {
    clearError();
    setValidationError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      await loginWithGithub();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Back to Home Link */}
      <button onClick={() => navigate('/')} className="btn-back-home">
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
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Home
      </button>

      <div className="auth-card">
        {isMockMode && (
          <div className="auth-mock-badge">
            <span>Demo Mode (Local Auth)</span>
          </div>
        )}

        <div className="auth-header">
          <div className="auth-logo">
            <svg viewBox="0 0 24 24" className="logo-svg">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="auth-subtitle">
            {isLogin
              ? 'Enter your details to access the AI Chat dashboard'
              : 'Sign up to start chatting with Gemini AI'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {successMessage && (
            <div className="alert alert-success">
              <span>{successMessage}</span>
            </div>
          )}

          {(error || validationError) && (
            <div className="alert alert-danger">
              <span>{validationError || error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {!isLogin && (
            <div className="form-group animate-slide-down">
              <label htmlFor="auth-confirm-password">Confirm Password</label>
              <input
                id="auth-confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="spinner-container">
                <span className="spinner"></span>
                Processing...
              </span>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        <button
          type="button"
          className="btn btn-github"
          onClick={handleGithubLogin}
          disabled={loading}
        >
          {loading ? (
            <span className="spinner-container">
              <span className="spinner"></span>
              Processing...
            </span>
          ) : (
            <>
              <svg className="github-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </>
          )}
        </button>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              id="auth-toggle-btn"
              type="button"
              className="btn-link"
              onClick={handleToggle}
              disabled={loading}
            >
              {isLogin ? 'Register now' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

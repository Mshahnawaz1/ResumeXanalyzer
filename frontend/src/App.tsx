import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { AuthPage } from './components/AuthPage';
import { AboutPage } from './components/AboutPage';
import { PrivacyPage } from './components/PrivacyPage';
import { TermsPage } from './components/TermsPage';
import { AnalyzeDashboard } from './components/AnalyzeDashboard';
import './App.css';

// Wraps protected routes — redirects to login if not authenticated
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Wraps auth routes — redirects to analyzer if already logged in
const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/analyze" replace /> : <>{children}</>;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/login',
    element: (
      <AuthRoute>
        <AuthPage initialMode="login" />
      </AuthRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <AuthRoute>
        <AuthPage initialMode="register" />
      </AuthRoute>
    ),
  },
  {
    path: '/analyze',
    element: (
      <ProtectedRoute>
        <AnalyzeDashboard />
      </ProtectedRoute>
    ),
  },
  // Legacy /chat redirect for any bookmarks
  {
    path: '/chat',
    element: <Navigate to="/analyze" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

const MainAppContent: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loader">
        <div className="spinner"></div>
        <p>Verifying authentication session…</p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
};

export default App;

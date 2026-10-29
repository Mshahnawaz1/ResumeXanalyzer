import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import './App.css';

// Landing page stays in the main bundle for first paint; everything else
// is split into its own chunk and fetched on navigation.
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const AboutPage = lazy(() => import('./components/AboutPage').then(m => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import('./components/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./components/TermsPage').then(m => ({ default: m.TermsPage })));
const AnalyzeDashboard = lazy(() =>
  import('./components/AnalyzeDashboard').then(m => ({ default: m.AnalyzeDashboard })),
);

const FullPageLoader: React.FC<{ message: string }> = ({ message }) => (
  <div className="app-loader">
    <div className="spinner"></div>
    <p>{message}</p>
  </div>
);

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
    return <FullPageLoader message="Verifying authentication session…" />;
  }

  return (
    <Suspense fallback={<FullPageLoader message="Loading…" />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
};

export default App;

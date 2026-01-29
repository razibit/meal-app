import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AuthPage from './components/auth/AuthPage';
import Layout from './components/layout/Layout';
import { isSupabaseConfigured } from './services/supabase';

// Lazy load route components for code splitting
const Home = lazy(() => import('./pages/Home'));
const Chat = lazy(() => import('./pages/Chat'));
const Preferences = lazy(() => import('./pages/Preferences'));
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'));

// Loading spinner component for Suspense fallback
const LoadingSpinner = () => (
  <div className="min-h-screen bg-bg-primary flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-text-secondary">Loading...</p>
    </div>
  </div>
);

function App() {
  const { user, loading, initialize } = useAuthStore();

  const showConfigError = !isSupabaseConfigured;

  useEffect(() => {
    // Set default theme
    const theme = localStorage.getItem('theme') || 'eggplant';
    document.documentElement.setAttribute('data-theme', theme);

    // Initialize authentication
    if (!showConfigError) {
      initialize();
    }
  }, [initialize, showConfigError]);

  if (showConfigError) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-6 py-10">
        <div className="max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-primary mb-3">Setup Required</h1>
          <p className="text-text-secondary">
            Missing Supabase environment variables. Configure
            <span className="font-semibold"> VITE_SUPABASE_URL </span>
            and
            <span className="font-semibold"> VITE_SUPABASE_ANON_KEY </span>
            in your deployment settings and redeploy.
          </p>
        </div>
      </div>
    );
  }

  // Show loading spinner while initializing
  if (loading) {
    return <LoadingSpinner />;
  }

  // Show auth page if not authenticated
  if (!user) {
    return <AuthPage />;
  }

  // Show main app with routing if authenticated
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="chat" element={<Chat />} />
            <Route path="preferences" element={<Preferences />} />
            <Route path="report" element={<MonthlyReport />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

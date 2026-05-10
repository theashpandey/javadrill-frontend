import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { HelmetProvider } from 'react-helmet-async';
import HomePage      from './pages/HomePage';
import DashboardLayout from './pages/DashboardLayout';
import AdminDashboardLayout from './pages/AdminDashboardLayout';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminFeedbackPage from './pages/AdminFeedbackPage';
import AdminGeminiMonitoringPage from './pages/AdminGeminiMonitoringPage';
import AdminRedeemsPage from './pages/AdminRedeemsPage';
import InterviewPage from './pages/InterviewPage';
import PerformancePage from './pages/PerformancePage';
import HistoryPage   from './pages/HistoryPage';
import ResumePage    from './pages/ResumePage';
import WalletPage    from './pages/WalletPage';
import PrivacyPage   from './pages/PrivacyPage';
import TermsPage     from './pages/TermsPage';
import RefundPage    from './pages/RefundPage';
import SeoLandingPage from './pages/SeoLandingPage';
import { SEO_PAGES } from './data/marketingContent';
import { Spinner } from './components/UI';
import BrandLogo from './components/BrandLogo';

const ADMIN_EMAILS = (process.env.REACT_APP_ADMIN_EMAILS || 'ashish9145826@gmail.com')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

function isAdminUser(user) {
  return Boolean(user?.isAdmin || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())));
}

function AppLoadingScreen() {
  return (
    <div style={{
      minHeight:'100vh',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      background:'var(--bg)',
      padding:'1.5rem',
    }}>
      <div style={{
        display:'flex',
        flexDirection:'column',
        alignItems:'center',
        gap:'1rem',
        textAlign:'center',
      }}>
        <div style={{ marginBottom:'0.25rem' }}>
          <BrandLogo size={38} iconSize={28} style={{ fontSize:'20px' }} />
        </div>
        <Spinner size={36} />
        <div>
          <div style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'0.35rem' }}>Preparing your workspace...</div>
          <div style={{ color:'var(--text3)', fontSize:'12px' }}>Restoring your secure session</div>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, authReady } = useApp();
  if (!authReady) return <AppLoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (isAdminUser(user)) return <Navigate to="/admin/users" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, authReady } = useApp();
  if (!authReady) return <AppLoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return isAdminUser(user) ? children : <Navigate to="/dashboard/interview" replace />;
}

function AppRoutes() {
  const { user, authReady } = useApp();
  if (!authReady) return <AppLoadingScreen />;
  const homeRedirect = isAdminUser(user) ? '/admin/users' : '/dashboard/interview';
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={homeRedirect} replace /> : <HomePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms"   element={<TermsPage />} />
      <Route path="/refund"  element={<RefundPage />} />
      {SEO_PAGES.map(page => (
        <Route path={page.path} element={<SeoLandingPage path={page.path} />} key={page.path} />
      ))}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="interview" replace />} />
        <Route path="interview"   element={<InterviewPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="history"     element={<HistoryPage />} />
        <Route path="resume"      element={<ResumePage />} />
        <Route path="wallet"      element={<WalletPage />} />
      </Route>
      <Route path="/admin" element={<AdminRoute><AdminDashboardLayout /></AdminRoute>}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="dashboard" element={<Navigate to="/admin/users" replace />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="feedback" element={<AdminFeedbackPage />} />
        <Route path="redeems" element={<AdminRedeemsPage />} />
        <Route path="gemini-monitoring" element={<AdminGeminiMonitoringPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    const blockContextMenu = (event) => {
      event.preventDefault();
    };

    const blockInspectShortcuts = (event) => {
      const key = event.key?.toLowerCase();
      const blocked =
        event.key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key)) ||
        (event.ctrlKey && key === 'u') ||
        (event.metaKey && key === 'u');

      if (blocked) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockInspectShortcuts, true);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockInspectShortcuts, true);
    };
  }, []);

  return (
    <HelmetProvider>
      <AppProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </HelmetProvider>
  );
}

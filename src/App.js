import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { HelmetProvider } from 'react-helmet-async';
import HomePage      from './pages/HomePage';
import DashboardLayout from './pages/DashboardLayout';
import InterviewPage from './pages/InterviewPage';
import PerformancePage from './pages/PerformancePage';
import HistoryPage   from './pages/HistoryPage';
import ResumePage    from './pages/ResumePage';
import WalletPage    from './pages/WalletPage';
import PrivacyPage   from './pages/PrivacyPage';
import TermsPage     from './pages/TermsPage';
import RefundPage    from './pages/RefundPage';
import { Spinner } from './components/UI';

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
        <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.25rem' }}>
          <div style={{
            width:38,
            height:38,
            borderRadius:'10px',
            background:'linear-gradient(135deg,#6366f1,#a78bfa)',
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            boxShadow:'0 0 24px rgba(99,102,241,0.35)',
          }}>⚡</div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'20px' }}>
            Java<span style={{ color:'#818cf8' }}>Drill</span>
          </span>
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
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user, authReady } = useApp();
  if (!authReady) return <AppLoadingScreen />;
  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard/interview" replace /> : <HomePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms"   element={<TermsPage />} />
      <Route path="/refund"  element={<RefundPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="interview" replace />} />
        <Route path="interview"   element={<InterviewPage />} />
        <Route path="performance" element={<PerformancePage />} />
        <Route path="history"     element={<HistoryPage />} />
        <Route path="resume"      element={<ResumePage />} />
        <Route path="wallet"      element={<WalletPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  // useEffect(() => {
  //   const blockContextMenu = (event) => {
  //     event.preventDefault();
  //   };

  //   const blockInspectShortcuts = (event) => {
  //     const key = event.key?.toLowerCase();
  //     const blocked =
  //       event.key === 'F12' ||
  //       (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key)) ||
  //       (event.metaKey && event.altKey && ['i', 'j', 'c'].includes(key)) ||
  //       (event.ctrlKey && key === 'u') ||
  //       (event.metaKey && key === 'u');

  //     if (blocked) {
  //       event.preventDefault();
  //       event.stopPropagation();
  //     }
  //   };

  //   document.addEventListener('contextmenu', blockContextMenu);
  //   document.addEventListener('keydown', blockInspectShortcuts, true);

  //   return () => {
  //     document.removeEventListener('contextmenu', blockContextMenu);
  //     document.removeEventListener('keydown', blockInspectShortcuts, true);
  //   };
  // }, []);

  return (
    <HelmetProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </HelmetProvider>
  );
}

import React from 'react';
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

function ProtectedRoute({ children }) {
  const { user, authReady } = useApp();
  if (!authReady) return null;
  return user ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user, authReady } = useApp();
  if (!authReady) return null;
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

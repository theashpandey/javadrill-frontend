import React from 'react';
import DashboardLayout from './DashboardLayout';

const ADMIN_NAV = [
  { path:'users', icon:'👥', label:'Users', desc:'Growth and activity' },
  { path:'feedback', icon:'💬', label:'Feedback', desc:'Messages and contacts' },
  { path:'gemini-monitoring', icon:'⚙', label:'Gemini', desc:'API usage and health' },
];

export default function AdminDashboardLayout() {
  return (
    <DashboardLayout
      navItems={ADMIN_NAV}
      basePath="/admin"
      sectionLabel="Admin"
      badgeLabel="Admin Panel"
      showWallet={false}
      showFeedbackButton={false}
      maxWidth={1120}
    />
  );
}

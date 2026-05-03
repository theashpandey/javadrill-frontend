import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to="/" style={{ color: '#818cf8', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}>← Back to Home</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '2rem' }}>Last updated: January 2025</p>
        {[
          ['Information We Collect', 'We collect your name, email address, and profile photo through Google Sign-In. We also store your resume text (which you upload), interview recordings (transcribed text only — no audio is stored), and performance analytics from your sessions.'],
          ['How We Use Your Data', 'Your resume and interview data is used solely to generate personalized interview questions and performance analysis through Google Gemini AI. We do not sell your data to third parties. Your data is used to improve your interview performance only.'],
          ['Data Storage', 'All user data is stored securely in our MongoDB database hosted on cloud infrastructure. Resume text and interview history are associated with your Firebase account UID.'],
          ['AI Processing', 'Your resume and answer transcripts are sent to Google Gemini API for question generation and analysis. Google\'s data usage policies apply for these requests. We do not store raw audio — only the text transcriptions.'],
          ['Payments', 'Payment processing is handled by Razorpay. We do not store your card details. Transaction records (credits purchased, amounts) are stored for wallet management.'],
          ['Data Deletion', 'You can delete your account and all associated data by emailing us. We will process deletion requests within 7 business days.'],
          ['Cookies', 'We use Firebase Authentication cookies to keep you signed in. We do not use tracking or advertising cookies.'],
          ['Contact', 'For privacy concerns, contact us through the Contact Us form on our homepage. We take privacy seriously and respond within 24 hours.'],
        ].map(([title, body]) => (
          <div key={title} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '0.75rem', color: '#818cf8' }}>{title}</h2>
            <p style={{ color: 'var(--text2)', lineHeight: 1.8, fontSize: '14.5px' }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SECTIONS = [
  ['Information We Collect', 'We collect your name, email address, and profile photo through Google Sign-In or email/password authentication. Email/password accounts use a default AssessArc avatar. We also store resume text that you upload, interview answer transcripts, feedback, wallet transaction records, and performance analytics from your sessions. We do not store raw audio.'],
  ['How We Use Your Data', 'Your resume and interview data is used to generate personalized interview questions, live feedback, scoring, and performance analysis. We do not sell your personal data to third parties.'],
  ['Data Storage', 'User profile, wallet, resume text, interview history, feedback, and contact records are stored in Google Firestore and associated with your Firebase account UID.'],
  ['AI Processing', 'Your resume and answer transcripts may be sent to Google Gemini API for question generation, feedback, scoring, and analysis. Google API processing policies apply to these requests.'],
  ['Payments', 'Payment processing is handled by Razorpay. We do not store your card, UPI, or net banking details. We store payment IDs, order IDs, credit amounts, and wallet balances for billing and support.'],
  ['Data Deletion', 'You can request deletion of your account data by contacting us through the Contact form on the homepage. We will process valid deletion requests within 7 business days.'],
  ['Cookies and Local Storage', 'We use Firebase Authentication persistence to keep you signed in and local storage for referral tracking. We do not use advertising cookies.'],
  ['Contact', 'For privacy concerns, contact us through the Contact form on the homepage.'],
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'clamp(1rem, 4vw, 2rem)' }}>
      <Helmet>
        <title>Privacy Policy | AssessArc</title>
        <meta name="description" content="Read how AssessArc handles sign-in data, resumes, interview transcripts, AI processing, payments, and deletion requests." />
        <link rel="canonical" href="https://assessarc.app/privacy" />
      </Helmet>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <Link to="/" style={{ color:'#818cf8', fontSize:'14px', display:'inline-flex', alignItems:'center', gap:'0.4rem', marginBottom:'2rem' }}>← Back to Home</Link>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:800, marginBottom:'0.5rem' }}>Privacy Policy</h1>
        <p style={{ color:'var(--text3)', fontSize:'13px', marginBottom:'2rem' }}>Last updated: May 2026</p>
        {SECTIONS.map(([title, body]) => (
          <section key={title} style={{ marginBottom:'2rem' }}>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, marginBottom:'0.75rem', color:'#818cf8' }}>{title}</h2>
            <p style={{ color:'var(--text2)', lineHeight:1.8, fontSize:'14.5px' }}>{body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

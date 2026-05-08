import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SECTIONS = [
  ['Acceptance of Terms', 'By using JavaDrill, you agree to these terms. JavaDrill is an AI-powered interview preparation platform. Use of the platform is subject to these terms and our Privacy Policy.'],
  ['Service Description', 'JavaDrill provides AI-powered role-based mock interviews using voice recognition and AI language models. The service is for educational and practice purposes only. We do not guarantee job placement or interview success.'],
  ['User Accounts', 'You must use a Google account or email/password account to access protected features. You are responsible for maintaining the security of your account and must not share your account with others.'],
  ['Credits and Payments', 'Credits are purchased through Razorpay and are non-transferable. Credits are deducted when an interview session starts. See our Refund Policy for unused credits and technical issue cases.'],
  ['Acceptable Use', 'You may not use JavaDrill to generate harmful content, abuse the platform, attempt to bypass payment or authentication, reverse-engineer the service, or violate applicable laws.'],
  ['AI Output', 'AI-generated questions, feedback, scores, and analysis may be imperfect. You should use them as practice guidance, not as professional hiring advice or guaranteed evaluation.'],
  ['Limitation of Liability', 'JavaDrill is provided as is. We are not liable for interview outcomes, job results, provider outages, browser microphone issues, or indirect damages arising from use of the platform.'],
  ['Changes to Terms', 'We may update these terms. Continued use of JavaDrill after changes constitutes acceptance of the updated terms.'],
];

export default function TermsPage() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'clamp(1rem, 4vw, 2rem)' }}>
      <Helmet>
        <title>Terms of Service | JavaDrill</title>
        <meta name="description" content="Read the JavaDrill terms for accounts, credits, payments, acceptable use, educational interview practice, and limitations." />
        <link rel="canonical" href="https://javadrill.app/terms" />
      </Helmet>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <Link to="/" style={{ color:'#818cf8', fontSize:'14px', display:'inline-flex', alignItems:'center', gap:'0.4rem', marginBottom:'2rem' }}>← Back to Home</Link>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:800, marginBottom:'0.5rem' }}>Terms of Service</h1>
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

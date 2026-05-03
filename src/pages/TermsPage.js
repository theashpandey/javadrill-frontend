import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to="/" style={{ color: '#818cf8', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}>← Back to Home</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Terms of Service</h1>
        <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '2rem' }}>Last updated: January 2025</p>
        {[
          ['Acceptance of Terms', 'By using JavaDrill, you agree to these terms. JavaDrill is an AI-powered interview preparation platform. Use of the platform is subject to these terms and our Privacy Policy.'],
          ['Service Description', 'JavaDrill provides AI-powered mock Java technical interviews using voice recognition and AI language models. The service is for educational and practice purposes only. We do not guarantee job placement or interview success.'],
          ['User Accounts', 'You must have a Google account to use JavaDrill. You are responsible for maintaining the security of your account. You must not share your account or use another person\'s account.'],
          ['Credits and Payments', 'Credits are purchased through Razorpay and are non-transferable. Credits deducted from your wallet for starting an interview session are non-refundable once the session has started. See our Refund Policy for unused credits.'],
          ['Acceptable Use', 'You may not use JavaDrill to generate harmful content, attempt to reverse-engineer our AI systems, abuse the platform in any way, or violate any applicable laws. We reserve the right to terminate accounts for violations.'],
          ['Intellectual Property', 'The JavaDrill platform, branding, and AI systems are our intellectual property. Questions generated during your sessions are based on publicly available Java interview knowledge.'],
          ['Limitation of Liability', 'JavaDrill is provided "as is." We are not liable for interview outcomes, job results, or any indirect damages arising from use of our platform. Our liability is limited to the amount of credits in your account.'],
          ['Changes to Terms', 'We may update these terms. Continued use of JavaDrill after changes constitutes acceptance of the new terms. We will notify users of significant changes.'],
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

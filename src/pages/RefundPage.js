import React from 'react';
import { Link } from 'react-router-dom';

export default function RefundPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <Link to="/" style={{ color: '#818cf8', fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}>← Back to Home</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Refund Policy</h1>
        <p style={{ color: 'var(--text3)', fontSize: '13px', marginBottom: '2rem' }}>Last updated: January 2025</p>
        {[
          ['Overview', 'JavaDrill uses a credit-based system. Credits are purchased through Razorpay and are used to start interview sessions. We want you to be satisfied with your purchase.'],
          ['Refund Eligibility', 'You are eligible for a full refund of unused credits within 24 hours of purchase. If you have not used any credits from a purchase, you can request a full refund. Credits already used for completed interview sessions are non-refundable.'],
          ['Partial Refunds', 'If you have used some credits from a pack, we will refund the value of unused credits only. The value of used credits (₹0.50/credit for Starter, ₹0.40/credit for Pro, ₹0.33/credit for Elite) will be deducted.'],
          ['How to Request a Refund', 'Contact us through the Contact Us form on our homepage within 24 hours of your purchase. Include your email address and the amount/date of purchase. We will process your refund within 7 business days back to your original payment method.'],
          ['Technical Issues', 'If you experienced a technical issue during an interview session (e.g., session crashed, AI failed to respond) and credits were deducted, contact us immediately. We will review and restore credits where appropriate.'],
          ['Signup Bonus Credits', 'The 50 free credits given on signup are not refundable as they were not purchased.'],
          ['No Refunds After 24 Hours', 'After 24 hours from purchase, credits are non-refundable regardless of usage. We encourage you to try the free credits before purchasing to ensure the platform works well for you.'],
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

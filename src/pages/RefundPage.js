import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SECTIONS = [
  ['Overview', 'JavaDrill uses a credit-based system. Credits are purchased through Razorpay and used to start interview sessions.'],
  ['Refund Eligibility', 'You are eligible for a full refund of unused purchased credits within 24 hours of purchase if no credits from that purchase have been used.'],
  ['Partial Refunds', 'If you have used some credits from a pack, we may refund the value of unused credits only. Used credits are non-refundable.'],
  ['How to Request a Refund', 'Contact us through the Contact form on the homepage within 24 hours of purchase. Include your JavaDrill account email, payment date, amount, and Razorpay payment ID if available.'],
  ['Technical Issues', 'If a technical issue prevents an interview from working after credits were deducted, contact us. We will review the case and restore credits or refund where appropriate.'],
  ['Signup Bonus Credits', 'The 10 free credits given on signup are promotional credits and are not refundable.'],
  ['Processing Time', 'Approved refunds are processed back to the original payment method within 7 business days, subject to Razorpay and banking timelines.'],
];

export default function RefundPage() {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', padding:'clamp(1rem, 4vw, 2rem)' }}>
      <Helmet>
        <title>Refund Policy | JavaDrill</title>
        <meta name="description" content="Read JavaDrill's refund policy for unused credits, partial refunds, technical issues, and signup bonus credits." />
        <link rel="canonical" href="https://javadrill.app/refund" />
      </Helmet>
      <div style={{ maxWidth:760, margin:'0 auto' }}>
        <Link to="/" style={{ color:'#818cf8', fontSize:'14px', display:'inline-flex', alignItems:'center', gap:'0.4rem', marginBottom:'2rem' }}>← Back to Home</Link>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', fontWeight:800, marginBottom:'0.5rem' }}>Refund Policy</h1>
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

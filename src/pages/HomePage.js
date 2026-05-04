import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { Spinner } from '../components/UI';

const API = process.env.REACT_APP_API_URL || 'https://javadrill.onrender.com';

const FEATURES = [
  { icon:'🎤', title:'Live Voice Interview', desc:'Sarah asks questions out loud, listens to your answer, and keeps the flow moving like a real interviewer.', stat:'Voice-first' },
  { icon:'📄', title:'Resume-Based Questions', desc:'Your resume shapes the questions, so practice matches your skills, projects, and real experience.', stat:'Personalized' },
  { icon:'🧠', title:'Human-Style Feedback', desc:'Get short, useful feedback after every answer with one clear strength and one improvement point.', stat:'Instant' },
  { icon:'📈', title:'Performance Analytics', desc:'Track technical depth, communication, Java fundamentals, problem solving, and category trends.', stat:'Actionable' },
  { icon:'🔁', title:'No Repeat Practice', desc:'Seen questions are tracked so every session feels fresh and closer to an actual interview loop.', stat:'Fresh sets' },
  { icon:'💳', title:'Pay Per Session', desc:'No subscription pressure. Start free, then pay only when you want more practice credits.', stat:'Simple' },
];

const STEPS = [
  ['01', 'Sign in', 'Use Google login and get free starting credits.'],
  ['02', 'Upload resume', 'Sarah reads your Java background and projects.'],
  ['03', 'Start mock', 'Pick a 30 or 60 minute voice session.'],
  ['04', 'Improve', 'Review feedback, scores, history, and trends.'],
];

const PLANS = [
  { name:'Free', price:'₹0', desc:'10 credits on signup', tag:'Try it', features:['1 full 60-min session','Resume upload','Interview report'] },
  { name:'Starter', price:'₹24', desc:'25 credits', tag:'Warm up', features:['2-3 sessions','History access','AI feedback'] },
  { name:'Pro', price:'₹45', desc:'50 credits', tag:'Popular', featured:true, features:['5 sessions','Deep analysis','Category trends'] },
  { name:'Elite', price:'₹80', desc:'100 credits', tag:'Best value', features:['10 sessions','Full dashboard','Long-term tracking'] },
];

const FAQS = [
  ['How does JavaDrill work?', 'Choose a session, listen to Sarah AI, answer by voice, then get feedback and scores after the interview.'],
  ['Does it use my resume?', 'Yes. Your resume helps generate questions that match your actual Java, Spring Boot, project, and experience profile.'],
  ['Will it understand Indian English?', 'The speech recognition is configured for Indian English and works best in Chrome or Edge with a clear microphone.'],
  ['Do questions repeat?', 'The system tracks seen bank questions and avoids repeating them in later sessions.'],
  ['How do payments work?', 'Credits are added only after Razorpay payment verification. You pay per credit pack, not by subscription.'],
];

export default function HomePage() {
  const { signIn, loading } = useApp();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [contactForm, setContactForm] = useState({ name:'', email:'', message:'' });
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('javadrill_referral_code', ref.trim().toUpperCase());
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try { await signIn(); }
    catch { setError('Sign-in failed. Please try again.'); }
    finally { setSigningIn(false); }
  };

  const sendContact = async () => {
    if (!contactForm.message.trim()) {
      setContactError('Please enter a message.');
      return;
    }
    setContactSending(true);
    setContactError('');
    try {
      const res = await fetch(`${API}/api/contact`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) throw new Error('Failed');
      setContactDone(true);
    } catch {
      setContactError('Failed to send. Please try again.');
    } finally {
      setContactSending(false);
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'JavaDrill',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description: 'AI-powered Java mock interview platform with voice interviews, resume-tailored questions, and performance analytics.',
    offers: { '@type': 'Offer', price: '5', priceCurrency: 'INR' },
  };

  return (
    <>
      <Helmet>
        <title>JavaDrill | AI Java Mock Interviews with Voice Feedback</title>
        <meta name="description" content="Practice Java interviews with Sarah AI. Voice-based mock interviews, resume-tailored questions, instant feedback, history, and performance analytics." />
        <meta name="keywords" content="Java mock interview, Spring Boot interview practice, AI interview coach, Java interview questions, voice mock interview India" />
        <meta property="og:title" content="JavaDrill | AI Java Mock Interviews" />
        <meta property="og:description" content="Practice real Java interviews by voice with resume-tailored questions and instant AI feedback." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://javadrill.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://javadrill.app" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="home-page">
        <header className="home-nav">
          <a href="/" className="home-brand" aria-label="JavaDrill home">
            <div><div className="home-logo">⚡</div>
          
        <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'17px' , marginLeft:'10px'}}>Java<span style={{ color:'#818cf8' }}>Drill</span></span>
       </div>
          </a>
          <nav className="home-nav-links" aria-label="Primary navigation">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button className="home-nav-cta" onClick={handleSignIn} disabled={signingIn || loading}>
            {signingIn ? 'Signing in...' : 'Start Free'}
          </button>
        </header>

        <main>
          <section className="home-hero">
            <div className="home-hero-copy">
              <div className="home-eyebrow">AI-powered Java interview practice</div>
              <h1>JavaDrill</h1>
              <p className="home-hero-subtitle">
               Practice real Java interview questions, speak your answers, and get instant feedback on clarity, depth, and confidence — just like a real interviewer.
 </p>
              {error && <div className="home-error">{error}</div>}
              <div className="home-hero-actions">
                <button className="home-primary-btn" onClick={handleSignIn} disabled={signingIn || loading}>
                  {signingIn ? <><Spinner size={17} color="white" /> Signing in</> : 'Start free with 10 credits'}
                </button>
                <a className="home-secondary-btn" href="#features">Explore features</a>
              </div>
              <div className="home-proof-row" aria-label="Platform highlights">
                <span>🎤 Voice-based interviews</span>
                <span>📄 Resume-based questions</span>
                <span>⚡ Instant AI feedback</span>
              </div>
            </div>

            <div className="home-product-preview" aria-label="JavaDrill interview product preview">
              <div className="preview-topbar">
                <span></span><span></span><span></span>
                <strong>Interview Room</strong>
              </div>
              <div className="preview-interviewer">
                <div className="preview-avatar">S</div>
                <div>
                  <div className="preview-label">Sarah AI is speaking</div>
                  <p>Can you explain how you would handle concurrent access in a Spring Boot service?</p>
                </div>
              </div>
              <div className="preview-wave">
                {[1,2,3,4,5,6,7,8,9,10].map(i => <i key={i} style={{ height: `${18 + (i % 4) * 12}px` }} />)}
              </div>
              <div className="preview-grid">
                <div><small>Overall</small><b>82</b></div>
                <div><small>Technical</small><b>78</b></div>
                <div><small>Clarity</small><b>86</b></div>
              </div>
              <div className="preview-feedback">
                <span>Feedback</span>
                <p>Strong structure. Add one concrete example and compare tradeoffs before moving on.</p>
              </div>
            </div>
          </section>

          <section id="features" className="home-section">
            <div className="home-section-heading">
              <span>Feature Set</span>
              <h2>Built around the real interview loop</h2>
              <p>Everything is designed for repeated practice: ask, answer, feedback, analyse, repeat.</p>
            </div>
            <div className="home-feature-grid">
              {FEATURES.map(feature => (
                <article className="home-feature-card" key={feature.title}>
                  <div className="home-feature-icon">{feature.icon}</div>
                  <div className="home-feature-stat">{feature.stat}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="workflow" className="home-section home-workflow">
            <div className="home-section-heading">
              <span>Workflow</span>
              <h2>From resume to better answers</h2>
            </div>
            <div className="home-step-grid">
              {STEPS.map(([num, title, desc]) => (
                <article className="home-step-card" key={num}>
                  <b>{num}</b>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="pricing" className="home-section">
            <div className="home-section-heading">
              <span>Pricing</span>
              <h2>Simple credits. No monthly lock-in.</h2>
              <p>30 minute sessions use 5 credits. 60 minute sessions use 10 credits.</p>
            </div>
            <div className="home-pricing-grid">
              {PLANS.map(plan => (
                <article className={`home-plan-card ${plan.featured ? 'is-featured' : ''}`} key={plan.name}>
                  <div className="home-plan-tag">{plan.tag}</div>
                  <h3>{plan.name}</h3>
                  <div className="home-plan-price">{plan.price}</div>
                  <p>{plan.desc}</p>
                  <ul>
                    {plan.features.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section id="faq" className="home-section home-faq">
            <div className="home-section-heading">
              <span>FAQ</span>
              <h2>Good questions before the real questions</h2>
            </div>
            <div className="home-faq-list">
              {FAQS.map(([q, a]) => <FAQItem q={q} a={a} key={q} />)}
            </div>
          </section>

          <section id="contact" className="home-section home-contact">
            <div className="home-contact-copy">
              <span>Contact</span>
              <h2>Need help with interviews, credits, or feedback?</h2>
              <p>Send a message and we will get back to you. Payment issues should include your email and payment ID.</p>
            </div>
            {contactDone ? (
              <div className="home-contact-done">
                <b>Message received</b>
                <p>Thanks. We will get back to you soon.</p>
              </div>
            ) : (
              <div className="home-contact-form">
                <input placeholder="Your name" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name:e.target.value }))} />
                <input placeholder="Email address" type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email:e.target.value }))} />
                <textarea placeholder="Your message" rows={4} value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message:e.target.value }))} />
                {contactError && <div className="home-error">{contactError}</div>}
                <button className="home-primary-btn" onClick={sendContact} disabled={contactSending}>
                  {contactSending ? 'Sending...' : 'Send message'}
                </button>
              </div>
            )}
          </section>
        </main>

        <footer className="home-footer">
          <div className="home-brand">
            <span className="home-logo">⚡</span>
            <span>Java<span>Drill</span></span>
          </div>
          <div>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refund">Refund</a>
            <a href="#contact">Contact</a>
          </div>
        </footer>
      </div>
    </>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="home-faq-item">
      <button onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <b>{open ? '-' : '+'}</b>
      </button>
      {open && <p>{a}</p>}
    </article>
  );
}

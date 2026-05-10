import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useApp } from '../context/AppContext';
import { Spinner } from '../components/UI';
import BrandLogo from '../components/BrandLogo';

const API = process.env.REACT_APP_API_URL || 'https://assessarcapp.onrender.com';
const REFERRAL_STORAGE_KEY = 'assessarc_referral_code';

const FEATURES = [
  { icon:'🎤', title:'Live Voice Interview', desc:'Sarah asks questions out loud, listens to your answer, and keeps the flow moving like a real interviewer.', stat:'Voice-first' },
  { icon:'📄', title:'Resume-Based Questions', desc:'Your resume shapes the questions, so practice matches your skills, projects, and real experience.', stat:'Personalized' },
  { icon:'🧠', title:'Human-Style Feedback', desc:'Get short, useful feedback after every answer with one clear strength and one improvement point.', stat:'Instant' },
  { icon:'📈', title:'Performance Analytics', desc:'Track communication, problem solving, role-specific depth, and dynamic category trends.', stat:'Actionable' },
  { icon:'🔁', title:'No Repeat Practice', desc:'Seen questions are tracked so every session feels fresh and closer to an actual interview loop.', stat:'Fresh sets' },
  { icon:'💳', title:'Pay Per Session', desc:'No subscription pressure. Start free, then pay only when you want more practice credits.', stat:'Simple' },
];

const STEPS = [
  ['01', 'Sign in', 'Use Google or email login and get free starting credits.'],
  ['02', 'Upload resume', 'Sarah reads your role, experience, skills, and projects.'],
  ['03', 'Start mock', 'Pick a 30 or 60 minute voice session.'],
  ['04', 'Improve', 'Review feedback, scores, history, and trends.'],
];

const PLANS = [
  { name:'Free', price:'₹0', desc:'10 credits on signup', tag:'Try it', features:['1 full 60-min session','Resume upload','Interview report'] },
  { name:'Starter', price:'₹29', desc:'35 credits', tag:'+5 bonus', features:['3-7 sessions','History access','AI feedback'] },
  { name:'Pro', price:'₹59', desc:'70 credits', tag:'+10 bonus', featured:true, features:['7-14 sessions','Deep analysis','Category trends'] },
  { name:'Elite', price:'₹99', desc:'115 credits', tag:'+15 bonus', features:['11-23 sessions','Full dashboard','Long-term tracking'] },
  { name:'Titan', price:'₹199', desc:'220 credits', tag:'+20 bonus', features:['22-44 sessions','Long-term tracking','Best value'] },
];

const FAQS = [
  ['How does AssessArc work?', 'Choose a session, listen to Sarah AI, answer by voice, then get feedback and scores after the interview.'],
  ['Does it use my resume?', 'Yes. Your resume helps generate questions that match your actual role, tech stack, projects, and experience profile.'],
  ['Will it understand Indian English?', 'The speech recognition is configured for Indian English and works best in Chrome or Edge with a clear microphone.'],
  ['Do questions repeat?', 'The system tracks seen bank questions and avoids repeating them in later sessions.'],
  ['How do payments work?', 'Credits are added only after Razorpay payment verification. You pay per credit pack, not by subscription.'],
];

const EMPTY_AUTH_FORM = { name:'', email:'', password:'' };

export default function HomePage() {
  const { signIn, authenticateWithEmail, loading } = useApp();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState(EMPTY_AUTH_FORM);
  const [contactForm, setContactForm] = useState({ name:'', email:'', message:'' });
  const [contactSending, setContactSending] = useState(false);
  const [contactDone, setContactDone] = useState(false);
  const [contactError, setContactError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem(REFERRAL_STORAGE_KEY, ref.trim().toUpperCase());
  }, []);

  const openAuth = (mode = 'signin') => {
    setAuthMode(mode);
    setError('');
    setAuthForm(EMPTY_AUTH_FORM);
    setAuthOpen(true);
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setError('');
    setAuthForm(EMPTY_AUTH_FORM);
  };

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setError('');
    try { await signIn(); }
    catch (err) {
      const code = err?.code || '';
      if (code.includes('account-exists-with-different-credential')) {
        setError('This email already has a password login. Sign in with email once, then use Continue with Google to link both methods.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    }
    finally { setSigningIn(false); }
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    if (authMode === 'signup' && !authForm.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!authForm.email.trim() || !authForm.password) {
      setError('Please enter your email and password.');
      return;
    }
    setSigningIn(true);
    setError('');
    try {
      await authenticateWithEmail({ mode: authMode, ...authForm });
    } catch (err) {
      const code = err?.code || '';
      if (code.includes('email-already-in-use')) setError('This email is already registered. Please sign in.');
      else if (code.includes('invalid-credential') || code.includes('wrong-password')) setError('Email or password is incorrect.');
      else if (code.includes('weak-password')) setError('Password should be at least 6 characters.');
      else setError('Authentication failed. Please try again.');
    } finally {
      setSigningIn(false);
    }
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
    name: 'AssessArc',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description: 'AI-powered role-based mock interview platform with voice interviews, resume-tailored questions, and performance analytics.',
    offers: { '@type': 'Offer', price: '5', priceCurrency: 'INR' },
  };

  return (
    <>
      <Helmet>
        <title>AssessArc | AI Mock Interviews for Engineers, Data, HR and Managers</title>
        <meta name="description" content="Practice role-based interviews with Sarah AI. Voice mock interviews for Java, Python, React, full stack, backend, data science, HR, architect, manager and more." />
        <meta name="keywords" content="AI mock interview, Java interview practice, Python mock interview, React interview practice, data science interview, HR interview practice, voice mock interview India" />
        <meta property="og:title" content="AssessArc | AI Role-Based Mock Interviews" />
        <meta property="og:description" content="Practice real interviews by voice with resume-tailored questions and dynamic performance analytics." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.assessarc.com" />
        <meta name="twitter:card" content="summary" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.assessarc.com" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="home-page">
        <header className="home-nav">
          <a href="/" className="home-brand" aria-label="AssessArc home">
            <BrandLogo size={34} iconSize={26} style={{ fontSize:'20px' }} />
          </a>
          <nav className="home-nav-links" aria-label="Primary navigation">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button className="home-nav-cta" onClick={() => openAuth('signup')} disabled={signingIn || loading}>
            Start Free
          </button>
        </header>

        <main>
          <section className="home-hero">
            <div className="home-hero-copy">
              <div className="home-eyebrow">AI-powered role-based interview practice</div>
              <h1>AssessArc</h1>
              <p className="home-hero-subtitle">
               Practice real interview questions for engineering, data, HR, architecture, and manager roles, then get instant feedback on clarity, depth, and confidence — just like a real interviewer.
 </p>
              {error && <div className="home-error">{error}</div>}
              <div className="home-hero-actions">
                <button className="home-primary-btn" onClick={() => openAuth('signup')} disabled={signingIn || loading}>
                  Start free with 10 credits
                </button>
                <a className="home-secondary-btn" href="#features">Explore features</a>
              </div>
              <div className="home-proof-row" aria-label="Platform highlights">
                <span>🎤 Voice-based interviews</span>
                <span>📄 Resume-based questions</span>
                <span>⚡ Instant AI feedback</span>
              </div>
            </div>

            <div className="home-product-preview" aria-label="AssessArc interview product preview">
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
            <BrandLogo size={34} iconSize={26} />
          </div>
          <div>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/refund">Refund</a>
            <a href="#contact">Contact</a>
          </div>
        </footer>
        {authOpen && (
          <div className="auth-modal-shell" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="auth-modal-backdrop" aria-label="Close authentication" onClick={closeAuth} />
            <div className="auth-modal">
              <button className="auth-close" aria-label="Close" onClick={closeAuth}>x</button>
              <div className="auth-modal-brand">
                <BrandLogo size={42} iconSize={30} label={false} />
                <div>
                  <b id="auth-title">{authMode === 'signup' ? 'Create your account' : 'Welcome back'}</b>
                  <p>{authMode === 'signup' ? 'Start with free interview credits.' : 'Continue your practice dashboard.'}</p>
                </div>
              </div>

              <div className="auth-switch" role="tablist" aria-label="Authentication mode">
                <button type="button" className={authMode === 'signup' ? 'active' : ''} aria-selected={authMode === 'signup'} onClick={() => { setAuthMode('signup'); setError(''); setAuthForm(EMPTY_AUTH_FORM); }}>Sign up</button>
                <button type="button" className={authMode === 'signin' ? 'active' : ''} aria-selected={authMode === 'signin'} onClick={() => { setAuthMode('signin'); setError(''); setAuthForm(EMPTY_AUTH_FORM); }}>Sign in</button>
              </div>

              <form className="auth-form" onSubmit={handleEmailAuth}>
                {authMode === 'signup' && (
                  <label>
                    <span>Full name</span>
                    <input
                      autoComplete="name"
                      placeholder="Enter full name"
                      value={authForm.name}
                      onChange={e => setAuthForm(p => ({ ...p, name:e.target.value }))}
                    />
                  </label>
                )}
                <label>
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    type="email"
                    placeholder="you@example.com"
                    value={authForm.email}
                    onChange={e => setAuthForm(p => ({ ...p, email:e.target.value }))}
                  />
                </label>
                <label>
                  <span>Password</span>
                  <input
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={authForm.password}
                    onChange={e => setAuthForm(p => ({ ...p, password:e.target.value }))}
                  />
                </label>

                {error && <div className="home-error auth-error">{error}</div>}

                <button className="home-primary-btn auth-submit" type="submit" disabled={signingIn || loading}>
                  {signingIn || loading ? <><Spinner size={17} color="white" /> Please wait</> : (authMode === 'signup' ? 'Create account' : 'Sign in')}
                </button>
              </form>

              <div className="auth-divider"><span>or</span></div>
              <button className="auth-google-btn" onClick={handleGoogleSignIn} disabled={signingIn || loading}>
                <span>G</span>
                Continue with Google
              </button>
            </div>
          </div>
        )}
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

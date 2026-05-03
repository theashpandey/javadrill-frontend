import React, { useState } from 'react';
import { apiCall } from '../utils/api';
import { Button, Spinner } from './UI';

export default function FeedbackWidget({ onClose }) {
  const [msg,    setMsg]    = useState('');
  const [rating, setRating] = useState(0);
  const [type,   setType]   = useState('general');
  const [sending, setSending] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState('');

  const send = async () => {
    if (!msg.trim()) { setError('Please enter a message.'); return; }
    setSending(true); setError('');
    try {
      await apiCall('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({ message: msg.trim(), rating: rating || null, type }),
      });
      setDone(true);
    } catch (e) {
      setError(e.message || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
      <div style={{ background:'#14142a', border:'1px solid rgba(99,102,241,0.35)', borderRadius:'20px', padding:'2rem', width:'100%', maxWidth:420, boxShadow:'0 40px 80px rgba(0,0,0,0.6)', animation:'slide-up 0.3s ease', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:'1rem', right:'1rem', background:'transparent', border:'none', color:'var(--text3)', fontSize:'18px', cursor:'pointer', lineHeight:1 }}>✕</button>

        {done ? (
          <div style={{ textAlign:'center', padding:'1rem 0' }}>
            <div style={{ fontSize:'48px', marginBottom:'0.75rem' }}>🙏</div>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:700, marginBottom:'0.5rem' }}>Thank you!</h3>
            <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'1.5rem' }}>Your feedback means a lot and helps us improve JavaDrill.</p>
            <Button onClick={onClose} variant="primary" style={{ width:'100%' }}>Close</Button>
          </div>
        ) : (
          <>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:700, marginBottom:'0.35rem' }}>Send Feedback</h3>
            <p style={{ color:'var(--text2)', fontSize:'13px', marginBottom:'1.5rem' }}>Help us improve your interview experience.</p>

            {/* Type */}
            <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1rem', flexWrap:'wrap' }}>
              {[['general','💬 General'],['bug','🐛 Bug'],['feature','✨ Feature']].map(([v,l]) => (
                <button key={v} onClick={() => setType(v)} style={{ padding:'0.4rem 0.9rem', borderRadius:'8px', border: type===v?'1px solid #6366f1':'1px solid rgba(255,255,255,0.08)', background:type===v?'rgba(99,102,241,0.15)':'transparent', color:type===v?'#818cf8':'var(--text3)', fontSize:'12px', cursor:'pointer', transition:'all 0.2s' }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Stars */}
            <div style={{ marginBottom:'1rem' }}>
              <div style={{ fontSize:'12px', color:'var(--text3)', marginBottom:'0.4rem' }}>Rating (optional)</div>
              <div style={{ display:'flex', gap:'0.35rem' }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRating(n===rating?0:n)} style={{ background:'transparent', border:'none', fontSize:'24px', cursor:'pointer', transition:'transform 0.15s', transform:n<=rating?'scale(1.15)':'scale(1)' }}>
                    {n <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder="Tell us what you think, what's broken, or what you'd love to see..."
              rows={4}
              style={{ width:'100%', resize:'vertical', marginBottom:'1rem', fontFamily:'var(--font-body)' }}
            />

            {error && <div style={{ color:'#ef4444', fontSize:'12px', marginBottom:'0.75rem' }}>{error}</div>}

            <Button onClick={send} disabled={sending} style={{ width:'100%' }} variant="primary">
              {sending ? <><Spinner size={16} color="white" /> Sending...</> : '📨 Send Feedback'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

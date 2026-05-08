import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Badge, Card, EmptyState, Spinner } from '../components/UI';

export default function AdminFeedbackPage() {
  const [tab, setTab] = useState('feedback');
  const [feedback, setFeedback] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [feedbackData, contactData] = await Promise.all([
        apiCall('/api/admin/feedback'),
        apiCall('/api/admin/contacts'),
      ]);
      setFeedback(feedbackData || []);
      setContacts(contactData || []);
    } catch (e) {
      setError(e.message || 'Could not load feedback.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const items = tab === 'feedback' ? feedback : contacts;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem', maxWidth:920 }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap', alignItems:'flex-start' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Feedback</h2>
          <p style={{ color:'var(--text2)', fontSize:'14px' }}>Read user feedback and public contact messages from one admin view.</p>
        </div>
        <button onClick={load} disabled={loading} style={buttonStyle}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>

      <div style={{ display:'flex', gap:'0.5rem', borderBottom:'1px solid var(--border2)' }}>
        <TabButton active={tab === 'feedback'} onClick={() => setTab('feedback')}>Feedback <Badge color="#818cf8">{feedback.length}</Badge></TabButton>
        <TabButton active={tab === 'contacts'} onClick={() => setTab('contacts')}>Contacts <Badge color="#10b981">{contacts.length}</Badge></TabButton>
      </div>

      {error && <Card style={errorStyle}>{error}</Card>}
      {loading && !items.length ? <Loading /> : (
        items.length ? (
          <div style={{ display:'grid', gap:'0.75rem' }}>
            {items.map(item => tab === 'feedback'
              ? <FeedbackCard key={item.id} item={item} />
              : <ContactCard key={item.id} item={item} />
            )}
          </div>
        ) : <EmptyState icon="💬" title="No messages yet" desc="Feedback and contact messages will appear here." />
      )}
    </div>
  );
}

function FeedbackCard({ item }) {
  return (
    <Card style={{ padding:'1.1rem 1.25rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.8rem' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'14px' }}>{item.userName || 'User'}</div>
          <div style={{ color:'var(--text3)', fontSize:'12px' }}>{item.userEmail || 'No email'} · {item.createdAt}</div>
        </div>
        <div style={{ display:'flex', gap:'0.45rem', alignItems:'center', flexWrap:'wrap' }}>
          <Badge color={typeColor(item.type)}>{item.type || 'general'}</Badge>
          {item.rating && <Badge color="#f59e0b">{item.rating}/5</Badge>}
        </div>
      </div>
      <div style={{ color:'var(--text2)', fontSize:'14px', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{item.message}</div>
    </Card>
  );
}

function ContactCard({ item }) {
  return (
    <Card style={{ padding:'1.1rem 1.25rem', border:'1px solid rgba(16,185,129,0.16)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.8rem' }}>
        <div>
          <div style={{ fontWeight:700, fontSize:'14px' }}>{item.name || 'Visitor'}</div>
          <div style={{ color:'var(--text3)', fontSize:'12px' }}>{item.email || 'No email'} · {item.createdAt}</div>
        </div>
        <Badge color="#10b981">contact</Badge>
      </div>
      <div style={{ color:'var(--text2)', fontSize:'14px', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{item.message}</div>
    </Card>
  );
}

function TabButton({ active, onClick, children }) {
  return <button onClick={onClick} style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.65rem 1rem', borderRadius:'8px 8px 0 0', background:active ? 'rgba(99,102,241,0.15)' : 'transparent', color:active ? '#818cf8' : 'var(--text3)', borderBottom:active ? '2px solid #6366f1' : '2px solid transparent', fontWeight:active ? 700 : 500 }}>{children}</button>;
}

function Loading() {
  return <div style={{ minHeight:'35vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem' }}><Spinner /><span style={{ color:'var(--text2)' }}>Loading messages...</span></div>;
}

function typeColor(type) {
  return type === 'bug' ? '#ef4444' : type === 'feature' ? '#7dd3fc' : '#818cf8';
}

const buttonStyle = { minHeight:40, borderRadius:10, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.24)', color:'#818cf8', padding:'0 1rem', fontWeight:700 };
const errorStyle = { padding:'1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:'13px' };

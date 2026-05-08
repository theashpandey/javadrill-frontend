import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiCall } from '../utils/api';
import { Badge, Card, Spinner } from '../components/UI';

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function AdminGeminiMonitoringPage() {
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [userId, setUserId] = useState('');
  const [interviewId, setInterviewId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (userId.trim()) params.set('userId', userId.trim());
      if (interviewId.trim()) params.set('interviewId', interviewId.trim());
      setData(await apiCall(`/api/admin/gemini/usage?${params.toString()}`));
    } catch (e) {
      setError(e.message || 'Could not load Gemini monitoring.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totals = data?.total || {};
  const byCallType = useMemo(() => (data?.byCallType || []).map(item => ({
    name: label(item.key),
    requests: item.totals?.requestCount || 0,
    failures: item.totals?.failedCount || 0,
  })), [data]);
  const daily = useMemo(() => (data?.byDay || []).slice().reverse().map(item => ({
    key: item.key,
    requests: item.totals?.requestCount || 0,
    tokens: item.totals?.totalTokens || 0,
  })), [data]);
  const topUsers = useMemo(() => topBuckets(data?.byUser || []), [data]);
  const topInterviews = useMemo(() => topBuckets(data?.byInterview || []), [data]);

  const successRate = totals.requestCount ? Math.round((totals.successCount / totals.requestCount) * 100) : 0;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Gemini Monitoring</h2>
          <p style={{ color:'var(--text2)', fontSize:'14px' }}>Monitor existing Gemini API usage, token load, success count, and failures.</p>
        </div>
      </div>

      <Card style={{ padding:'1rem' }}>
        <div className="gemini-filter-grid" style={{ display:'grid', gridTemplateColumns:'repeat(5, minmax(120px, 1fr))', gap:'0.65rem', alignItems:'end' }}>
          <label style={labelStyle}>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label style={labelStyle}>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          <label style={labelStyle}>User ID<input value={userId} onChange={e => setUserId(e.target.value)} placeholder="Optional" /></label>
          <label style={labelStyle}>Interview ID<input value={interviewId} onChange={e => setInterviewId(e.target.value)} placeholder="Optional" /></label>
          <button onClick={load} disabled={loading} style={buttonStyle}>{loading ? 'Loading...' : 'Apply'}</button>
        </div>
      </Card>

      {error && <Card style={errorStyle}>{error}</Card>}
      {loading && !data ? <Loading /> : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
            <Metric title="Requests" value={totals.requestCount} color="#818cf8" />
            <Metric title="Success" value={totals.successCount} color="#10b981" />
            <Metric title="Failed" value={totals.failedCount} color="#ef4444" />
            <Metric title="Success Rate" value={`${successRate}%`} color="#7dd3fc" />
            <Metric title="Input Tokens" value={totals.inputTokens} color="#f59e0b" />
            <Metric title="Output Tokens" value={totals.outputTokens} color="#ec4899" />
            <Metric title="Total Tokens" value={totals.totalTokens} color="#a78bfa" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.3fr) minmax(280px,0.8fr)', gap:'0.75rem' }} className="gemini-chart-grid">
            <ChartCard title="Requests By Day">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={daily} margin={{ top:8, right:12, bottom:0, left:-24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="key" tick={{ fill:'#4b5563', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill:'#4b5563', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Line type="monotone" dataKey="requests" name="Requests" stroke="#818cf8" strokeWidth={2.5} dot={{ r:3, fill:'#818cf8' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Call Types">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCallType} margin={{ top:8, right:12, bottom:0, left:-24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill:'#4b5563', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill:'#4b5563', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="requests" fill="#6366f1" radius={[6,6,0,0]} />
                  <Bar dataKey="failures" fill="#ef4444" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))', gap:'0.75rem' }}>
            <BucketList title="Top 10 Users By Requests" items={topUsers} />
            <BucketList title="Top 10 Interviews By Requests" items={topInterviews} />
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 900px) {
          .gemini-filter-grid { grid-template-columns: 1fr !important; }
          .gemini-chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Metric({ title, value, color }) {
  return <Card style={{ padding:'1rem' }}><div style={{ fontFamily:'var(--font-display)', fontSize:'26px', color, fontWeight:800, marginBottom:'0.25rem' }}>{value ?? 0}</div><div style={{ color:'var(--text3)', fontSize:'11px' }}>{title}</div></Card>;
}

function ChartCard({ title, children }) {
  return <Card style={{ padding:'1.25rem' }}><h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'1rem' }}>{title}</h3>{children}</Card>;
}

function BucketList({ title, items }) {
  const max = Math.max(...items.map(item => item.totals?.requestCount || 0), 1);
  return (
    <Card style={{ padding:'1.25rem' }}>
      <h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'1rem' }}>{title}</h3>
      <div style={{ display:'grid', gap:'0.75rem' }}>
        {items.length ? items.map((item, index) => {
          const count = item.totals?.requestCount || 0;
          const failed = item.totals?.failedCount || 0;
          return (
            <div key={item.key} style={{ display:'grid', gridTemplateColumns:'28px minmax(0,1fr) auto', alignItems:'center', gap:'0.75rem' }}>
              <span style={{ width:28, height:28, borderRadius:8, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.22)', color:'#818cf8', display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:'12px' }}>{index + 1}</span>
              <div style={{ minWidth:0 }}>
                <div style={{ color:'var(--text2)', fontSize:'13px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.key}</div>
                <div style={{ height:4, borderRadius:4, background:'rgba(255,255,255,0.06)', marginTop:'0.4rem', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${Math.max(5, (count / max) * 100)}%`, background:'linear-gradient(90deg,#6366f1,#818cf8)', borderRadius:4 }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:'0.35rem', alignItems:'center' }}>
                <Badge color="#818cf8">{count}</Badge>
                {failed > 0 && <Badge color="#ef4444">{failed} fail</Badge>}
              </div>
            </div>
          );
        }) : <div style={{ color:'var(--text3)', fontSize:'13px' }}>No requests in this date range.</div>}
      </div>
    </Card>
  );
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div style={{ background:'#14142a', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, padding:'0.65rem 0.85rem', fontSize:'12px' }}><div style={{ color:'#818cf8', marginBottom:4 }}>{label}</div>{payload.map((p, i) => <div key={i} style={{ color:p.color }}>{p.name}: {p.value}</div>)}</div>;
}

function Loading() {
  return <div style={{ minHeight:'40vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem' }}><Spinner /><span style={{ color:'var(--text2)' }}>Loading Gemini usage...</span></div>;
}

function label(value) {
  return String(value || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function topBuckets(items) {
  return items
    .slice()
    .sort((a, b) => (b.totals?.requestCount || 0) - (a.totals?.requestCount || 0))
    .slice(0, 10);
}

const labelStyle = { display:'grid', gap:'0.35rem', color:'var(--text3)', fontSize:'11px', fontWeight:700 };
const buttonStyle = { minHeight:42, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'white', padding:'0 1rem', fontWeight:700 };
const errorStyle = { padding:'1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:'13px' };

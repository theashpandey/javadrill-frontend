import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { apiCall } from '../utils/api';
import { Card, Spinner, Badge } from '../components/UI';

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function AdminUsersPage() {
  const [from, setFrom] = useState(thirtyDaysAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      setData(await apiCall(`/api/admin/users/analytics?${qs}`));
    } catch (e) {
      setError(e.message || 'Could not load admin analytics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = data?.stats || {};
  const statusData = useMemo(() => (data?.interviewsByStatus || []).map(item => ({
    name: label(item.key),
    count: item.count,
  })), [data]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'1rem', flexWrap:'wrap' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Users</h2>
          <p style={{ color:'var(--text2)', fontSize:'14px' }}>Admin analytics for signups, activity, interviews, and credits.</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(110px, auto))', gap:'0.5rem', alignItems:'end' }} className="admin-filter-row">
          <label style={labelStyle}>From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label style={labelStyle}>To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
          <button onClick={load} disabled={loading} style={buttonStyle}>{loading ? 'Loading...' : 'Apply'}</button>
        </div>
      </div>

      {error && <Card style={errorStyle}>{error}</Card>}
      {loading && !data ? <Loading /> : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'0.75rem' }}>
            <Metric title="Total Users" value={stats.totalUsers} color="#818cf8" />
            <Metric title="Users In Range" value={stats.usersInRange} color="#7dd3fc" />
            <Metric title="Daily Active" value={stats.dailyActiveUsers} color="#10b981" />
            <Metric title="Active In Range" value={stats.activeUsersInRange} color="#34d399" />
            <Metric title="Total Interviews" value={stats.totalInterviews} color="#f59e0b" />
            <Metric title="Interviews Today" value={stats.interviewsToday} color="#f97316" />
            <Metric title="Range Interviews" value={stats.interviewsInRange} color="#ec4899" />
            <Metric title="New Today" value={stats.newUsersToday} color="#818cf8" />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1.35fr) minmax(280px,0.75fr)', gap:'0.75rem' }} className="admin-chart-grid">
            <ChartCard title="Users By Day">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={data?.usersByDay || []} margin={{ top:8, right:12, bottom:0, left:-24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="key" tick={{ fill:'#4b5563', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill:'#4b5563', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Line type="monotone" dataKey="count" name="Users" stroke="#818cf8" strokeWidth={2.5} dot={{ r:3, fill:'#818cf8' }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Interview Status">
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={statusData} margin={{ top:8, right:12, bottom:0, left:-24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill:'#4b5563', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill:'#4b5563', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="count" fill="#6366f1" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'0.75rem' }}>
            <BucketList title="Top Interview Roles" items={data?.interviewsByRole || []} color="#f59e0b" />
            <BucketList title="Experience Levels" items={data?.usersByExperienceLevel || []} color="#10b981" />
          </div>

          <Card style={{ padding:'1.25rem', overflow:'hidden' }}>
            <h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'1rem' }}>Recent Users</h3>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
                <thead>
                  <tr style={{ color:'var(--text3)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', textAlign:'left' }}>
                    <th style={thStyle}>User</th><th style={thStyle}>Wallet</th><th style={thStyle}>Interviews</th><th style={thStyle}>Avg</th><th style={thStyle}>Resume</th><th style={thStyle}>Created</th><th style={thStyle}>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentUsers || []).map(user => (
                    <tr key={user.uid} style={{ borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                      <td style={tdStyle}><b style={{ color:'var(--text)' }}>{user.name || 'User'}</b><div style={{ color:'var(--text3)', fontSize:'12px' }}>{user.email}</div></td>
                      <td style={tdStyle}>{user.walletCredits}</td>
                      <td style={tdStyle}>{user.totalInterviews}</td>
                      <td style={tdStyle}>{Math.round(user.avgScore || 0)}%</td>
                      <td style={tdStyle}><Badge color={user.hasResume ? '#10b981' : '#4b5563'}>{user.hasResume ? 'Yes' : 'No'}</Badge></td>
                      <td style={tdStyle}>{user.createdAt}</td>
                      <td style={tdStyle}>{user.lastActiveAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card style={{ padding:'1.25rem', overflow:'hidden' }}>
            <h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'0.35rem' }}>Recent Answer Audit</h3>
            <p style={{ color:'var(--text3)', fontSize:'12px', marginBottom:'1rem' }}>
              Audio transcription, browser fallback, and final corrected answer traces. Audio files are not stored.
            </p>
            <div style={{ display:'grid', gap:'0.85rem' }}>
              {(data?.recentAnswerAudits || []).length === 0 && (
                <div style={{ color:'var(--text3)', fontSize:'13px' }}>No answer trace data yet.</div>
              )}
              {(data?.recentAnswerAudits || []).map((item, idx) => (
                <div key={`${item.interviewId}-${item.questionIndex}-${idx}`} style={{ padding:'0.85rem', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, background:'rgba(20,20,42,0.45)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:'0.75rem', flexWrap:'wrap', marginBottom:'0.65rem' }}>
                    <div>
                      <div style={{ color:'var(--text)', fontSize:'13px', fontWeight:700 }}>{item.userName || 'User'} <span style={{ color:'var(--text3)', fontWeight:500 }}>{item.userEmail}</span></div>
                      <div style={{ color:'var(--text3)', fontSize:'11px', marginTop:3 }}>Interview {shortId(item.interviewId)} · Q{(item.questionIndex || 0) + 1} · corrected {item.correctedAt || '-'}</div>
                    </div>
                    <div style={{ display:'flex', gap:'0.4rem', alignItems:'flex-start', flexWrap:'wrap' }}>
                      <Badge color={item.source === 'audio_transcription' ? '#10b981' : item.source === 'browser_fallback' ? '#f59e0b' : '#64748b'}>{label(item.source)}</Badge>
                      <Badge color={item.transcriptionStatus === 'success' ? '#22c55e' : item.transcriptionStatus === 'failed' ? '#ef4444' : '#64748b'}>{label(item.transcriptionStatus)}</Badge>
                      {item.audioBytes > 0 && <Badge color="#38bdf8">{formatBytes(item.audioBytes)}</Badge>}
                    </div>
                  </div>
                  <div style={{ color:'#93c5fd', fontSize:'12px', lineHeight:1.6, marginBottom:'0.6rem' }}>{truncate(item.question, 220)}</div>
                  <AuditText label="Browser raw" value={item.browserTranscript} color="#fbbf24" />
                  <AuditText label="Audio transcript" value={item.audioTranscript} color="#38bdf8" />
                  <AuditText label="Final corrected" value={item.finalTranscript} color="#86efac" />
                  {item.error && <AuditText label="Error" value={item.error} color="#f87171" />}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-filter-row { grid-template-columns: 1fr !important; width: 100%; }
          .admin-chart-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .admin-filter-row { grid-template-columns: 1fr !important; }
          .admin-chart-grid { grid-template-columns: 1fr !important; }
          table { font-size: 12px; }
          th, td { padding: 0.5rem 0.4rem; }
        }
      `}</style>
    </div>
  );
}

function Loading() {
  return <div style={{ minHeight:'40vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'1rem' }}><Spinner /><span style={{ color:'var(--text2)' }}>Loading admin analytics...</span></div>;
}

function Metric({ title, value, color }) {
  return <Card style={{ padding:'1rem' }}><div style={{ fontFamily:'var(--font-display)', fontSize:'26px', color, fontWeight:800, marginBottom:'0.25rem' }}>{value ?? 0}</div><div style={{ color:'var(--text3)', fontSize:'11px' }}>{title}</div></Card>;
}

function ChartCard({ title, children }) {
  return <Card style={{ padding:'1.25rem' }}><h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'1rem' }}>{title}</h3>{children}</Card>;
}

function BucketList({ title, items, color }) {
  return <Card style={{ padding:'1.25rem' }}><h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'1rem' }}>{title}</h3><div style={{ display:'grid', gap:'0.65rem' }}>{items.slice(0, 8).map(item => <div key={item.key} style={{ display:'flex', justifyContent:'space-between', gap:'1rem', color:'var(--text2)', fontSize:'13px' }}><span>{label(item.key)}</span><Badge color={color}>{item.count}</Badge></div>)}</div></Card>;
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div style={{ background:'#14142a', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, padding:'0.65rem 0.85rem', fontSize:'12px' }}><div style={{ color:'#818cf8', marginBottom:4 }}>{label}</div>{payload.map((p, i) => <div key={i} style={{ color:p.color }}>{p.name}: {p.value}</div>)}</div>;
}

function label(value) {
  return String(value || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function AuditText({ label, value, color }) {
  if (!value) return null;
  return (
    <div style={{ marginTop:'0.45rem', fontSize:'12px', lineHeight:1.6 }}>
      <div style={{ color, fontSize:'10px', fontWeight:800, letterSpacing:'0.8px', textTransform:'uppercase', marginBottom:'0.15rem' }}>{label}</div>
      <div style={{ color:'var(--text2)', whiteSpace:'pre-wrap' }}>{truncate(value, 600)}</div>
    </div>
  );
}

function truncate(value, max) {
  const text = String(value || '');
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}

function shortId(value) {
  return String(value || '').slice(0, 8);
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const labelStyle = { display:'grid', gap:'0.35rem', color:'var(--text3)', fontSize:'11px', fontWeight:700 };
const buttonStyle = { minHeight:42, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'white', padding:'0 1rem', fontWeight:700 };
const errorStyle = { padding:'1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', fontSize:'13px' };
const thStyle = { padding:'0.65rem 0.75rem', fontWeight:700 };
const tdStyle = { padding:'0.8rem 0.75rem', color:'var(--text2)', fontSize:'13px', verticalAlign:'top' };

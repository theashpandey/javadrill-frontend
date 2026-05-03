import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { apiCall } from '../utils/api';
import { Card, ScoreRing, ProgressBar, Badge, EmptyState, Spinner } from '../components/UI';
import { CAT_LABELS, CAT_COLORS, CATEGORIES } from '../utils/gemini';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#14142a', border:'1px solid rgba(99,102,241,0.3)', borderRadius:12, padding:'0.75rem 1rem' }}>
      <div style={{ fontSize:'12px', color:'#818cf8', marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ fontSize:'13px', color:p.color }}>{p.name}: {p.value}%</div>)}
    </div>
  );
};

export default function PerformancePage() {
  const { history, fetchHistory } = useApp();
  const [analysis, setAnalysis]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [loadingHist, setLoadingHist] = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    // Fetch fresh history from backend
    setLoadingHist(true);
    setError('');
    fetchHistory()
      .catch(e => setError(e.message || 'Could not load performance data.'))
      .finally(() => setLoadingHist(false));
  }, [fetchHistory]);

  const loadAnalysis = async () => {
    setLoading(true); setError('');
    try {
      const data = await apiCall('/api/performance/analysis');
      setAnalysis(data);
    } catch (e) {
      setError(e.message || 'Could not load analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingHist) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh', flexDirection:'column', gap:'1rem' }}>
      <Spinner size={40} />
      <span style={{ color:'var(--text2)' }}>Loading your performance data...</span>
    </div>
  );

  if (!history.length) return (
    <div>
      <PageHeader count={0} />
      {error && <Card style={{ padding:'1rem', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)', marginBottom:'1rem' }}>
        <div style={{ color:'#ef4444', fontSize:'13px' }}>⚠ {error}</div>
      </Card>}
      <EmptyState icon="📊" title="No interviews yet" desc="Complete your first interview to see detailed analytics and AI-powered analysis from a senior Java interviewer's perspective." />
    </div>
  );

  // ── Data prep ──
  const last7   = history.slice(0, 7);
  const sorted  = [...last7].reverse();        // oldest → newest for trend chart
  const latest  = history[0];
  const overall = latest?.scores?.overall || 0;

  // Trend chart
  const trendData = sorted.map((h, i) => ({
    name: h.date?.split(',')[0] || `S${i+1}`,
    Overall:      h.scores?.overall || 0,
    Technical:    h.scores?.technical || 0,
    Communication:h.scores?.communication || 0,
  }));

  // Category averages across all sessions
  const catAvg = {};
  CATEGORIES.forEach(cat => {
    const vals = last7.map(h => h.scores?.categories?.[cat]).filter(v => v > 0);
    catAvg[cat] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
  });

  // Radar data
  const radarData = CATEGORIES.map(cat => ({
    subject: CAT_LABELS[cat]?.replace(' ', '\n') || cat,
    score: catAvg[cat] || 0,
    fullMark: 100,
  }));

  const scoreList = last7.map(h => h.scores?.overall).filter(Boolean);
  const avgScore  = scoreList.length ? Math.round(scoreList.reduce((a,b)=>a+b,0)/scoreList.length) : 0;
  const bestScore = Math.max(...scoreList, 0);
  const firstScore = sorted[0]?.scores?.overall || 0;
  const latestScore = sorted[sorted.length-1]?.scores?.overall || 0;
  const delta = latestScore - firstScore;

  const bestCat = Object.entries(catAvg).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1])[0];
  const weakCat = Object.entries(catAvg).filter(([,v])=>v>0).sort((a,b)=>a[1]-b[1])[0];

  const trend = analysis?.trend || (delta > 3 ? 'improving' : delta < -3 ? 'declining' : 'neutral');
  const trendColor = trend==='improving'?'#10b981':trend==='declining'?'#ef4444':'#f59e0b';
  const trendLabel = trend==='improving'?'📈 Improving':trend==='declining'?'📉 Declining':'➡ Stable';

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem', maxWidth:960 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'1rem' }}>
        <PageHeader count={last7.length} />
        {!analysis && (
          <button onClick={loadAnalysis} disabled={loading} style={{
            display:'flex', alignItems:'center', gap:'0.5rem',
            padding:'0.65rem 1.25rem', borderRadius:'10px', cursor:loading?'not-allowed':'pointer',
            background:'linear-gradient(135deg,#6366f1,#818cf8)', color:'white',
            border:'none', fontSize:'13px', fontWeight:500, opacity:loading?0.7:1,
          }}>
            {loading ? <><Spinner size={14} color="white" /> Analysing...</> : '🧠 Get AI Analysis'}
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'0.75rem' }}>
        {[
          { label:'Latest Score', value:`${overall}%`, color:'#818cf8' },
          { label:'Average',      value:`${avgScore}%`, color:'#10b981' },
          { label:'Best Score',   value:`${bestScore}%`, color:'#f59e0b' },
          { label:'Sessions',     value:last7.length,   color:'#ec4899' },
          { label:'Trend',        value:trendLabel,     color:trendColor, small:true },
        ].map(s => (
          <Card key={s.label} style={{ padding:'1rem', textAlign:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize: s.small?'12px':'26px', fontWeight:700, color:s.color, marginBottom:'0.3rem', lineHeight:1.2 }}>{s.value}</div>
            <div style={{ fontSize:'11px', color:'var(--text3)' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Score trend chart */}
      {trendData.length > 1 && (
        <Card style={{ padding:'1.5rem' }}>
          <h3 style={{ fontSize:'14px', fontWeight:600, marginBottom:'1.25rem', color:'var(--text2)' }}>Score Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top:5, right:10, left:-20, bottom:5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill:'#4b5563', fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill:'#4b5563', fontSize:11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Line type="monotone" dataKey="Overall" stroke="#818cf8" strokeWidth={2.5} dot={{ fill:'#818cf8', r:4 }} activeDot={{ r:6 }} name="Overall" />
              <Line type="monotone" dataKey="Technical" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Technical" />
              <Line type="monotone" dataKey="Communication" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Communication" />
              <Legend iconType="circle" wrapperStyle={{ fontSize:'12px', paddingTop:'1rem' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Category radar + bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'0.75rem' }}>
        <Card style={{ padding:'1.5rem' }}>
          <h3 style={{ fontSize:'14px', fontWeight:600, marginBottom:'1.25rem', color:'var(--text2)' }}>Category Radar</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.07)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill:'#4b5563', fontSize:10 }} />
              <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{ padding:'1.5rem' }}>
          <h3 style={{ fontSize:'14px', fontWeight:600, marginBottom:'1.25rem', color:'var(--text2)' }}>Category Averages</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
            {CATEGORIES.filter(c => catAvg[c] > 0).map(cat => (
              <div key={cat}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'0.3rem' }}>
                  <span style={{ color:'var(--text2)' }}>{CAT_LABELS[cat]}</span>
                  <span style={{ fontFamily:'var(--font-mono)', color: catAvg[cat] >= 70 ? '#10b981' : catAvg[cat] >= 50 ? '#f59e0b' : '#ef4444' }}>{catAvg[cat]}%</span>
                </div>
                <ProgressBar value={catAvg[cat]} color={CAT_COLORS[cat] || '#6366f1'} height={5} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick insights */}
      {(bestCat || weakCat) && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'0.75rem' }}>
          {bestCat && (
            <Card style={{ padding:'1.1rem', background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)' }}>
              <div style={{ fontSize:'11px', color:'#10b981', fontWeight:600, marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'1px' }}>💪 Strongest Area</div>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'0.25rem' }}>{CAT_LABELS[bestCat[0]]}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'22px', color:'#10b981', fontWeight:700 }}>{bestCat[1]}%</div>
            </Card>
          )}
          {weakCat && (
            <Card style={{ padding:'1.1rem', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ fontSize:'11px', color:'#ef4444', fontWeight:600, marginBottom:'0.4rem', textTransform:'uppercase', letterSpacing:'1px' }}>🎯 Focus Area</div>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'0.25rem' }}>{CAT_LABELS[weakCat[0]]}</div>
              <div style={{ fontFamily:'var(--font-mono)', fontSize:'22px', color:'#ef4444', fontWeight:700 }}>{weakCat[1]}%</div>
            </Card>
          )}
        </div>
      )}

      {/* AI Analysis */}
      {loading && (
        <Card style={{ padding:'2rem', textAlign:'center' }}>
          <Spinner size={36} />
          <div style={{ marginTop:'1rem', color:'var(--text2)', fontSize:'14px' }}>Analysing your interview history like a real interviewer...</div>
          <div style={{ color:'var(--text3)', fontSize:'12px', marginTop:'0.5rem' }}>This takes 10–15 seconds</div>
        </Card>
      )}

      {error && (
        <Card style={{ padding:'1rem', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ color:'#ef4444', fontSize:'13px' }}>⚠ {error}</div>
          <button onClick={loadAnalysis} style={{ background:'transparent', border:'none', color:'#818cf8', fontSize:'12px', cursor:'pointer', marginTop:'0.5rem', textDecoration:'underline' }}>Try again</button>
        </Card>
      )}

      {analysis && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.25rem' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700 }}>🧠 Interviewer Analysis</h3>
            <Badge color="#818cf8">{analysis.sessionCount} sessions</Badge>
            {analysis.avgScore > 0 && <Badge color="#10b981">Avg {analysis.avgScore}%</Badge>}
          </div>

          {/* Verdict — highlighted */}
          {analysis.interviewerVerdict && (
            <Card style={{ padding:'1.25rem', background:'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(167,139,250,0.06))', border:'1px solid rgba(99,102,241,0.3)' }}>
              <div style={{ fontSize:'11px', color:'#818cf8', fontWeight:600, marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'1px' }}>⚖ Interviewer Verdict</div>
              <div style={{ fontSize:'14px', lineHeight:1.8, color:'var(--text)', fontStyle:'italic' }}>"{analysis.interviewerVerdict}"</div>
            </Card>
          )}

          {/* Analysis cards */}
          {[
            { key:'overallAnalysis',       title:'Overall Assessment',    icon:'📋' },
            { key:'communicationAnalysis', title:'Communication',         icon:'🗣' },
            { key:'answeringFlowAnalysis', title:'Answering Flow & Clarity', icon:'🔄' },
            { key:'strengthsSummary',      title:'Genuine Strengths',     icon:'💪' },
            { key:'improvementPlan',       title:'Improvement Plan',      icon:'🎯' },
          ].filter(item => analysis[item.key]).map(item => (
            <Card key={item.key} style={{ padding:'1.25rem' }}>
              <div style={{ fontSize:'12px', color:'var(--text3)', fontWeight:600, marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'1px' }}>{item.icon} {item.title}</div>
              <div style={{ fontSize:'14px', lineHeight:1.85, color:'var(--text2)', whiteSpace:'pre-line' }}>{analysis[item.key]}</div>
            </Card>
          ))}

          {/* Category insights */}
          {analysis.categoryInsights?.length > 0 && (
            <Card style={{ padding:'1.25rem' }}>
              <div style={{ fontSize:'12px', color:'var(--text3)', fontWeight:600, marginBottom:'1rem', textTransform:'uppercase', letterSpacing:'1px' }}>📂 Per-Category Breakdown</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                {analysis.categoryInsights.map((ci, i) => (
                  <div key={i} style={{ paddingBottom:'0.85rem', borderBottom: i < analysis.categoryInsights.length-1 ? '1px solid var(--border2)' : 'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'0.5rem' }}>
                      <Badge color={CAT_COLORS[ci.category] || '#6366f1'}>{CAT_LABELS[ci.category] || ci.category}</Badge>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color: ci.avgScore>=70?'#10b981':ci.avgScore>=50?'#f59e0b':'#ef4444', fontWeight:600 }}>{ci.avgScore}%</span>
                    </div>
                    {ci.insight && <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.7, marginBottom:'0.3rem' }}>{ci.insight}</div>}
                    {ci.advice && <div style={{ fontSize:'12.5px', color:'#818cf8', lineHeight:1.7 }}>→ {ci.advice}</div>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          <button onClick={() => setAnalysis(null)} style={{ background:'transparent', border:'none', color:'var(--text3)', fontSize:'12px', cursor:'pointer', textDecoration:'underline', alignSelf:'flex-start' }}>
            Refresh Analysis
          </button>
        </div>
      )}
    </div>
  );
}

function PageHeader({ count }) {
  return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Performance</h2>
      <p style={{ color:'var(--text2)', fontSize:'14px' }}>
        {count ? `Last ${count} interview${count>1?'s':''} · AI-powered deep analysis` : 'Your analytics dashboard'}
      </p>
    </div>
  );
}

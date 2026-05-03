import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiCall } from '../utils/api';
import { Card, Badge, ScoreRing, EmptyState, Spinner, ProgressBar } from '../components/UI';
import { CAT_LABELS, CAT_COLORS } from '../utils/gemini';

export default function HistoryPage() {
  const { history, fetchHistory } = useApp();
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState(null);   // full detail object
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchHistory()
      .catch(e => setError(e.message || 'Could not load interview history.'))
      .finally(() => setLoading(false));
  }, [fetchHistory]);

  const openDetail = async (item) => {
    setDetailLoading(true);
    setError('');
    try {
      const full = await apiCall(`/api/interview/history/${item.id}`);
      setSelected(full);
    } catch {
      setSelected(item); // fallback: use list data
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh', gap:'1rem', flexDirection:'column' }}>
      <Spinner size={36} />
      <span style={{ color:'var(--text2)', fontSize:'14px' }}>Loading history...</span>
    </div>
  );

  if (detailLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh', gap:'1rem', flexDirection:'column' }}>
      <Spinner size={36} />
      <span style={{ color:'var(--text2)', fontSize:'14px' }}>Loading session details...</span>
    </div>
  );

  if (selected) return <DetailView item={selected} onBack={() => setSelected(null)} />;

  if (!history.length) return (
    <div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.5rem' }}>Interview History</h2>
      <p style={{ color:'var(--text2)', fontSize:'14px', marginBottom:'2rem' }}>Your past mock interviews</p>
      {error && <div style={{ padding:'0.75rem 1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, color:'#ef4444', fontSize:'13px', marginBottom:'1rem' }}>{error}</div>}
      <EmptyState icon="📋" title="No interviews yet" desc="Your interview history will appear here after you complete your first session." />
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem', maxWidth:780 }}>
      <div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Interview History</h2>
        <p style={{ color:'var(--text2)', fontSize:'14px' }}>
          {history.length} session{history.length>1?'s':''} · Click any to view full detail
        </p>
        {error && <div style={{ padding:'0.75rem 1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, color:'#ef4444', fontSize:'13px', marginTop:'1rem' }}>{error}</div>}
      </div>

      {history.map((item, i) => {
        const overall = item.scores?.overall || 0;
        const cats    = item.categories?.slice(0,3) || [];
        const prev    = history[i+1]?.scores?.overall;
        const delta   = prev != null ? overall - prev : null;

        return (
          <Card key={item.id || i} onClick={() => openDetail(item)}
            style={{ padding:'1.25rem 1.4rem', cursor:'pointer', transition:'all 0.25s', position:'relative', overflow:'hidden' }}
            onMouseOver={e => { e.currentTarget.style.borderColor='rgba(99,102,241,0.35)'; e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 30px rgba(0,0,0,0.3)'; }}
            onMouseOut={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'; e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='none'; }}>

            {i===0 && <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'linear-gradient(180deg,#6366f1,#a78bfa)', borderRadius:'16px 0 0 16px' }} />}

            <div style={{ display:'flex', alignItems:'center', gap:'1.1rem', flexWrap:'wrap' }}>
              <ScoreRing score={overall} size={60} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.4rem', flexWrap:'wrap' }}>
                  <span style={{ fontWeight:600, fontSize:'14px' }}>{item.date}</span>
                  {i===0 && <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'100px', background:'rgba(99,102,241,0.15)', color:'#818cf8', fontWeight:600 }}>Latest</span>}
                  {delta!==null && (
                    <span style={{ fontSize:'11px', color:delta>=0?'#10b981':'#ef4444', fontFamily:'var(--font-mono)' }}>
                      {delta>=0?'+':''}{delta}pts
                    </span>
                  )}
                </div>
                <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap', marginBottom:'0.5rem' }}>
                  {cats.map(c => <Badge key={c} color={CAT_COLORS[c]||'#6366f1'}>{CAT_LABELS[c]||c}</Badge>)}
                </div>
                <div style={{ display:'flex', gap:'1.25rem', fontSize:'12px', color:'var(--text3)' }}>
                  <span>⏱ {item.durationMinutes} min</span>
                  <span>❓ {item.questionCount} questions</span>
                  <span style={{ color:'var(--text2)' }}>→ Click to expand</span>
                </div>
              </div>

              {/* Mini score bars */}
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', minWidth:110, flexShrink:0 }}>
                {[
                  { label:'Technical',    val:item.scores?.technical||0,    color:'#818cf8' },
                  { label:'Comm.',        val:item.scores?.communication||0, color:'#10b981' },
                  { label:'Problem Solv.',val:item.scores?.problemSolving||0,color:'#f59e0b' },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', marginBottom:'2px' }}>
                      <span style={{ color:'var(--text3)' }}>{s.label}</span>
                      <span style={{ color:s.color, fontFamily:'var(--font-mono)' }}>{s.val}</span>
                    </div>
                    <ProgressBar value={s.val} color={s.color} height={3} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Full session detail view ──
function DetailView({ item, onBack }) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'qa' | 'analysis'
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const scores = item.scores || {};
  const qas    = item.questions || [];

  useEffect(() => {
    if (tab !== 'analysis' || analysis || analysisLoading) return;
    setAnalysisLoading(true);
    setAnalysisError('');
    apiCall(`/api/interview/history/${item.id}/analysis`)
      .then(setAnalysis)
      .catch(e => setAnalysisError(e.message || 'Could not load interview analysis.'))
      .finally(() => setAnalysisLoading(false));
  }, [tab, analysis, analysisLoading, item.id]);

  return (
    <div style={{ maxWidth:800, display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {/* Back + header */}
      <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
        <button onClick={onBack} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', color:'var(--text2)', padding:'0.45rem 0.85rem', cursor:'pointer', fontSize:'13px', display:'flex', alignItems:'center', gap:'0.4rem' }}>
          ← Back
        </button>
        <div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:700, marginBottom:'0.2rem' }}>Session Detail</h3>
          <p style={{ color:'var(--text3)', fontSize:'12px' }}>{item.date} · {item.durationMinutes} min · {qas.length} questions</p>
        </div>
      </div>

      {/* Score overview */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:'0.65rem' }}>
        {[
          { label:'Overall',      val:scores.overall||0 },
          { label:'Technical',    val:scores.technical||0 },
          { label:'Communication',val:scores.communication||0 },
          { label:'Problem Solving',val:scores.problemSolving||0 },
          { label:'Java Depth',   val:scores.javaDepth||0 },
        ].map(s => (
          <Card key={s.label} style={{ padding:'1rem', textAlign:'center' }}>
            <ScoreRing score={s.val} size={58} />
            <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:'0.4rem', lineHeight:1.3 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0.5rem', borderBottom:'1px solid var(--border2)', paddingBottom:'0' }}>
        {[['overview','Overview'],['qa','Q&A Review'],['analysis','Analysis']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding:'0.6rem 1.1rem', borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer',
            background: tab===id ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: tab===id ? '#818cf8' : 'var(--text3)',
            fontSize:'13px', fontWeight: tab===id ? 600 : 400,
            borderBottom: tab===id ? '2px solid #6366f1' : '2px solid transparent',
            transition:'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {/* Overview tab */}
      {tab==='overview' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {scores.categories && Object.keys(scores.categories).length > 0 && (
            <Card style={{ padding:'1.25rem' }}>
              <div style={{ fontSize:'12px', color:'var(--text3)', fontWeight:600, marginBottom:'1rem', textTransform:'uppercase', letterSpacing:'1px' }}>Category Scores</div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.65rem' }}>
                {Object.entries(scores.categories).map(([cat, val]) => (
                  <div key={cat}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'0.3rem' }}>
                      <span style={{ color:'var(--text2)' }}>{CAT_LABELS[cat]||cat}</span>
                      <span style={{ fontFamily:'var(--font-mono)', color: val>=70?'#10b981':val>=50?'#f59e0b':'#ef4444' }}>{val}%</span>
                    </div>
                    <ProgressBar value={val} color={CAT_COLORS[cat]||'#6366f1'} height={5} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Q&A tab */}
      {tab==='qa' && (
        <Card style={{ padding:'1.5rem' }}>
          {qas.length === 0
            ? <p style={{ color:'var(--text3)', fontSize:'13px' }}>No Q&A data available for this session.</p>
            : qas.map((q, i) => (
              <div key={i} style={{ paddingBottom:'1.25rem', marginBottom:'1.25rem', borderBottom: i<qas.length-1?'1px solid var(--border2)':'none' }}>
                <div style={{ display:'flex', gap:'0.65rem', marginBottom:'0.65rem' }}>
                  <span style={{ fontSize:'12px', color:'var(--text3)', fontFamily:'var(--font-mono)', paddingTop:3, flexShrink:0 }}>Q{i+1}</span>
                  <div>
                    <div style={{ fontSize:'14px', fontWeight:500, color:'#93c5fd', lineHeight:1.6, marginBottom:'0.4rem' }}>{q.question}</div>
                    <div style={{ display:'flex', gap:'0.4rem' }}>
                      <Badge color={CAT_COLORS[q.category]||'#6366f1'}>{CAT_LABELS[q.category]||q.category}</Badge>
                      {q.difficulty && <Badge color={q.difficulty==='hard'?'#ef4444':q.difficulty==='easy'?'#10b981':'#f59e0b'}>{q.difficulty}</Badge>}
                    </div>
                  </div>
                </div>

                {q.answer && (
                  <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.75, padding:'0.75rem', background:'rgba(20,20,42,0.5)', borderRadius:'8px', marginBottom:'0.5rem', borderLeft:'3px solid rgba(148,163,184,0.25)' }}>
                    <div style={{ fontSize:'10px', color:'var(--text3)', marginBottom:'0.35rem', textTransform:'uppercase', letterSpacing:'1px' }}>Your Answer</div>
                    {q.answer}
                  </div>
                )}
                {q.feedback && (
                  <div style={{ fontSize:'13px', color:'#86efac', lineHeight:1.75, padding:'0.75rem', background:'rgba(16,185,129,0.05)', borderRadius:'8px', borderLeft:'3px solid rgba(16,185,129,0.35)' }}>
                    <div style={{ fontSize:'10px', color:'#10b981', marginBottom:'0.35rem', textTransform:'uppercase', letterSpacing:'1px' }}>💡 Sarah's Feedback</div>
                    {q.feedback}
                  </div>
                )}
              </div>
            ))}
        </Card>
      )}

      {/* Analysis tab */}
      {tab==='analysis' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
          {analysisLoading && (
            <Card style={{ padding:'1.5rem', display:'flex', alignItems:'center', gap:'0.85rem' }}>
              <Spinner size={22} />
              <span style={{ color:'var(--text2)', fontSize:'14px' }}>Analysing this interview...</span>
            </Card>
          )}
          {analysisError && (
            <Card style={{ padding:'1rem', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ color:'#ef4444', fontSize:'13px' }}>{analysisError}</div>
            </Card>
          )}
          {analysis && (
            <>
              {analysis.interviewerVerdict && (
                <Card style={{ padding:'1.25rem', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.22)' }}>
                  <div style={{ fontSize:'11px', color:'#818cf8', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'0.5rem' }}>Interviewer Verdict</div>
                  <div style={{ fontSize:'14px', color:'var(--text)', lineHeight:1.8 }}>{analysis.interviewerVerdict}</div>
                </Card>
              )}
              {[
                ['overallAnalysis', 'Overall Assessment'],
                ['communicationAnalysis', 'Communication'],
                ['answeringFlowAnalysis', 'Answering Flow'],
                ['strengthsSummary', 'Strengths'],
                ['improvementPlan', 'Improvement Plan'],
              ].filter(([key]) => analysis[key]).map(([key, title]) => (
                <Card key={key} style={{ padding:'1.2rem' }}>
                  <div style={{ fontSize:'12px', color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'0.55rem' }}>{title}</div>
                  <div style={{ fontSize:'14px', color:'var(--text2)', lineHeight:1.85, whiteSpace:'pre-line' }}>{analysis[key]}</div>
                </Card>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

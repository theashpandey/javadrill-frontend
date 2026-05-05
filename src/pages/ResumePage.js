import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiCall } from '../utils/api';
import { Card, Button, Spinner } from '../components/UI';
import {
  INTERVIEW_ROLES,
  EXPERIENCE_LEVELS,
  getRoleLabel,
  getExperienceLabel,
} from '../utils/gemini';

export default function ResumePage() {
  const {
    hasResume, setHasResume,
    interviewRole, setInterviewRole,
    experienceLevel, setExperienceLevel,
  } = useApp();
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(!interviewRole || !experienceLevel);
  const [draftRole, setDraftRole] = useState(interviewRole || 'java_developer');
  const [draftExperience, setDraftExperience] = useState(experienceLevel || '3_5');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [prefsError, setPrefsError] = useState('');
  const [prefsSuccess, setPrefsSuccess] = useState('');
  const [fileName, setFileName]   = useState('');

  useEffect(() => {
    if (interviewRole) setDraftRole(interviewRole);
    if (experienceLevel) setDraftExperience(experienceLevel);
    setEditingPrefs(!interviewRole || !experienceLevel);
  }, [interviewRole, experienceLevel]);

  const handleFile = async (file) => {
    setError(''); setSuccess('');
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf','txt'].includes(ext)) {
      setError('Please upload a PDF or TXT file.'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5MB.'); return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiCall('/api/resume/upload', { method:'POST', body:fd });
      setHasResume(true);
      setFileName(res.fileName || file.name);
      setSuccess(res.message || 'Resume uploaded! Sarah will use this for your next interview.');
    } catch (e) {
      setError(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const savePrefs = async () => {
    setPrefsError('');
    setPrefsSuccess('');
    setSavingPrefs(true);
    try {
      const data = await apiCall('/api/profile/interview-preferences', {
        method:'POST',
        body: JSON.stringify({ interviewRole: draftRole, experienceLevel: draftExperience }),
      });
      setInterviewRole(data.interviewRole || draftRole);
      setExperienceLevel(data.experienceLevel || draftExperience);
      setEditingPrefs(false);
      setPrefsSuccess(data.message || 'Role and experience saved.');
    } catch (e) {
      setPrefsError(e.message || 'Could not save role and experience. Please try again.');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div style={{ maxWidth:640, display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Resume</h2>
        <p style={{ color:'var(--text2)', fontSize:'14px', lineHeight:1.7 }}>
          Sarah AI reads your resume to tailor interview questions to your actual background, skills, and experience. The more detailed your resume, the more relevant the questions.
        </p>
      </div>

      {/* Current status */}
      {hasResume && (
        <Card style={{ padding:'1.1rem', background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
            <div style={{ fontSize:'28px' }}>✅</div>
            <div>
              <div style={{ fontSize:'14px', fontWeight:600, color:'#10b981', marginBottom:'0.2rem' }}>Resume on file</div>
              {fileName && <div style={{ fontSize:'12px', color:'var(--text3)' }}>{fileName}</div>}
              <div style={{ fontSize:'12px', color:'var(--text2)' }}>Sarah is ready to personalise your interview questions</div>
            </div>
          </div>
        </Card>
      )}

      {editingPrefs ? (
        <Card style={{ padding:'1.1rem', display:'flex', flexDirection:'column', gap:'0.9rem', background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.18)' }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:700, color:'var(--text)', marginBottom:'0.25rem' }}>Interview Target</div>
            <div style={{ fontSize:'12px', color:'var(--text2)' }}>Sarah uses this with your resume to build role-specific questions and scoring categories.</div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'0.85rem' }}>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
              <span style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>Interview Role</span>
              <select value={draftRole} onChange={e => setDraftRole(e.target.value)} style={{
                width:'100%', minHeight:44, borderRadius:10, border:'1px solid rgba(255,255,255,0.08)',
                background:'rgba(20,20,42,0.8)', color:'var(--text)', padding:'0 0.8rem', fontSize:'13px',
              }}>
                {INTERVIEW_ROLES.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <label style={{ display:'flex', flexDirection:'column', gap:'0.45rem' }}>
              <span style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:600 }}>Experience Level</span>
              <select value={draftExperience} onChange={e => setDraftExperience(e.target.value)} style={{
                width:'100%', minHeight:44, borderRadius:10, border:'1px solid rgba(255,255,255,0.08)',
                background:'rgba(20,20,42,0.8)', color:'var(--text)', padding:'0 0.8rem', fontSize:'13px',
              }}>
                {EXPERIENCE_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
            </label>
          </div>
          {prefsError && <div style={{ color:'#ef4444', fontSize:'13px' }}>{prefsError}</div>}
          <div style={{ display:'flex', gap:'0.65rem', flexWrap:'wrap' }}>
            <Button onClick={savePrefs} disabled={savingPrefs} size="sm">
              {savingPrefs ? 'Saving...' : 'Save Role & Experience'}
            </Button>
            {interviewRole && experienceLevel && (
              <Button variant="secondary" size="sm" onClick={() => setEditingPrefs(false)}>Cancel</Button>
            )}
          </div>
        </Card>
      ) : (
        <Card style={{ padding:'1.1rem', background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
              <div style={{ fontSize:'28px' }}>✅</div>
              <div>
                <div style={{ fontSize:'14px', fontWeight:600, color:'#10b981', marginBottom:'0.2rem' }}>Interview target saved</div>
                <div style={{ fontSize:'12px', color:'var(--text2)' }}>{getRoleLabel(interviewRole)} · {getExperienceLabel(experienceLevel)}</div>
              </div>
            </div>
            <button onClick={() => setEditingPrefs(true)} style={{ background:'transparent', border:'none', color:'#10b981', cursor:'pointer', fontSize:'12px', textDecoration:'underline' }}>Replace</button>
          </div>
        </Card>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('resumeFileInput').click()}
        style={{
          border:`2px dashed ${dragging?'#6366f1':'rgba(99,102,241,0.25)'}`,
          borderRadius:'16px', padding:'2.5rem', textAlign:'center', cursor:'pointer',
          transition:'all 0.3s', background:dragging?'rgba(99,102,241,0.08)':'rgba(20,20,42,0.4)',
          boxShadow:dragging?'0 0 30px rgba(99,102,241,0.15)':'none',
        }}>
        <input id="resumeFileInput" type="file" accept=".pdf,.txt" hidden
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
        {uploading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
            <Spinner size={40} />
            <div style={{ color:'var(--text2)', fontSize:'14px' }}>Uploading and parsing resume...</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:'44px', marginBottom:'0.85rem' }}>📄</div>
            <div style={{ fontSize:'16px', fontWeight:500, marginBottom:'0.4rem' }}>
              {hasResume ? 'Replace Resume' : 'Upload Your Resume'}
            </div>
            <div style={{ fontSize:'13px', color:'var(--text3)', marginBottom:'0.75rem' }}>
              PDF or TXT · Drag & drop or click to browse · Max 5MB
            </div>
            <div style={{ display:'inline-block', padding:'0.5rem 1.25rem', borderRadius:'8px', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', fontSize:'13px', color:'#818cf8' }}>
              Choose File
            </div>
          </>
        )}
      </div>

      {error   && <div style={{ padding:'0.75rem 1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, color:'#ef4444', fontSize:'13px' }}>{error}</div>}
      {success && <div style={{ padding:'0.75rem 1rem', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, color:'#10b981', fontSize:'13px' }}>{success}</div>}
      {prefsSuccess && <div style={{ padding:'0.75rem 1rem', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, color:'#10b981', fontSize:'13px' }}>{prefsSuccess}</div>}

      <Card style={{ padding:'1.25rem' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text2)', marginBottom:'0.85rem' }}>Tips for Best Results</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
          {[
            '📝 Use a text-based PDF (not a scanned image)',
            '🛠 List your role-specific skills, frameworks, tools, and years of experience clearly',
            '💼 Include your project descriptions and tech stack',
            '📂 TXT format works best if PDF parsing gives issues',
            '✅ The more detail, the more targeted Sarah\'s questions will be',
          ].map((tip, i) => (
            <div key={i} style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.6 }}>{tip}</div>
          ))}
        </div>
      </Card>
    </div>
  );
}

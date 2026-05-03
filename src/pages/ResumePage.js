import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiCall } from '../utils/api';
import { Card, Button, Spinner } from '../components/UI';

export default function ResumePage() {
  const { hasResume, setHasResume, user } = useApp();
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [fileName, setFileName]   = useState('');

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

      <Card style={{ padding:'1.25rem' }}>
        <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text2)', marginBottom:'0.85rem' }}>Tips for Best Results</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.6rem' }}>
          {[
            '📝 Use a text-based PDF (not a scanned image)',
            '🛠 List your Java skills, frameworks, and years of experience clearly',
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

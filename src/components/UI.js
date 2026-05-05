import React from 'react';

// ── Button ──
export function Button({ children, variant = 'primary', size = 'md', disabled, onClick, style, className = '' }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    border: 'none', borderRadius: '10px', fontFamily: 'var(--font-body)',
    fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s', opacity: disabled ? 0.4 : 1,
    whiteSpace: 'normal', textAlign: 'center',
  };
  const sizes = {
    sm: { padding: '0.45rem 1rem', fontSize: '13px' },
    md: { padding: '0.7rem 1.5rem', fontSize: '14px' },
    lg: { padding: '0.85rem 2rem', fontSize: '16px' },
  };
  const variants = {
    primary: { background: 'linear-gradient(135deg, #6366f1, #818cf8)', color: 'white' },
    secondary: { background: 'transparent', border: '1px solid rgba(99,102,241,0.3)', color: '#94a3b8' },
    danger: { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' },
    ghost: { background: 'transparent', color: '#94a3b8' },
    accent: { background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#000' },
  };
  return (
    <button onClick={!disabled ? onClick : undefined} className={className}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

// ── Card ──
export function Card({ children, style, className = '', glow = false, ...props }) {
  return (
    <div {...props} className={className} style={{
      background: 'rgba(26,26,46,0.6)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px',
      boxShadow: glow ? '0 0 40px rgba(99,102,241,0.1)' : 'none',
      ...style
    }}>
      {children}
    </div>
  );
}

// ── Spinner ──
export function Spinner({ size = 40, color = '#6366f1' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `3px solid rgba(99,102,241,0.2)`,
      borderTopColor: color, animation: 'spin 0.8s linear infinite'
    }} />
  );
}

// ── Badge ──
export function Badge({ children, color = '#6366f1' }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
      fontFamily: 'var(--font-mono)', fontWeight: 500,
      background: color + '22', color, border: `1px solid ${color}44`,
    }}>
      {children}
    </span>
  );
}

// ── Progress Bar ──
export function ProgressBar({ value, max = 100, color = '#6366f1', height = 6 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: '100%', height, background: 'rgba(255,255,255,0.06)', borderRadius: height }}>
      <div style={{
        width: `${pct}%`, height: '100%', borderRadius: height,
        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
        transition: 'width 0.6s ease',
      }} />
    </div>
  );
}

// ── Waveform animation ──
export function Waveform({ active }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '20px' }}>
      {[0, 0.1, 0.2, 0.3, 0.4].map((delay, i) => (
        <div key={i} style={{
          width: '3px', background: '#6366f1', borderRadius: '2px',
          height: active ? undefined : '3px',
          animation: active ? `wave 0.8s ease-in-out ${delay}s infinite` : 'none',
          transform: active ? undefined : 'scaleY(0.3)',
        }} />
      ))}
    </div>
  );
}

// ── Score Ring ──
export function ScoreRing({ score, size = 80 }) {
  const radius = (size - 10) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="16" fontWeight="700" fontFamily="var(--font-display)"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}>
        {score}
      </text>
    </svg>
  );
}

// ── Empty State ──
export function EmptyState({ icon, title, desc }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text3)' }}>
      <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{icon}</div>
      <div style={{ fontSize: '16px', color: 'var(--text2)', marginBottom: '0.5rem', fontWeight: 500 }}>{title}</div>
      <div style={{ fontSize: '13px' }}>{desc}</div>
    </div>
  );
}

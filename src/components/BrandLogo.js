import React, { useId } from 'react';

export default function BrandLogo({ size = 34, iconSize = 26, label = true, className = '', style = {} }) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <span
      className={`brand-logo ${className}`.trim()}
      style={{ display:'inline-flex', alignItems:'center', gap:'0.65rem', ...style }}
    >
      <span
        className="brand-logo-mark"
        style={{ width:size, height:size, display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 26 30" fill="none" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path d="M 1 26 A 17,17 0 0,1 25 26" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" fill="none" />
          <path d="M 1 26 A 17,17 0 0,1 20 7" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" fill="none" />
          <path d="M 4 26 L 9 16 L 4 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" fill="none" />
          <path d="M 9 16 L 18 26 L 22 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" fill="none" />
          <polyline points="18,12 22,8 26,12" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="4" cy="26" r="2.5" fill="#06b6d4" />
          <circle cx="9" cy="16" r="2.5" fill="#06b6d4" />
          <circle cx="18" cy="26" r="2.5" fill="#06b6d4" />
          <circle cx="22" cy="8" r="3" fill={`url(#${gradientId})`} />
        </svg>
      </span>
      {label && <span className="brand-logo-text">Assess<span>Arc</span></span>}
    </span>
  );
}

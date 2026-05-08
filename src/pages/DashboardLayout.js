import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import FeedbackWidget from '../components/FeedbackWidget';

const NAV = [
  { path:'interview',   icon:'🎤', label:'Interview',   desc:'Start a mock session' },
  { path:'performance', icon:'📈', label:'Performance',  desc:'Analytics & AI analysis' },
  { path:'history',     icon:'📋', label:'History',      desc:'Past sessions' },
  { path:'resume',      icon:'📄', label:'Resume',       desc:'Manage your resume' },
  { path:'wallet',      icon:'💰', label:'Wallet',       desc:'Credits & billing' },
];

export default function DashboardLayout({
  navItems = NAV,
  basePath = '/dashboard',
  sectionLabel = 'Menu',
  badgeLabel = '',
  showWallet = true,
  showFeedbackButton = true,
  maxWidth = 1040,
}) {
  const { user, signIn, signOut, wallet, refreshProfile } = useApp();
  const navigate = useNavigate();
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { refreshProfile(); }, []);

  const handleSignOut = () => { signOut(); navigate('/'); };
  const creditColor   = wallet < 5 ? '#ef4444' : wallet < 20 ? '#f59e0b' : '#10b981';

  const SidebarContent = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

      {/* Logo */}
      <div style={{ padding:'1.35rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          <div style={{ width:34, height:34, borderRadius:'9px', background:'linear-gradient(135deg,#6366f1,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', boxShadow:'0 0 18px rgba(99,102,241,0.4)' }}>⚡</div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'18px', letterSpacing:'-0.3px' }}>
            Java<span style={{ color:'#818cf8' }}>Drill</span>
          </span>
        </div>
      </div>

      {/* User chip */}
      <div style={{ padding:'1rem 1.1rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', marginBottom:'0.75rem' }}>
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
          ) : (
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
              {user?.avatar || '?'}
            </div>
          )}
          <div style={{ overflow:'hidden', flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize:'10px', color:'var(--text3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email}</div>
          </div>
        </div>
        {/* Wallet chip */}
        {showWallet && <div style={{ padding:'0.45rem 0.8rem', background:creditColor+'12', border:`1px solid ${creditColor}28`, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'11px', color:'var(--text3)' }}>💰 Credits</span>
          <span style={{ fontSize:'14px', fontWeight:700, color:creditColor, fontFamily:'var(--font-mono)' }}>{wallet}</span>
        </div>}
        {badgeLabel && <div style={{ padding:'0.45rem 0.8rem', background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.22)', borderRadius:'8px', color:'#818cf8', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>{badgeLabel}</div>}
      </div>

      {/* Nav links */}
      <nav style={{ padding:'0.75rem 0.65rem', flex:1, overflowY:'auto' }}>
        <div style={{ fontSize:'9px', color:'var(--text3)', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'0 0.75rem', marginBottom:'0.5rem' }}>{sectionLabel}</div>
        {navItems.map(item => (
          <NavLink key={item.path} to={`${basePath}/${item.path}`}
            onClick={() => setMobileOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'0.7rem',
              padding:'0.65rem 0.85rem', borderRadius:'10px', marginBottom:'2px',
              fontSize:'13.5px', fontWeight:500, transition:'all 0.2s',
              background:isActive?'rgba(99,102,241,0.14)':'transparent',
              color:isActive?'#818cf8':'var(--text2)',
              border:isActive?'1px solid rgba(99,102,241,0.22)':'1px solid transparent',
              textDecoration:'none',
            })}>
            <span style={{ fontSize:'16px', flexShrink:0, width:22, textAlign:'center' }}>{item.icon}</span>
            <div>
              <div style={{ lineHeight:1.2 }}>{item.label}</div>
              <div style={{ fontSize:'10px', color:'var(--text3)', marginTop:'1px' }}>{item.desc}</div>
            </div>
          </NavLink>
        ))}
      </nav>

      {/* Bottom buttons */}
      <div style={{ padding:'0.75rem 0.65rem', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
        {showFeedbackButton && <button onClick={() => setShowFeedback(true)} style={{
          width:'100%', padding:'0.55rem 0.85rem', borderRadius:'9px', marginBottom:'0.4rem',
          background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)',
          color:'#818cf8', fontSize:'12.5px', cursor:'pointer', transition:'all 0.2s',
          display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center',
        }}
          onMouseOver={e => e.currentTarget.style.background='rgba(99,102,241,0.16)'}
          onMouseOut={e  => e.currentTarget.style.background='rgba(99,102,241,0.08)'}>
          💬 Send Feedback
        </button>}
        {showWallet && <button onClick={async () => { await signIn(); await refreshProfile(); }} style={{
          width:'100%', padding:'0.5rem', borderRadius:'9px', marginBottom:'0.4rem',
          background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.15)',
          color:'#818cf8', fontSize:'12.5px', cursor:'pointer',
          display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center',
        }}>
          Link Google
        </button>}
        <button onClick={handleSignOut} style={{
          width:'100%', padding:'0.5rem', borderRadius:'9px',
          background:'transparent', border:'1px solid rgba(255,255,255,0.05)',
          color:'var(--text3)', fontSize:'12.5px', cursor:'pointer', transition:'all 0.2s',
          display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center',
        }}
          onMouseOver={e => { e.currentTarget.style.borderColor='rgba(239,68,68,0.3)'; e.currentTarget.style.color='#ef4444'; }}
          onMouseOut={e  => { e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; e.currentTarget.style.color='var(--text3)'; }}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>

      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{ width:242, flexShrink:0, background:'rgba(10,10,18,0.98)', backdropFilter:'blur(24px)', borderRight:'1px solid rgba(255,255,255,0.04)', display:'flex', flexDirection:'column', position:'fixed', top:0, bottom:0, left:0, zIndex:50 }}>
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="mobile-header" style={{ position:'fixed', top:0, left:0, right:0, zIndex:60, height:54, background:'rgba(8,8,14,0.98)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem' }}>
        <div><div className="home-logo">⚡</div>
          
        <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'17px' , marginLeft:'10px'}}>Java<span style={{ color:'#818cf8' }}>Drill</span></span>
       </div> <div style={{ display:'flex', alignItems:'center', gap:'0.65rem' }}>
          {showWallet
            ? <span style={{ fontFamily:'var(--font-mono)', fontSize:'13px', color:creditColor, fontWeight:700 }}>{wallet}cr</span>
            : badgeLabel && <span style={{ fontFamily:'var(--font-mono)', fontSize:'11px', color:'#818cf8', fontWeight:700 }}>{badgeLabel}</span>}
          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ width:34, height:34, borderRadius:'8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--text)', fontSize:'15px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:70, display:'flex' }} onClick={() => setMobileOpen(false)}>
          <div style={{ flex:1, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }} />
          <div style={{ width:256, background:'rgba(10,10,18,0.99)', backdropFilter:'blur(24px)', borderLeft:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ flex:1, overflow:'auto' }}><SidebarContent /></div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="main-content" style={{ flex:1, marginLeft:242, padding:'2.25rem', minHeight:'100vh', display:'flex', justifyContent:'center' }}>
        <div className="dashboard-content-frame" style={{ width:'100%', maxWidth }}>
          <Outlet />
        </div>
      </main>

      {showFeedback && <FeedbackWidget onClose={() => setShowFeedback(false)} />}

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-header   { display: flex !important; }
          .main-content    { margin-left: 0 !important; padding: 70px 1rem 2rem !important; }
        }
        @media (min-width: 769px) {
          .mobile-header { display: none !important; }
        }
      `}</style>
    </div>
  );
}

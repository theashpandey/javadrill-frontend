import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const NAV = [
  { path:'users', icon:'👥', label:'Users', desc:'Growth and activity' },
  { path:'feedback', icon:'💬', label:'Feedback', desc:'Messages and contacts' },
  { path:'gemini-monitoring', icon:'⚙', label:'Gemini Monitoring', desc:'API usage and health' },
];

export default function AdminDashboardLayout() {
  const { user, signOut } = useApp();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = () => {
    signOut();
    navigate('/');
  };

  const SidebarContent = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'1.35rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          <div className="home-logo" style={{ boxShadow:'0 0 18px rgba(99,102,241,0.4)' }}>⚡</div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'18px', letterSpacing:0 }}>
            Java<span style={{ color:'#818cf8' }}>Drill</span>
          </span>
        </div>
      </div>

      <div style={{ padding:'1rem 1.1rem', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.7rem' }}>
          {user?.photoUrl ? (
            <img src={user.photoUrl} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
          ) : (
            <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#6366f1,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:700, flexShrink:0 }}>
              {user?.avatar || 'A'}
            </div>
          )}
          <div style={{ overflow:'hidden', flex:1 }}>
            <div style={{ fontSize:'13px', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.name || 'Admin'}</div>
            <div style={{ fontSize:'10px', color:'var(--text3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user?.email}</div>
          </div>
        </div>
        <div style={{ marginTop:'0.8rem', padding:'0.45rem 0.75rem', borderRadius:8, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.22)', color:'#818cf8', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>
          Admin Panel
        </div>
      </div>

      <nav style={{ padding:'0.75rem 0.65rem', flex:1, overflowY:'auto' }}>
        <div style={{ fontSize:'9px', color:'var(--text3)', fontWeight:700, letterSpacing:'2px', textTransform:'uppercase', padding:'0 0.75rem', marginBottom:'0.5rem' }}>Admin</div>
        {NAV.map(item => (
          <NavLink key={item.path} to={`/admin/${item.path}`} onClick={() => setMobileOpen(false)}
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

      <div style={{ padding:'0.75rem 0.65rem', borderTop:'1px solid rgba(255,255,255,0.05)', display:'grid', gap:'0.4rem' }}>
        <button onClick={handleSignOut} style={dangerButtonStyle}>Sign Out</button>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)' }}>
      <aside className="admin-desktop-sidebar" style={{ width:242, flexShrink:0, background:'rgba(10,10,18,0.98)', backdropFilter:'blur(24px)', borderRight:'1px solid rgba(255,255,255,0.04)', display:'flex', flexDirection:'column', position:'fixed', top:0, bottom:0, left:0, zIndex:50 }}>
        <SidebarContent />
      </aside>

      <div className="admin-mobile-header" style={{ position:'fixed', top:0, left:0, right:0, zIndex:60, height:54, background:'rgba(8,8,14,0.98)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 1rem' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
          <div className="home-logo">⚡</div>
          <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'17px' }}>Java<span style={{ color:'#818cf8' }}>Drill</span></span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{ width:34, height:34, borderRadius:'8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--text)', fontSize:'15px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {mobileOpen ? '×' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:70, display:'flex' }} onClick={() => setMobileOpen(false)}>
          <div style={{ flex:1, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }} />
          <div style={{ width:256, background:'rgba(10,10,18,0.99)', backdropFilter:'blur(24px)', borderLeft:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ flex:1, overflow:'auto' }}><SidebarContent /></div>
          </div>
        </div>
      )}

      <main className="admin-main-content" style={{ flex:1, marginLeft:242, padding:'2.25rem', minHeight:'100vh', display:'flex', justifyContent:'center' }}>
        <div className="dashboard-content-frame" style={{ width:'100%', maxWidth:1120 }}>
          <Outlet />
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .admin-desktop-sidebar { display: none !important; }
          .admin-mobile-header { display: flex !important; }
          .admin-main-content { margin-left: 0 !important; padding: 70px 1rem 2rem !important; }
        }
        @media (min-width: 769px) {
          .admin-mobile-header { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const dangerButtonStyle = {
  width:'100%', padding:'0.5rem', borderRadius:'9px',
  background:'transparent', border:'1px solid rgba(255,255,255,0.05)',
  color:'var(--text3)', fontSize:'12.5px', cursor:'pointer',
};

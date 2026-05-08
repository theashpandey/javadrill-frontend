import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { Badge, Button, Card, Spinner } from '../components/UI';

const statusColors = {
  PENDING:'#f59e0b',
  APPROVED:'#818cf8',
  REJECTED:'#ef4444',
  DONE:'#10b981',
};

export default function AdminRedeemsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await apiCall('/api/admin/redeems') || []);
    } catch (e) {
      setError(e.message || 'Could not load redeem requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    setBusyId(`${id}:${action}`);
    setError('');
    try {
      await apiCall(`/api/admin/redeems/${id}/${action}`, {
        method:'POST',
        body: JSON.stringify({}),
      });
      await load();
    } catch (e) {
      setError(e.message || 'Action failed.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:'1rem', alignItems:'flex-start' }}>
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Redeem Requests</h2>
          <p style={{ color:'var(--text2)', fontSize:'14px' }}>Approve, reject, and mark wallet redeem payouts as done.</p>
        </div>
        <Button size="sm" variant="secondary" onClick={load} disabled={loading}>Refresh</Button>
      </div>

      {error && <Card style={{ padding:'1rem', color:'#ef4444', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>{error}</Card>}

      {loading ? (
        <div style={{ minHeight:'40vh', display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner /></div>
      ) : (
        <Card style={{ padding:'1.2rem', overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', minWidth:850, borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ color:'var(--text3)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'1px', textAlign:'left' }}>
                  <th style={th}>User</th><th style={th}>UPI</th><th style={th}>Amount</th><th style={th}>Status</th><th style={th}>Payout</th><th style={th}>Created</th><th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <td style={td}><b style={{ color:'var(--text)' }}>{item.userEmail || item.uid}</b><div style={{ color:'var(--text3)', fontSize:'11px' }}>{item.id}</div></td>
                    <td style={td}>{item.upiId}</td>
                    <td style={td}>₹{item.amount}</td>
                    <td style={td}><Badge color={statusColors[item.status] || '#94a3b8'}>{item.status}</Badge></td>
                    <td style={td}>{item.payoutId || '-'}</td>
                    <td style={td}>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : ''}</td>
                    <td style={{ ...td, minWidth:230 }}>
                      <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
                        {item.status === 'PENDING' && <Button size="sm" onClick={() => act(item.id, 'approve')} disabled={Boolean(busyId)}>Approve</Button>}
                        {['PENDING','APPROVED'].includes(item.status) && <Button size="sm" variant="danger" onClick={() => act(item.id, 'reject')} disabled={Boolean(busyId)}>Reject</Button>}
                        {item.status === 'APPROVED' && <Button size="sm" variant="secondary" onClick={() => act(item.id, 'done')} disabled={Boolean(busyId)}>Done</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!items.length && (
                  <tr><td colSpan="7" style={{ ...td, textAlign:'center', color:'var(--text3)', padding:'2rem' }}>No redeem requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

const th = { padding:'0.65rem 0.75rem', fontWeight:700 };
const td = { padding:'0.8rem 0.75rem', color:'var(--text2)', fontSize:'13px', verticalAlign:'top' };

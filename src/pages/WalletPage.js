import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiCall } from '../utils/api';
import { Card, Button, Spinner } from '../components/UI';

const PACKS = [
  { credits:10,  price:10,  label:'Single',  popular:false, bonus:0,  desc:'1 session' },
  { credits:35,  price:29,  label:'Starter', popular:false, bonus:5,  desc:'3-7 sessions' },
  { credits:70,  price:59,  label:'Pro',     popular:true,  bonus:10, desc:'7-14 sessions' },
  { credits:115, price:99,  label:'Elite',   popular:false, bonus:15, desc:'11-23 sessions' },
  { credits:220, price:199, label:'Titan',   popular:false, bonus:20, desc:'22-44 sessions' },
];

export default function WalletPage() {
  const { user, wallet, walletDetails, setWallet, setWalletDetails, refreshWallet } = useApp();
  const [selected, setSelected] = useState(null);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState('');
  const [isError, setIsError] = useState(false);
  const [txHistory, setTxHistory] = useState([]);
  const [upiId, setUpiId] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const paymentCompletedRef = useRef(false);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await apiCall('/api/wallet/transactions');
      setTxHistory(data || []);
    } catch {}
  }, []);

  useEffect(() => {
    refreshWallet();
    loadTransactions();
  }, [refreshWallet, loadTransactions]);

  useEffect(() => {
    setUpiId(walletDetails?.upiId || '');
  }, [walletDetails?.upiId]);

  const loadRazorpaySDK = () => new Promise((res, rej) => {
    if (window.Razorpay) { res(); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = res;
    s.onerror = () => rej(new Error('Failed to load payment gateway'));
    document.body.appendChild(s);
  });

  const handlePay = async () => {
    if (!selected) return;
    setPaying(true);
    setStatus('');
    setIsError(false);

    try {
      const order = await apiCall('/api/wallet/order', {
        method: 'POST',
        body: JSON.stringify({ creditPack: selected.credits }),
      });

      let checkout = null;
      paymentCompletedRef.current = false;
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        order_id: order.orderId,
        name: 'JavaDrill',
        description: `${selected.credits} Interview Credits`,
        theme: { color:'#6366f1' },
        prefill: {},
        modal: {
          ondismiss: () => {
            if (paymentCompletedRef.current) return;
            setPaying(false);
            setStatus('Payment cancelled.');
            setIsError(true);
          },
        },
        handler: async (response) => {
          paymentCompletedRef.current = true;
          setStatus('Payment captured. Verifying credits...');
          setIsError(false);
          checkout?.close?.();
          try {
            const verify = await apiCall('/api/wallet/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                creditPack: selected.credits,
              }),
            });
            if (verify.success) {
              if (typeof verify.newBalance === 'number') {
                setWallet(verify.newBalance);
                setWalletDetails(prev => ({
                  ...prev,
                  purchasedCredits: verify.purchasedCredits ?? prev.purchasedCredits,
                  bonusCredits: verify.bonusCredits ?? prev.bonusCredits,
                  totalCredits: verify.newBalance,
                  redeemableBalance: verify.purchasedCredits ?? prev.redeemableBalance,
                }));
              } else await refreshWallet();
              setStatus(`${selected.credits} credits added successfully.`);
              setIsError(false);
              setSelected(null);
              await loadTransactions();
            } else {
              setStatus('Payment verification failed. Contact support with your payment ID: ' + response.razorpay_payment_id);
              setIsError(true);
            }
          } catch (e) {
            setStatus('Verification error: ' + e.message);
            setIsError(true);
          } finally {
            setPaying(false);
          }
        },
      };

      if (!window.Razorpay) await loadRazorpaySDK();
      checkout = new window.Razorpay(options);
      checkout.open();
    } catch (e) {
      setStatus(e.message || 'Payment initiation failed.');
      setIsError(true);
      setPaying(false);
    }
  };

  const creditColor = wallet < 5 ? '#ef4444' : wallet < 20 ? '#f59e0b' : '#10b981';
  const purchasedCredits = walletDetails?.purchasedCredits ?? wallet;
  const bonusCredits = walletDetails?.bonusCredits ?? 0;
  const redeemableBalance = walletDetails?.redeemableBalance ?? purchasedCredits;
  const referralLink = user?.referralCode ? `${window.location.origin}/?ref=${user.referralCode}` : '';

  const copyReferral = async () => {
    if (!referralLink) return;
    await navigator.clipboard?.writeText(referralLink);
    setStatus('Referral link copied. You get 10 credits when a new user joins with it.');
    setIsError(false);
  };

  const saveUpi = async () => {
    try {
      const data = await apiCall('/api/wallet/upi', {
        method: 'POST',
        body: JSON.stringify({ upiId }),
      });
      const total = data.totalCredits ?? data.credits ?? wallet;
      setWallet(total);
      setWalletDetails({
        purchasedCredits: data.purchasedCredits ?? total,
        bonusCredits: data.bonusCredits ?? 0,
        totalCredits: total,
        redeemableBalance: data.redeemableBalance ?? data.purchasedCredits ?? total,
        upiId: data.upiId || upiId,
      });
      setStatus('UPI ID saved.');
      setIsError(false);
    } catch (e) {
      setStatus(e.message || 'Could not save UPI ID.');
      setIsError(true);
    }
  };

  const submitRedeem = async (amountValue) => {
    const amount = Number(amountValue || redeemAmount);
    if (!amount || amount <= 0) {
      setStatus('Enter a valid redeem amount.');
      setIsError(true);
      return;
    }
    setRedeeming(true);
    setStatus('');
    try {
      const data = await apiCall('/api/wallet/redeem', {
        method: 'POST',
        body: JSON.stringify({ amount, upiId }),
      });
      setWallet(data.totalCredits ?? 0);
      setWalletDetails(prev => ({
        ...prev,
        purchasedCredits: data.purchasedCredits ?? 0,
        bonusCredits: data.bonusCredits ?? 0,
        totalCredits: data.totalCredits ?? 0,
        redeemableBalance: data.purchasedCredits ?? 0,
        upiId,
      }));
      setRedeemAmount('');
      setStatus(data.message || 'Redeem request submitted.');
      setIsError(false);
      await loadTransactions();
    } catch (e) {
      setStatus(e.message || 'Redeem request failed.');
      setIsError(true);
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div style={{ maxWidth:980, display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      <style>{`
        .wallet-page-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
          gap: 1.25rem;
          align-items: start;
        }
        .wallet-main,
        .wallet-side {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-width: 0;
        }
        .wallet-side {
          position: sticky;
          top: 1rem;
        }
        @media (max-width: 900px) {
          .wallet-page-grid {
            grid-template-columns: 1fr;
          }
          .wallet-side {
            position: static;
          }
        }
      `}</style>

      <div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.4rem' }}>Wallet</h2>
        <p style={{ color:'var(--text2)', fontSize:'14px' }}>Credits deducted per session. 30 min = 5 credits. 60 min = 10 credits. Never expire.</p>
      </div>

      <div className="wallet-page-grid">
        <div className="wallet-main">
          {user?.referralCode && (
            <Card style={{ padding:'1.15rem', background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.22)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'1rem', flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#818cf8', fontWeight:700, textTransform:'uppercase', letterSpacing:'1px', marginBottom:'0.35rem' }}>Invite & Earn</div>
                  <div style={{ fontSize:'14px', color:'var(--text)', fontWeight:600 }}>Share your code: <span style={{ fontFamily:'var(--font-mono)', color:'#a78bfa' }}>{user.referralCode}</span></div>
                  <div style={{ fontSize:'12.5px', color:'var(--text2)', marginTop:'0.3rem' }}>Earn 10 credits when a new user signs up from your link.</div>
                </div>
                <Button size="sm" onClick={copyReferral}>Copy Link</Button>
              </div>
            </Card>
          )}

          <Card style={{ padding:'2rem', background:'linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.07))', border:'1px solid rgba(99,102,241,0.35)' }}>
            <div style={{ fontSize:'13px', color:'var(--text3)', marginBottom:'0.5rem', textTransform:'uppercase', letterSpacing:'1px' }}>Current Balance</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'48px', fontWeight:800, color:creditColor, lineHeight:1, marginBottom:'0.5rem' }}>
              {wallet}
              <span style={{ fontSize:'20px', color:'var(--text3)', marginLeft:'0.5rem', fontWeight:400 }}>credits</span>
            </div>
            <div style={{ fontSize:'13px', color:'var(--text2)' }}>
              About {Math.floor(wallet / 10)} full sessions or {Math.floor(wallet / 5)} quick sessions.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.65rem', marginTop:'1rem' }}>
              <MiniStat label="Purchased" value={purchasedCredits} />
              <MiniStat label="Bonus" value={bonusCredits} />
              <MiniStat label="Redeemable" value={redeemableBalance} />
            </div>
            {wallet < 5 && (
              <div style={{ marginTop:'0.85rem', padding:'0.6rem 0.85rem', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'8px', fontSize:'12px', color:'#ef4444' }}>
                Low balance. Top up to continue practising.
              </div>
            )}
          </Card>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:'0.75rem' }}>
            {PACKS.map(pack => (
              <div key={pack.credits} onClick={() => setSelected(pack)} style={{
                padding:'1.1rem', borderRadius:'14px', cursor:'pointer', transition:'all 0.25s', textAlign:'center', position:'relative',
                border: selected?.credits===pack.credits ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.06)',
                background: selected?.credits===pack.credits ? 'rgba(99,102,241,0.14)' : 'rgba(20,20,42,0.5)',
                boxShadow: selected?.credits===pack.credits ? '0 0 20px rgba(99,102,241,0.12)' : 'none',
              }}>
                {pack.popular && (
                  <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', fontSize:'9px', padding:'2px 8px', borderRadius:'100px', background:'#6366f1', color:'white', fontWeight:700, whiteSpace:'nowrap' }}>
                    POPULAR
                  </div>
                )}
                <div style={{ fontWeight:600, fontSize:'13px', marginBottom:'0.2rem' }}>{pack.label}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:700, color:'#818cf8', marginBottom:'0.2rem' }}>Rs {pack.price}</div>
                <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:'0.2rem' }}>{pack.credits} credits</div>
                {pack.bonus > 0 && <div style={{ fontSize:'10px', color:'#10b981', marginBottom:'0.2rem' }}>+{pack.bonus} bonus</div>}
                <div style={{ fontSize:'10px', color:'var(--text3)' }}>{pack.desc}</div>
              </div>
            ))}
          </div>

          {status && (
            <div style={{ padding:'0.75rem 1rem', borderRadius:10, fontSize:'13px',
              background:isError?'rgba(239,68,68,0.08)':'rgba(16,185,129,0.08)',
              border:isError?'1px solid rgba(239,68,68,0.2)':'1px solid rgba(16,185,129,0.2)',
              color:isError?'#ef4444':'#10b981',
            }}>{status}</div>
          )}

          <Button onClick={handlePay} disabled={!selected || paying} size="lg" style={{ width:'100%' }}>
            {paying ? <><Spinner size={18} color="white" /> Processing...</>
              : selected ? `Pay Rs ${selected.price} - Get ${selected.credits} Credits`
              : 'Select a Pack to Continue'}
          </Button>

          <div style={{ fontSize:'12px', color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
            Secure payment via Razorpay. Credits never expire. No subscription.
          </div>

          <Card style={{ padding:'1.25rem' }}>
            <div style={{ fontSize:'12px', fontWeight:700, color:'var(--text2)', marginBottom:'0.75rem', textTransform:'uppercase', letterSpacing:'1px' }}>Redeem Purchased Credits</div>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) auto', gap:'0.65rem', alignItems:'end', marginBottom:'0.75rem' }}>
              <label style={{ display:'grid', gap:'0.35rem', fontSize:'12px', color:'var(--text3)' }}>
                UPI ID
                <input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="name@upi" style={inputStyle} />
              </label>
              <Button size="sm" variant="secondary" onClick={saveUpi}>Save</Button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) auto auto', gap:'0.65rem', alignItems:'end' }}>
              <label style={{ display:'grid', gap:'0.35rem', fontSize:'12px', color:'var(--text3)' }}>
                Amount
                <input type="number" min="1" max={redeemableBalance} value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} placeholder={`Max ${redeemableBalance}`} style={inputStyle} />
              </label>
              <Button size="sm" variant="secondary" disabled={!redeemableBalance || redeeming} onClick={() => submitRedeem(redeemableBalance)}>Full</Button>
              <Button size="sm" disabled={!redeemableBalance || redeeming} onClick={() => submitRedeem()}>{redeeming ? 'Sending...' : 'Redeem'}</Button>
            </div>
            <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:'0.7rem', lineHeight:1.5 }}>
              Only purchased credits are redeemable. Creating any redeem request resets current bonus credits to 0.
            </div>
          </Card>
        </div>

        <aside className="wallet-side">
          <Card style={{ padding:'1.1rem' }}>
            <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text2)', marginBottom:'0.75rem', textTransform:'uppercase', letterSpacing:'1px' }}>How Credits Work</div>
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {[
                ['30 min session','5 credits','Rs 5'],
                ['60 min session','10 credits','Rs 10'],
              ].map(([label, cr, price]) => (
                <div key={label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem', fontSize:'13px', padding:'0.5rem 0', borderBottom:'1px solid var(--border2)' }}>
                  <span style={{ color:'var(--text2)' }}>{label}</span>
                  <span style={{ fontFamily:'var(--font-mono)', color:'#818cf8' }}>{cr}</span>
                  <span style={{ color:'var(--text3)' }}>{price}</span>
                </div>
              ))}
            </div>
          </Card>

          {txHistory.length > 0 && (
            <Card style={{ padding:'1.1rem' }}>
              <div style={{ fontSize:'12px', fontWeight:600, color:'var(--text2)', marginBottom:'0.75rem', textTransform:'uppercase', letterSpacing:'1px' }}>Recent Transactions</div>
              {txHistory.slice(0,8).map((tx, i) => {
                const isCredit = ['credit','RECHARGE','BONUS','REDEEM_REFUND','REFERRAL_BONUS','FIRST_LOGIN_BONUS'].includes(tx.type);
                const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '';
                return (
                  <div key={tx.id || i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', padding:'0.65rem 0', borderBottom: i<Math.min(txHistory.length,8)-1?'1px solid var(--border2)':'none', fontSize:'13px' }}>
                    <div style={{ color:'var(--text2)', minWidth:0 }}>
                      <div style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{tx.description || (isCredit ? 'Credits added' : 'Credits used')}</div>
                      <div style={{ color:'var(--text3)', fontSize:'11px', marginTop:'2px' }}>{date}{tx.razorpayPaymentId ? ` - ${tx.razorpayPaymentId}` : ''}</div>
                    </div>
                    <div style={{ color:isCredit?'#10b981':'#ef4444', fontFamily:'var(--font-mono)', fontWeight:600, flexShrink:0 }}>
                      {isCredit ? '+' : '-'}{tx.amount}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ padding:'0.65rem', borderRadius:10, background:'rgba(8,8,18,0.38)', border:'1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:'16px', color:'var(--text)', fontWeight:700 }}>{value ?? 0}</div>
      <div style={{ color:'var(--text3)', fontSize:'10px', marginTop:'2px' }}>{label}</div>
    </div>
  );
}

const inputStyle = {
  width:'100%',
  minHeight:40,
  borderRadius:10,
  border:'1px solid rgba(255,255,255,0.08)',
  background:'rgba(8,8,18,0.7)',
  color:'var(--text)',
  padding:'0 0.75rem',
};

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  firebaseSignOut,
  subscribeToAuthState,
  toUserData,
  completeRedirectSignIn,
} from '../utils/firebase';
import { apiCall } from '../utils/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [wallet, setWallet]   = useState(0);
  const [hasResume, setHasResume] = useState(false);
  const [interviewRole, setInterviewRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const captureReferralCodeFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) localStorage.setItem('javadrill_referral_code', ref.trim().toUpperCase());
  };

  const getPendingReferralCode = () => {
    captureReferralCodeFromUrl();
    const code = localStorage.getItem('javadrill_referral_code');
    return code ? code.trim().toUpperCase() : '';
  };

  const applyProfile = useCallback((userData, profile) => {
    const merged = { ...userData, ...profile };
    setUser(merged);
    setWallet(profile.walletCredits ?? 0);
    setHasResume(profile.hasResume ?? false);
    setInterviewRole(profile.interviewRole || '');
    setExperienceLevel(profile.experienceLevel || '');
  }, []);

  useEffect(() => {
    captureReferralCodeFromUrl();

    completeRedirectSignIn().catch((error) => {
      console.error('Redirect sign in failed:', error);
    });

    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setWallet(0);
        setHasResume(false);
        setInterviewRole('');
        setExperienceLevel('');
        setHistory([]);
        setAuthReady(true);
        return;
      }

      try {
        const userData = toUserData(firebaseUser);
        const referralCode = getPendingReferralCode();
        const profile = await apiCall('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ referralCode }),
        });
        if (profile?.isNewUser) localStorage.removeItem('javadrill_referral_code');
        applyProfile(userData, profile);
      } catch (error) {
        console.error('Session restore failed:', error);
        await firebaseSignOut();
        setUser(null);
        setWallet(0);
        setHasResume(false);
        setInterviewRole('');
        setExperienceLevel('');
        setHistory([]);
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, [applyProfile]);

  const signIn = async () => {
    try {
      setLoading(true);
      const userData = await signInWithGoogle();
      if (!userData) return;
      const referralCode = getPendingReferralCode();
      const profile  = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ referralCode }),
      });
      if (profile?.isNewUser) localStorage.removeItem('javadrill_referral_code');
      applyProfile(userData, profile);
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithEmail = async ({ mode, fullName, email, password }) => {
    try {
      setLoading(true);
      const userData = mode === 'signup'
        ? await signUpWithEmail({ fullName, email, password })
        : await signInWithEmail({ email, password });
      const referralCode = getPendingReferralCode();
      const profile = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ referralCode }),
      });
      if (profile?.isNewUser) localStorage.removeItem('javadrill_referral_code');
      applyProfile(userData, profile);
    } catch (error) {
      console.error('Email authentication failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut();
    setUser(null);
    setWallet(0);
    setHasResume(false);
    setInterviewRole('');
    setExperienceLevel('');
    setHistory([]);
  };

  const refreshWallet = useCallback(async () => {
    try {
      const data = await apiCall('/api/wallet/balance');
      setWallet(data.credits ?? 0);
    } catch {}
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiCall('/api/auth/me');
      setWallet(data.walletCredits ?? 0);
      setHasResume(data.hasResume ?? false);
      setInterviewRole(data.interviewRole || '');
      setExperienceLevel(data.experienceLevel || '');
      setUser(prev => prev ? { ...prev, ...data } : prev);
    } catch {}
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const data = await apiCall('/api/interview/history');
      setHistory(data || []);
      return data || [];
    } catch (error) {
      console.error('History fetch failed:', error);
      throw error;
    }
  }, []);

  const deductWallet = useCallback((amt) => setWallet(p => Math.max(0, p - amt)), []);
  const addWallet    = useCallback((amt) => setWallet(p => p + amt), []);

  return (
    <AppContext.Provider value={{
      user, signIn, signOut, loading,
      authenticateWithEmail,
      authReady,
      wallet, setWallet, deductWallet, addWallet, refreshWallet,
      hasResume, setHasResume,
      interviewRole, setInterviewRole,
      experienceLevel, setExperienceLevel,
      history, setHistory, fetchHistory,
      refreshProfile, apiCall,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);

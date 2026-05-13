import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { apiCall } from '../utils/api';
import { useVoice } from '../hooks/useVoice';
import Editor from '@monaco-editor/react';
import {
  CAT_COLORS,
  INTERVIEW_ROLES,
  EXPERIENCE_LEVELS,
  getRoleLabel,
  getExperienceLabel,
  formatCategoryLabel,
} from '../utils/gemini';
import { Button, Card, Spinner, Badge, Waveform, ProgressBar, ScoreRing } from '../components/UI';

const PRICE      = { 30: 10, 60: 15 };
const SCREENS    = { HOME: 'home', INTERVIEW: 'interview', REPORT: 'report' };
const INITIAL_SILENT_SEC = 14;
const ANSWER_PAUSE_SEC = 10;
const SPEECH_ACTIVITY_GRACE_MS = 1800;
const MIN_CONTINUE_SECONDS = 90;
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export default function InterviewPage() {
  const {
    wallet, setWallet, deductWallet, refreshWallet,
    hasResume, setHasResume,
    interviewRole, setInterviewRole,
    experienceLevel, setExperienceLevel,
  } = useApp();
  const voice = useVoice();

  const [screen, setScreen]       = useState(SCREENS.HOME);
  const [duration, setDuration]   = useState(null);
  const [error, setError]         = useState('');
  const [loadingMsg, setLoadingMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResumePopup, setShowResumePopup] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState('');

  // Interview runtime state
  const [sessionQs, setSessionQs]   = useState([]);
  const [answers, setAnswers]       = useState([]);
  const [feedbacks, setFeedbacks]   = useState([]);
  const [currentQ, setCurrentQ]     = useState(0);
  const [aiText, setAiText]         = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [micReady, setMicReady]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingNextQuestion, setLoadingNextQuestion] = useState(false);
  const [finalScores, setFinalScores] = useState(null);
  const [completionMessage, setCompletionMessage] = useState('');
  const [interviewId, setInterviewId] = useState(null);

  // Coding state
  const [isCodingQuestion, setIsCodingQuestion] = useState(false);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('java');
  const [codingTimer, setCodingTimer] = useState(0);
  const [codingTimerRunning, setCodingTimerRunning] = useState(false);
  const [codingStartTime, setCodingStartTime] = useState(null);

  // Timer
  const [timeLeft, setTimeLeft]       = useState(0);
  const [silentCount, setSilentCount] = useState(0);
  const [silentLimit, setSilentLimit] = useState(INITIAL_SILENT_SEC);
  const [autoWarn, setAutoWarn]       = useState(false);
  const [prepareCount, setPrepareCount] = useState(null);
  const timerRef      = useRef(null);
  const silentRef     = useRef(null);
  const prepareRef    = useRef(null);
  const silentCntRef  = useRef(0);
  const codingTimerRef = useRef(null);

  // Stable refs
  const answersRef    = useRef([]);
  const feedbacksRef  = useRef([]);
  const sessionQsRef  = useRef([]);
  const currentQRef   = useRef(0);
  const transcriptRef = useRef('');
  const lastTxRef     = useRef('');
  const interviewIdRef = useRef(null);
  const timeLeftRef   = useRef(0);
  const submittingRef = useRef(false);
  const isCodingQuestionRef = useRef(false);
  const codeRef = useRef('');
  const languageRef = useRef('java');
  const codingStartTimeRef = useRef(null);
  const completingRef = useRef(false);
  const silencePromptedRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const speechActiveRef = useRef(false);

  useEffect(() => { answersRef.current   = answers;   }, [answers]);
  useEffect(() => { feedbacksRef.current = feedbacks; }, [feedbacks]);
  useEffect(() => { sessionQsRef.current = sessionQs; }, [sessionQs]);
  useEffect(() => { currentQRef.current  = currentQ;  }, [currentQ]);
  useEffect(() => { timeLeftRef.current  = timeLeft;  }, [timeLeft]);
  useEffect(() => { isCodingQuestionRef.current = isCodingQuestion; }, [isCodingQuestion]);
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { languageRef.current = language; }, [language]);
  useEffect(() => { codingStartTimeRef.current = codingStartTime; }, [codingStartTime]);

  useEffect(() => () => {
    voice.stopSpeaking(); voice.stopListening();
    clearInterval(timerRef.current); clearInterval(silentRef.current); clearInterval(prepareRef.current); clearInterval(codingTimerRef.current);
  }, []);

  const clearPrepareTimer = useCallback(() => {
    clearInterval(prepareRef.current);
    prepareRef.current = null;
    setPrepareCount(null);
  }, []);

  const codingDraftKey = useCallback((question) => {
    if (!interviewIdRef.current || !question?.id) return '';
    return `assessarc_coding_draft_${interviewIdRef.current}_${question.id}`;
  }, []);

  useEffect(() => {
    if (!isCodingQuestion) return;
    const question = sessionQsRef.current[currentQRef.current];
    const key = codingDraftKey(question);
    if (key) localStorage.setItem(key, code);
  }, [code, isCodingQuestion, codingDraftKey]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (screen === SCREENS.INTERVIEW && (codeRef.current.trim() || voice.transcript?.trim())) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [screen, voice.transcript]);

  // ── Format MM:SS ──
  const fmt = secs => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const codingPromptSummary = (question) => {
    const parsed = buildCodingPrompt(question);
    return parsed.title || parsed.description || question?.question || 'Coding problem';
  };

  // ── Start countdown timer ──
  const startTimer = useCallback((mins) => {
    const total = mins * 60;
    setTimeLeft(total);
    timeLeftRef.current = total;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        timeLeftRef.current = next;
        if (next <= 0) { clearInterval(timerRef.current); handleTimeUp(); return 0; }
        return next;
      });
    }, 1000);
  }, []);

  const handleTimeUp = useCallback(() => {
    clearInterval(silentRef.current);
    clearInterval(codingTimerRef.current);
    setCodingTimerRunning(false);
    voice.stopListening();
    voice.speak("Time's up! You did great. Let me compile your results now.", () => doShowReport({ submitCurrent: true }));
  }, [voice]);

  // ── Silent auto-submit ──
  const startSilentTimer = useCallback(() => {
    clearInterval(silentRef.current);
    const limit = transcriptRef.current.trim().length > 2 ? ANSWER_PAUSE_SEC : INITIAL_SILENT_SEC;
    silentCntRef.current = 0;
    setSilentLimit(limit);
    setSilentCount(0); setAutoWarn(false);

    silentRef.current = setInterval(() => {
      const recentlySpeaking = speechActiveRef.current || (Date.now() - lastSpeechAtRef.current < SPEECH_ACTIVITY_GRACE_MS);
      if (recentlySpeaking) {
        silentCntRef.current = 0;
        setSilentCount(0);
        setAutoWarn(false);
        return;
      }
      silentCntRef.current += 1;
      setSilentCount(silentCntRef.current);
      if (silentCntRef.current >= limit - 2) setAutoWarn(true);
      if (silentCntRef.current >= limit) {
        clearInterval(silentRef.current);
        setAutoWarn(false); setSilentCount(0);
        if (transcriptRef.current.trim().length > 2) {
          submitAnswer();
        } else {
          voice.stopListening();
          setMicReady(false);
          if (!silencePromptedRef.current) {
            silencePromptedRef.current = true;
            voice.speak("Take your time. You can start with whatever comes to mind, even a rough answer is fine.", () => {
              setMicReady(true);
              voice.startListening((display, final, meta) => {
                speechActiveRef.current = Boolean(meta?.hasInterim);
                if (meta?.activeSpeech) lastSpeechAtRef.current = meta.lastSpeechAt || Date.now();
                transcriptRef.current = display;
                if (display !== lastTxRef.current) {
                  lastTxRef.current = display;
                  startSilentTimer();
                }
              });
              startSilentTimer();
            });
          } else {
            const qIndex = currentQRef.current;
            const fb = "No worries, let's keep the momentum. We can move to the next one.";
            const answerUpd = [...answersRef.current];
            answerUpd[qIndex] = '(no answer)';
            setAnswers(answerUpd); answersRef.current = answerUpd;

            const upd = [...feedbacksRef.current]; upd[qIndex] = fb;
            setFeedbacks(upd); feedbacksRef.current = upd;
            setFeedbackText(fb); setShowFeedback(true);

            voice.speak(fb, () => {
              setTimeout(() => {
                if (timeLeftRef.current > MIN_CONTINUE_SECONDS) {
                  nextQuestion();
                }
              }, 1200);
            });
          }
        }
      }
    }, 1000);
  }, []);

  // ── Resume upload ──
  const handleResumeFile = async (file) => {
    setResumeError('');
    if (!file) return;
    const allowed = ['application/pdf', 'text/plain'];
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(file.type) && !['pdf','txt'].includes(ext)) {
      setResumeError('Please upload a PDF or TXT file.'); return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      setResumeError('File too large. Maximum size is 5MB.'); return;
    }
    setUploadingResume(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await apiCall('/api/resume/upload', { method: 'POST', body: fd });
      setHasResume(true);
      setShowResumePopup(false);
      setResumeError('');
    } catch (e) {
      setResumeError(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploadingResume(false);
    }
  };

  const saveInterviewPreferences = async (role, level) => {
    setPrefsError('');
    setSavingPrefs(true);
    try {
      const data = await apiCall('/api/profile/interview-preferences', {
        method: 'POST',
        body: JSON.stringify({ interviewRole: role, experienceLevel: level }),
      });
      setInterviewRole(data.interviewRole || role);
      setExperienceLevel(data.experienceLevel || level);
    } catch (e) {
      setPrefsError(e.message || 'Could not save role and experience. Please try again.');
      throw e;
    } finally {
      setSavingPrefs(false);
    }
  };

  // ── Start Interview ──
  const startInterview = async (dur) => {
    if (!hasResume) { setShowResumePopup(true); return; }
    if (!interviewRole || !experienceLevel) { setPrefsError('Please save your interview role and experience level first.'); return; }
    if (wallet < PRICE[dur]) { setError(`Need ${PRICE[dur]} credits. You have ${wallet}.`); return; }

    setIsLoading(true); setError('');
    deductWallet(PRICE[dur]);

    try {
      setLoadingMsg('Analysing your resume and tailoring questions...');
      const data = await apiCall('/api/interview/start', {
        method: 'POST',
        body: JSON.stringify({ durationMinutes: dur, interviewRole, experienceLevel }),
      });

      const qs = data.questions || [];
      if (qs.length < 1) throw new Error('Could not generate questions. Please try again.');

      if (typeof data.walletBalance === 'number') setWallet(data.walletBalance);
      setInterviewId(data.interviewId);
      interviewIdRef.current = data.interviewId;
      setSessionQs(qs);       sessionQsRef.current   = qs;
      setAnswers(Array(qs.length).fill(''));
      setFeedbacks(Array(qs.length).fill(''));
      answersRef.current   = Array(qs.length).fill('');
      feedbacksRef.current = Array(qs.length).fill('');
      setCurrentQ(0);         currentQRef.current    = 0;
      setDuration(dur);
      setScreen(SCREENS.INTERVIEW);
      startTimer(dur);
      setTimeout(() => askQuestion(0, qs), 300);
    } catch (err) {
      // Refund credits on failure
      await refreshWallet();
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false); setLoadingMsg('');
    }
  };

  // ── Ask question — speak with natural intro ──
  const askQuestion = useCallback((idx, qs) => {
    const qList = qs || sessionQsRef.current;
    const q     = qList[idx];
    if (!q) return;

    clearInterval(silentRef.current);
    clearInterval(codingTimerRef.current);
    setCodingTimerRunning(false);
    clearPrepareTimer();
    setShowFeedback(false); setFeedbackText('');
    setMicReady(false);
    transcriptRef.current = '';
    lastTxRef.current     = '';
    silencePromptedRef.current = false;
    voice.resetTranscript();

    // Check if coding question
    const isCoding = q.type === 'coding';
    setIsCodingQuestion(isCoding);

    if (isCoding) {
      // Setup coding mode
      const codingData = q.codingData || {};
      setLanguage(codingData.language || 'java');
      languageRef.current = codingData.language || 'java';
      const savedDraft = localStorage.getItem(codingDraftKey(q)) || '';
      setCode(savedDraft);
      codeRef.current = savedDraft;
      setCodingStartTime(null);
      codingStartTimeRef.current = null;

      // Set coding timer based on difficulty and session duration
      const timerMinutes = duration === 30 ? 10 : (q.difficulty === 'easy' ? 10 : 20);
      setCodingTimer(timerMinutes * 60);

      // Speak the question
      const fullText = (idx === 0 ? `Hi! I'm Sarah, your ${getRoleLabel(interviewRole)} interviewer today. ` : "Next question — ") + codingPromptSummary(q);
      setAiText(fullText);
      voice.speak(fullText, () => {
        const startedAt = Date.now();
        setCodingStartTime(startedAt);
        codingStartTimeRef.current = startedAt;
        setCodingTimerRunning(true);
        codingTimerRef.current = setInterval(() => {
          setCodingTimer(prev => {
            if (prev <= 1) {
              clearInterval(codingTimerRef.current);
              setCodingTimerRunning(false);
              submitCodingAnswer({ auto: true });
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      });
    } else {
      // Normal text question
      // Natural conversational intros — vary them
      const intros = idx === 0
        ? `Hi! I'm Sarah, your ${getRoleLabel(interviewRole)} interviewer today. Let's get started with something to warm up. `
        : (() => {
            const prev = answersRef.current[idx - 1] || '';
            const picks = prev.length > 180
              ? ["Great, I appreciate that detailed answer! Moving on — ", "That's a solid response! Let me ask you something different. ", "Nice explanation! Next question — "]
              : prev.length > 50
              ? ["Noted, thanks. Here's the next one. ", "Alright, let's continue. ", "Good. Moving on — "]
              : ["Okay, next question. ", "Alright — ", "Let's try this one. "];
            return picks[idx % picks.length];
          })();

      const fullText = intros + q.question;
      setAiText(fullText);

      voice.speak(fullText, () => {
        clearPrepareTimer();
        let remaining = INITIAL_SILENT_SEC;
        setPrepareCount(remaining);
        prepareRef.current = setInterval(() => {
          remaining -= 1;
          setPrepareCount(remaining);
          if (remaining <= 0) {
            clearPrepareTimer();
            setMicReady(true);
            voice.startListening((display, final, meta) => {
              speechActiveRef.current = Boolean(meta?.hasInterim);
              if (meta?.activeSpeech) lastSpeechAtRef.current = meta.lastSpeechAt || Date.now();
              transcriptRef.current = display || final || '';
              if (display !== lastTxRef.current) {
                lastTxRef.current = display;
                clearInterval(silentRef.current);
                silentCntRef.current = 0;
                setSilentCount(0); setAutoWarn(false);
                startSilentTimer();
              }
            });
            startSilentTimer();
          }
        }, 1000);
      });
    }
  }, [voice, startSilentTimer, interviewRole, duration, codingDraftKey]);

  const submitAnswer = useCallback(async () => {
    if (submittingRef.current) return;
    const qIndex = currentQRef.current;
    const question = sessionQsRef.current[qIndex];
    const questionId = question?.id;
    if (!interviewIdRef.current || !question) return;

    submittingRef.current = true;
    const ans = (transcriptRef.current || voice.transcript || '').trim();
    clearInterval(silentRef.current);
    setSilentCount(0); setAutoWarn(false);
    voice.stopListening();
    setSubmitting(true); setMicReady(false);

    const upd = [...answersRef.current];
    upd[qIndex] = ans || '(no answer)';
    setAnswers(upd); answersRef.current = upd;

    try {
      const res = await apiCall('/api/interview/submit', {
        method: 'POST',
        body: JSON.stringify({
          interviewId: interviewIdRef.current,
          questionId,
          answer:      ans || '',
          questionIndex: qIndex,
        }),
      });

      const fb = res.feedback || "Good effort! Let's keep going.";
      const fupd = [...feedbacksRef.current]; fupd[qIndex] = fb;
      setFeedbacks(fupd); feedbacksRef.current = fupd;
      setFeedbackText(fb); setShowFeedback(true);

      // Speak feedback → auto-advance if time left
      voice.speak(fb, () => {
        setTimeout(() => {
          if (currentQRef.current !== qIndex) return;
          if (timeLeftRef.current > MIN_CONTINUE_SECONDS) {
            nextQuestion();
          }
        }, 1200);
      });
    } catch {
      const fb = "Got it! Let's continue.";
      const fupd = [...feedbacksRef.current]; fupd[qIndex] = fb;
      setFeedbacks(fupd); feedbacksRef.current = fupd;
      setFeedbackText(fb); setShowFeedback(true);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [voice]);

  const submitCodingAnswer = useCallback(async ({ auto = false, advance = true } = {}) => {
    if (submittingRef.current) return;
    const qIndex = currentQRef.current;
    const question = sessionQsRef.current[qIndex];
    const questionId = question?.id;
    if (!interviewIdRef.current || !question) return;

    submittingRef.current = true;
    const currentCode = codeRef.current || '';
    const currentLanguage = languageRef.current || 'java';
    const startedAt = codingStartTimeRef.current;
    const timeTakenMs = startedAt ? Date.now() - startedAt : 0;
    clearInterval(codingTimerRef.current);
    setCodingTimerRunning(false);
    setSubmitting(true);

    const upd = [...answersRef.current];
    upd[qIndex] = currentCode.trim() || '(no code submitted)';
    setAnswers(upd); answersRef.current = upd;

    try {
      const res = await apiCall('/api/interview/submit-coding', {
        method: 'POST',
        body: JSON.stringify({
          interviewId: interviewIdRef.current,
          questionId,
          code: currentCode.trim(),
          language: currentLanguage,
          timeTakenMs,
          questionIndex: qIndex,
        }),
      });

      const fb = res.feedback || "Code submitted! Let's keep going.";
      const key = codingDraftKey(question);
      const shouldAdvanceAfterCodingFeedback = advance;
      if (key) localStorage.removeItem(key);
      if (!shouldAdvanceAfterCodingFeedback) return;
      const fupd = [...feedbacksRef.current]; fupd[qIndex] = fb;
      setFeedbacks(fupd); feedbacksRef.current = fupd;
      setFeedbackText(fb); setShowFeedback(true);

      // Speak feedback → auto-advance if time left
      voice.speak(fb, () => {
        setTimeout(() => {
          if (currentQRef.current !== qIndex) return;
          if (timeLeftRef.current > MIN_CONTINUE_SECONDS) {
            nextQuestion();
          }
        }, 1200);
      });
    } catch (e) {
      const fb = auto
        ? "Time is up. I saved your code locally for this screen, but could not send it for analysis right now."
        : "I could not submit the code right now. Please try again.";
      const fupd = [...feedbacksRef.current]; fupd[qIndex] = fb;
      setFeedbacks(fupd); feedbacksRef.current = fupd;
      setFeedbackText(fb); setShowFeedback(true);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [codingDraftKey, voice]);

  const fetchNextQuestion = useCallback(async () => {
    if (!interviewIdRef.current) return null;
    setLoadingNextQuestion(true);
    try {
      const res = await apiCall('/api/interview/next-question', {
        method: 'POST',
        body: JSON.stringify({ interviewId: interviewIdRef.current }),
      });
      const q = res.question;
      if (!q?.question) throw new Error('Could not prepare the next question.');
      const updated = [...sessionQsRef.current, q];
      setSessionQs(updated); sessionQsRef.current = updated;
      const answerList = [...answersRef.current, ''];
      const feedbackList = [...feedbacksRef.current, ''];
      setAnswers(answerList); answersRef.current = answerList;
      setFeedbacks(feedbackList); feedbacksRef.current = feedbackList;
      return updated.length - 1;
    } finally {
      setLoadingNextQuestion(false);
    }
  }, []);

  const nextQuestion = useCallback(async () => {
    if (submittingRef.current) return;
    voice.stopSpeaking();
    // Clear coding state
    setIsCodingQuestion(false);
    setCode('');
    setCodingTimer(0);
    setCodingTimerRunning(false);
    setCodingStartTime(null);
    clearInterval(codingTimerRef.current);
    const next = currentQRef.current + 1;
    if (next < sessionQsRef.current.length) {
      setCurrentQ(next); currentQRef.current = next;
      askQuestion(next, sessionQsRef.current);
    } else if (timeLeftRef.current > MIN_CONTINUE_SECONDS) {
      try {
        const nextIndex = await fetchNextQuestion();
        if (nextIndex != null) {
          setCurrentQ(nextIndex); currentQRef.current = nextIndex;
          askQuestion(nextIndex, sessionQsRef.current);
        } else {
          doShowReport();
        }
      } catch (e) {
        setError(e.message || 'Could not prepare another question.');
        doShowReport();
      }
    } else {
      doShowReport();
    }
  }, [askQuestion, fetchNextQuestion, voice]);

 // ── Replace doShowReport in InterviewPage.js ──

const doShowReport = useCallback(async ({ submitCurrent = true } = {}) => {
    if (completingRef.current) return;
    completingRef.current = true;
    clearInterval(timerRef.current); clearInterval(silentRef.current); clearInterval(codingTimerRef.current);
    setCodingTimerRunning(false);
    const pendingAnswer = (transcriptRef.current || voice.transcript || '').trim();
    const qIndex = currentQRef.current;
    const question = sessionQsRef.current[qIndex];
    voice.stopListening(); voice.stopSpeaking();
    setScreen(SCREENS.REPORT);

    const iId = interviewIdRef.current;
    if (!iId) {
      // No interview ID — session never started properly
      setFinalScores({ overall: 0, technical: 0, communication: 0, problemSolving: 0, roleDepth: 0 });
      completingRef.current = false;
      return;
    }

    try {
      if (submitCurrent && isCodingQuestionRef.current && question) {
        await submitCodingAnswer({ auto: true, advance: false });
      }
      if (submitCurrent && pendingAnswer && question) {
        const upd = [...answersRef.current];
        upd[qIndex] = pendingAnswer;
        setAnswers(upd); answersRef.current = upd;
        await apiCall('/api/interview/submit', {
          method: 'POST',
          body: JSON.stringify({
            interviewId: iId,
            questionId: question.id,
            answer: pendingAnswer,
            questionIndex: qIndex,
          }),
        });
      }
      const res = await apiCall('/api/interview/complete', {
        method: 'POST',
        body: JSON.stringify({ interviewId: iId }),
      });
      if (res.status === 'ANALYSIS_PENDING' || !res.scores) {
        const msg = res.message || 'Your answers are saved. The AI scoring service is temporarily unavailable, so your report is pending. Please check Performance again later.';
        setCompletionMessage(msg);
        setFinalScores({ pending: true, categories: {} });
        voice.speak('Your answers are saved. The scoring service is temporarily unavailable, so your report will be ready later.', null);
      } else {
        setCompletionMessage('');
        setFinalScores(res.scores);
        const s = res.scores?.overall || 0;
        voice.speak(`Interview complete! You scored ${s} out of 100. Well done!`, null);
      }
    } catch (e) {
      console.error('Complete failed:', e.message);
      setCompletionMessage('Your answers are saved locally for this session, but the report could not be finalized right now. Please check Performance or History again later.');
      setFinalScores({ pending: true, categories: {} });
    } finally {
      completingRef.current = false;
    }
}, [voice, submitCodingAnswer]);

  const restart = () => {
    voice.stopSpeaking(); voice.stopListening();
    clearInterval(timerRef.current); clearInterval(silentRef.current);
    setScreen(SCREENS.HOME); setDuration(null);
    setSessionQs([]); setAnswers([]); setFeedbacks([]);
    setCurrentQ(0); setAiText(''); setFeedbackText('');
    setShowFeedback(false); setFinalScores(null); setCompletionMessage('');
    setSilentCount(0); setAutoWarn(false);
    setInterviewId(null); interviewIdRef.current = null;
    answersRef.current = []; feedbacksRef.current = []; sessionQsRef.current = [];
    // Clear coding state
    setIsCodingQuestion(false);
    setCode('');
    setLanguage('java');
    setCodingTimer(0);
    setCodingTimerRunning(false);
    setCodingStartTime(null);
    clearInterval(codingTimerRef.current);
  };

  // ── RENDER ──
  if (screen === SCREENS.REPORT) return (
    <ReportScreen scores={finalScores} completionMessage={completionMessage} sessionQs={sessionQs} answers={answers} feedbacks={feedbacks} onRestart={restart} duration={duration} />
  );

  if (isLoading) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'55vh', gap:'1.5rem' }}>
      <div style={{ position:'relative' }}>
        <Spinner size={56} />
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>🎯</div>
      </div>
      <div style={{ fontSize:'15px', color:'var(--text2)', textAlign:'center' }}>{loadingMsg}</div>
      <div style={{ fontSize:'12px', color:'var(--text3)', textAlign:'center' }}>Building questions from your resume...</div>
    </div>
  );

  if (screen === SCREENS.HOME) return (
    <HomeScreen
      hasResume={hasResume} wallet={wallet} PRICE={PRICE} error={error}
      onStart={startInterview}
      interviewRole={interviewRole} setInterviewRole={setInterviewRole}
      experienceLevel={experienceLevel} setExperienceLevel={setExperienceLevel}
      onSavePreferences={saveInterviewPreferences} savingPrefs={savingPrefs} prefsError={prefsError}
      showResumePopup={showResumePopup} setShowResumePopup={setShowResumePopup}
      handleResumeFile={handleResumeFile} uploadingResume={uploadingResume} resumeError={resumeError}
    />
  );

  // ── INTERVIEW SCREEN ──
  const q      = sessionQs[currentQ];
  const total  = sessionQs.length;
  const pct    = ((currentQ + 1) / total) * 100;
  const tColor = timeLeft < 120 ? '#ef4444' : timeLeft < 300 ? '#f59e0b' : '#10b981';
  const cColor = codingTimer < 60 ? '#ef4444' : codingTimer < 180 ? '#f59e0b' : '#38bdf8';

  return (
    <div style={{ maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', gap:'1rem' }}>

      {/* ── Header bar ── */}
      <Card style={{ padding:'0.85rem 1.1rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem' }}>
          {/* Sarah avatar with speaking ring */}
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{
              width:46, height:46, borderRadius:'50%',
              background:'linear-gradient(135deg,#6366f1,#a78bfa)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px',
              boxShadow: voice.isSpeaking ? '0 0 0 4px rgba(99,102,241,0.3)' : 'none',
              transition:'box-shadow 0.3s',
            }}>👩‍💼</div>
            {voice.isSpeaking && (
              <>
                <div style={{ position:'absolute', inset:-4, borderRadius:'50%', border:'2px solid rgba(99,102,241,0.5)', animation:'ping 1.2s cubic-bezier(0,0,0.2,1) infinite' }} />
                <div style={{ position:'absolute', inset:-8, borderRadius:'50%', border:'1px solid rgba(99,102,241,0.2)', animation:'ping 1.2s cubic-bezier(0,0,0.2,1) 0.3s infinite' }} />
              </>
            )}
          </div>
          <div>
            <div style={{ fontSize:'14px', fontWeight:600 }}>Sarah</div>
            <div style={{ fontSize:'11px', color: voice.isSpeaking ? '#818cf8' : voice.isListening ? '#10b981' : 'var(--text3)', display:'flex', alignItems:'center', gap:'4px' }}>
              {voice.isSpeaking ? <><span style={{ width:6, height:6, borderRadius:'50%', background:'#6366f1', animation:'pulse-glow 1s infinite', display:'inline-block' }} /> Speaking...</>
               : voice.isListening ? <><span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', animation:'pulse-glow 0.6s infinite', display:'inline-block' }} /> Listening</>
               : submitting ? <><Spinner size={10} /> Processing...</>
               : '· Ready'}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.85rem', flexWrap:'wrap', justifyContent:'flex-end' }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:'11px', color:'var(--text3)', marginBottom:4 }}>Q{currentQ+1}/{total}</div>
            <ProgressBar value={pct} color="#6366f1" height={4} style={{ width:90 }} />
          </div>
          <div style={{ display:'flex', gap:'0.45rem', alignItems:'center', flexWrap:'wrap', justifyContent:'flex-end' }}>
            <div style={{
              fontFamily:'var(--font-mono)', color:tColor,
              padding:'0.28rem 0.58rem', borderRadius:'8px',
              background:tColor+'18', border:`1px solid ${tColor}30`, transition:'color 0.5s',
              minWidth:86, textAlign:'center',
            }}>
              <div style={{ fontFamily:'var(--font-body)', fontSize:'9px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Interview</div>
              <div style={{ fontSize:'18px', fontWeight:700 }}>{fmt(timeLeft)}</div>
            </div>
            {isCodingQuestion && (
              <div style={{
                fontFamily:'var(--font-mono)', color:cColor,
                padding:'0.28rem 0.58rem', borderRadius:'8px',
                background:cColor+'14', border:`1px solid ${cColor}35`, transition:'color 0.5s',
                minWidth:86, textAlign:'center',
              }}>
                <div style={{ fontFamily:'var(--font-body)', fontSize:'9px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.8px' }}>Coding</div>
                <div style={{ fontSize:'18px', fontWeight:700 }}>{fmt(codingTimer)}</div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Category badge row */}
      {q && (
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', flexWrap:'wrap' }}>
          <Badge color={CAT_COLORS[q.category] || '#6366f1'}>{formatCategoryLabel(q.category)}</Badge>
          <Badge color={q.difficulty==='hard'?'#ef4444':q.difficulty==='easy'?'#10b981':'#f59e0b'}>
            {q.difficulty || 'medium'}
          </Badge>
          {q.fromBank && <Badge color="#94a3b8">bank</Badge>}
        </div>
      )}

      {/* Sarah's speech bubble */}
      <Card style={{ padding:'1.5rem', minHeight:130, position:'relative', overflow:'hidden' }}>
        {voice.isSpeaking && (
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg,rgba(99,102,241,0.04),transparent)', pointerEvents:'none' }} />
        )}
        <div style={{ display:'flex', alignItems:'center', gap:'0.65rem', marginBottom:'0.85rem' }}>
          <Waveform active={voice.isSpeaking} />
          <span style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1.5px' }}>
            {voice.isSpeaking ? 'Sarah is speaking' : 'Sarah asked'}
          </span>
        </div>
        <div style={{ fontSize:'15.5px', lineHeight:1.85, color:'var(--text)' }}>
          {aiText || <span style={{ color:'var(--text3)', fontStyle:'italic' }}>Preparing question...</span>}
          {voice.isSpeaking && (
            <span style={{ display:'inline-block', width:2, height:18, background:'#6366f1', marginLeft:5, animation:'blink 0.7s step-end infinite', verticalAlign:'middle' }} />
          )}
        </div>
      </Card>

      {/* User input area */}
      {isCodingQuestion ? (
        <CodingEditor
          question={q}
          code={code}
          setCode={setCode}
          language={language}
          setLanguage={setLanguage}
          onSubmit={submitCodingAnswer}
          submitting={submitting}
          timer={codingTimer}
          timerRunning={codingTimerRunning}
        />
      ) : (
        <Card style={{ padding:'1.1rem', background:'rgba(8,8,18,0.8)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.65rem' }}>
            <span style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1.5px' }}>Your Answer</span>
            {voice.isListening && (
              <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:'#ef4444', display:'inline-block', animation:'pulse-glow 0.6s infinite' }} />
                <span style={{ fontSize:'11px', color:'#ef4444', fontFamily:'var(--font-mono)' }}>LIVE</span>
              </div>
            )}
          </div>
          <div style={{ minHeight:72, fontSize:'14.5px', lineHeight:1.75, color: (voice.interimDisplay || voice.transcript) || prepareCount != null ? 'var(--text)' : 'var(--text3)', fontStyle: (voice.interimDisplay || voice.transcript) || prepareCount != null ? 'normal' : 'italic' }}>
            {prepareCount != null
              ? `Listening starts in ${prepareCount}s...`
              : (voice.interimDisplay || voice.transcript) || 'Mic activates automatically after Sarah finishes speaking...'}
          </div>

          {prepareCount != null && (
            <div style={{ marginTop:'0.75rem', padding:'0.45rem 0.75rem', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'8px', fontSize:'12px', color:'#60a5fa', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              ⏳ Reading time left: {prepareCount}s
            </div>
          )}

          {/* Silent countdown warning */}
          {autoWarn && voice.isListening && (
            <div style={{ marginTop:'0.75rem', padding:'0.45rem 0.75rem', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)', borderRadius:'8px', fontSize:'12px', color:'#f59e0b', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              ⏱ Auto-submitting in {silentLimit - silentCount}s...
              {voice.transcript && <span style={{ color:'var(--text3)' }}>or click Submit now</span>}
            </div>
          )}
        </Card>
      )}

      {/* Controls */}
      {!showFeedback && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.85rem', flexWrap:'wrap' }}>
          {isCodingQuestion ? (
            <>
              {!submitting && (
                <Button onClick={submitCodingAnswer} variant="primary" size="md">
                  {code.trim() ? 'Submit Code' : 'Submit Without Code'}
                </Button>
              )}
              {submitting && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', color:'var(--text2)', fontSize:'13px' }}>
                  <Spinner size={18} /> Analyzing your code...
                </div>
              )}
            </>
          ) : (
            <>
              {micReady && voice.isListening && (voice.transcript || voice.interimDisplay) && !submitting &&  (
                <Button onClick={submitAnswer} variant="primary" size="md">
                  ✓ Submit Answer
                </Button>
              )}
              {submitting && (
                <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', color:'var(--text2)', fontSize:'13px' }}>
                  <Spinner size={18} /> Getting Sarah's feedback...
                </div>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" onClick={doShowReport} style={{ color:'var(--text3)', fontSize:'12px' }}>
            End Session
          </Button>
        </div>
      )}

      {/* Feedback panel */}
      {showFeedback && (
        <Card style={{ padding:'1.25rem', background:'rgba(16,185,129,0.04)', border:'1px solid rgba(16,185,129,0.2)', animation:'slide-up 0.35s ease' }}>
          <div style={{ fontSize:'12px', color:'#10b981', fontWeight:600, marginBottom:'0.6rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <Waveform active={voice.isSpeaking} /> Sarah's Feedback
          </div>
          <div style={{ fontSize:'14.5px', lineHeight:1.85, color:'var(--text2)' }}>{feedbackText}</div>
          <div style={{ display:'flex', gap:'0.75rem', marginTop:'1rem', flexWrap:'wrap' }}>
            <Button onClick={nextQuestion} size="sm" variant="primary" disabled={loadingNextQuestion}>
              {loadingNextQuestion
                ? 'Preparing next question...'
                : currentQ === sessionQs.length - 1 && timeLeft <= MIN_CONTINUE_SECONDS
                ? '🏁 View Final Report'
                : 'Next Question →'}
            </Button>
            <Button onClick={doShowReport} size="sm" variant="secondary">End Session</Button>
          </div>
        </Card>
      )}

      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Coding Editor Component ──
function buildCodingPrompt(question) {
  const codingData = question?.codingData || {};
  const rawQuestion = String(question?.question || '').trim();
  const rawDescription = String(codingData.description || '').trim();
  const rawExpected = String(codingData.expectedOutput || '').trim();
  const rawTestCases = Array.isArray(codingData.testCases) ? codingData.testCases : [];
  const combined = [rawDescription, rawQuestion].filter(Boolean).join('\n\n');

  const pickSection = (labels, stopLabels) => {
    const labelPattern = labels.join('|');
    const stopPattern = stopLabels.join('|');
    const match = combined.match(new RegExp(`(?:^|\\n)\\s*(?:${labelPattern})\\s*:?\\s*([\\s\\S]*?)(?=\\n\\s*(?:${stopPattern})\\s*:?|$)`, 'i'));
    return match ? match[1].trim() : '';
  };

  const expectedFromText = pickSection(['expected\\s*output', 'output'], ['test\\s*cases?', 'examples?', 'constraints?', 'problem\\s*description', 'description']);
  const descriptionFromText = pickSection(['problem\\s*description', 'description', 'statement'], ['expected\\s*output', 'output', 'test\\s*cases?', 'examples?', 'constraints?']);
  const testsFromText = pickSection(['test\\s*cases?', 'examples?'], ['expected\\s*output', 'constraints?', 'problem\\s*description', 'description']);
  const title = rawQuestion
    .replace(/(?:problem\s*description|expected\s*output|test\s*cases?|examples?)\s*:.*$/is, '')
    .trim();

  return {
    title: title || rawQuestion.split('\n')[0] || 'Coding Problem',
    description: rawDescription || descriptionFromText || rawQuestion,
    expectedOutput: rawExpected || expectedFromText,
    testCases: rawTestCases.filter(tc => tc && (tc.input || tc.expectedOutput)),
    testsFromText,
  };
}

function CodeBlock({ children }) {
  return (
    <pre style={{
      margin: 0,
      whiteSpace: 'pre-wrap',
      overflowX: 'auto',
      fontFamily: 'var(--font-mono)',
      fontSize: '12px',
      lineHeight: 1.65,
      color: '#dbeafe',
      background: 'rgba(15,23,42,0.72)',
      border: '1px solid rgba(148,163,184,0.16)',
      borderRadius: '8px',
      padding: '0.7rem',
    }}>{children}</pre>
  );
}

function CodingProblemPanel({ question }) {
  const prompt = buildCodingPrompt(question);

  return (
    <Card style={{ padding:'1rem', background:'rgba(8,13,28,0.88)', border:'1px solid rgba(56,189,248,0.18)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'0.75rem', marginBottom:'0.85rem', flexWrap:'wrap' }}>
        <div>
          <div style={{ fontSize:'11px', color:'#38bdf8', textTransform:'uppercase', letterSpacing:'1.2px', fontWeight:700 }}>Coding Problem</div>
          <div style={{ fontSize:'18px', fontWeight:800, color:'var(--text)', lineHeight:1.35, marginTop:'0.2rem' }}>{prompt.title}</div>
        </div>
        <Badge color="#38bdf8">{prompt.testCases.length || (prompt.testsFromText ? 1 : 0)} test cases</Badge>
      </div>

      <div style={{ display:'grid', gap:'0.9rem' }}>
        <section>
          <div style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:700, marginBottom:'0.45rem' }}>Problem Description</div>
          <div style={{ fontSize:'14px', lineHeight:1.75, color:'var(--text2)', whiteSpace:'pre-wrap' }}>{prompt.description}</div>
        </section>

        {prompt.expectedOutput && (
          <section>
            <div style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:700, marginBottom:'0.45rem' }}>Expected Output</div>
            <CodeBlock>{prompt.expectedOutput}</CodeBlock>
          </section>
        )}

        {(prompt.testCases.length > 0 || prompt.testsFromText) && (
          <section>
            <div style={{ fontSize:'11px', color:'var(--text3)', textTransform:'uppercase', letterSpacing:'1px', fontWeight:700, marginBottom:'0.45rem' }}>Test Cases</div>
            {prompt.testCases.length > 0 ? (
              <div style={{ display:'grid', gap:'0.6rem' }}>
                {prompt.testCases.map((tc, index) => (
                  <div key={`${tc.input}-${index}`} style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:'0.6rem' }}>
                    <div>
                      <div style={{ fontSize:'10px', color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'0.25rem' }}>Input {index + 1}</div>
                      <CodeBlock>{tc.input || '-'}</CodeBlock>
                    </div>
                    <div>
                      <div style={{ fontSize:'10px', color:'#86efac', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'0.25rem' }}>Output {index + 1}</div>
                      <CodeBlock>{tc.expectedOutput || '-'}</CodeBlock>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <CodeBlock>{prompt.testsFromText}</CodeBlock>
            )}
          </section>
        )}
      </div>
    </Card>
  );
}

function CodingEditor({ question, code, setCode, language, setLanguage, onSubmit, submitting, timer, timerRunning }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorRef = useRef(null);

  const languages = [
    { value: 'java', label: 'Java' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'cpp', label: 'C++' },
    { value: 'csharp', label: 'C#' },
  ];

  const blockClipboard = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {});
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Insert, () => {});
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Insert, () => {});
    editor.onKeyDown((event) => {
      const key = event.browserEvent?.key?.toLowerCase();
      const isClipboardKey = (event.ctrlKey || event.metaKey) && ['c', 'x', 'v'].includes(key);
      const isPasteInsert = event.shiftKey && event.browserEvent?.key === 'Insert';
      if (isClipboardKey || isPasteInsert) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      <CodingProblemPanel question={question} />
      <Card style={{
        padding: 0,
        background: '#111827',
        border: '1px solid rgba(148,163,184,0.22)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 36px rgba(0,0,0,0.24)',
        height: isFullscreen ? '80vh' : '430px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.55rem 0.75rem',
        background: 'linear-gradient(180deg,#1f2937,#111827)',
        borderBottom: '1px solid rgba(148,163,184,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1.2px', fontWeight: 700 }}>
            Code Editor
          </span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid rgba(148,163,184,0.28)',
              background: '#0f172a',
              color: '#e5e7eb',
            }}
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>{lang.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '11px', color: timer < 60 ? '#f87171' : '#cbd5e1', fontFamily: 'var(--font-mono)' }}>
            {timerRunning ? 'Coding ' : 'Starts after prompt '} {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{ fontSize: '11px', padding: '2px 6px' }}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </Button>
        </div>
      </div>

      <div
        onPaste={blockClipboard}
        onCopy={blockClipboard}
        onCut={blockClipboard}
        onDrop={blockClipboard}
        onContextMenu={blockClipboard}
        style={{ flex: 1, overflow: 'hidden', borderTop: '1px solid rgba(15,23,42,0.9)' }}
      >
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={setCode}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false,
            contextmenu: false,
            copyWithSyntaxHighlighting: false,
            cursorBlinking: 'solid',
            renderLineHighlight: 'line',
          }}
        />
      </div>
      </Card>
    </div>
  );
}

// ── Home Screen ──
function HomeScreen({
  hasResume, wallet, PRICE, error, onStart,
  interviewRole, setInterviewRole, experienceLevel, setExperienceLevel,
  onSavePreferences, savingPrefs, prefsError,
  showResumePopup, setShowResumePopup, handleResumeFile, uploadingResume, resumeError,
}) {
  const [selectedDur, setSelectedDur] = useState(null);
  const [dragging, setDragging]       = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(!interviewRole || !experienceLevel);
  const [draftRole, setDraftRole] = useState(interviewRole || 'java_developer');
  const [draftExperience, setDraftExperience] = useState(experienceLevel || '3_5');

  useEffect(() => {
    if (interviewRole) setDraftRole(interviewRole);
    if (experienceLevel) setDraftExperience(experienceLevel);
    setEditingPrefs(!interviewRole || !experienceLevel);
  }, [interviewRole, experienceLevel]);

  const savePrefs = async () => {
    await onSavePreferences(draftRole, draftExperience);
    setEditingPrefs(false);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleResumeFile(f);
  };

  return (
    <div style={{ maxWidth:560, margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* Resume popup */}
      {showResumePopup && (
        <div style={{ position:'fixed', inset:0, zIndex:999, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#14142a', border:'1px solid rgba(99,102,241,0.4)', borderRadius:'20px', padding:'2rem', width:'100%', maxWidth:420, boxShadow:'0 40px 80px rgba(0,0,0,0.6)', animation:'slide-up 0.3s ease' }}>
            <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
              <div style={{ fontSize:'48px', marginBottom:'0.75rem' }}>📄</div>
              <h3 style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:700, marginBottom:'0.5rem' }}>Upload Your Resume First</h3>
              <p style={{ fontSize:'13.5px', color:'var(--text2)', lineHeight:1.7 }}>
                Sarah needs your resume to personalise questions to your actual background.
              </p>
            </div>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => document.getElementById('resumePopupInput').click()}
              style={{ border:`2px dashed ${dragging?'#6366f1':'rgba(99,102,241,0.3)'}`, borderRadius:'14px', padding:'2rem', textAlign:'center', cursor:'pointer', transition:'all 0.3s', background:dragging?'rgba(99,102,241,0.08)':'rgba(10,10,20,0.5)', marginBottom:'1rem' }}>
              <input id="resumePopupInput" type="file" accept=".pdf,.txt" hidden
                onChange={e => e.target.files[0] && handleResumeFile(e.target.files[0])} />
              {uploadingResume
                ? <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.75rem' }}><Spinner size={32} /><span style={{ color:'var(--text2)', fontSize:'13px' }}>Uploading...</span></div>
                : <><div style={{ fontSize:'32px', marginBottom:'0.5rem' }}>📁</div><div style={{ fontSize:'15px', fontWeight:500, marginBottom:'0.25rem' }}>Drop PDF or TXT here</div><div style={{ fontSize:'12px', color:'var(--text3)' }}>or click to browse · Max 5MB</div></>
              }
            </div>
            {resumeError && <div style={{ color:'#ef4444', fontSize:'13px', marginBottom:'0.75rem', textAlign:'center' }}>{resumeError}</div>}
            <Button variant="secondary" style={{ width:'100%' }} onClick={() => setShowResumePopup(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:800, letterSpacing:'-0.5px', marginBottom:'0.4rem' }}>Start Interview</h2>
        <p style={{ fontSize:'14px', color:'var(--text2)' }}>Time-based sessions — as many questions as the clock allows.</p>
      </div>

      {editingPrefs ? (
        <Card style={{ padding:'1rem', display:'flex', flexDirection:'column', gap:'0.85rem', background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.18)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))', gap:'0.85rem' }}>
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
        <div style={{ padding:'0.85rem 1rem', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, fontSize:'13px', color:'#10b981', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'1rem', flexWrap:'wrap' }}>
          <span>✅ {getRoleLabel(interviewRole)} · {getExperienceLabel(experienceLevel)} saved</span>
          <button onClick={() => setEditingPrefs(true)} style={{ background:'transparent', border:'none', color:'#10b981', cursor:'pointer', fontSize:'12px', textDecoration:'underline' }}>Replace</button>
        </div>
      )}

      {/* Resume status chip */}
      {hasResume ? (
        <div style={{ padding:'0.85rem 1rem', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, fontSize:'13px', color:'#10b981', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>✅ Resume on file — Sarah is ready</span>
          <button onClick={() => setShowResumePopup(true)} style={{ background:'transparent', border:'none', color:'#10b981', cursor:'pointer', fontSize:'12px', textDecoration:'underline' }}>Replace</button>
        </div>
      ) : (
        <div onClick={() => setShowResumePopup(true)} style={{ padding:'1.25rem', background:'rgba(99,102,241,0.06)', border:'1px dashed rgba(99,102,241,0.3)', borderRadius:12, cursor:'pointer', textAlign:'center', transition:'all 0.2s' }}>
          <div style={{ fontSize:'28px', marginBottom:'0.4rem' }}>📄</div>
          <div style={{ fontSize:'14px', fontWeight:500, marginBottom:'0.25rem' }}>Upload Resume</div>
          <div style={{ fontSize:'12px', color:'var(--text3)' }}>Required before your first interview</div>
        </div>
      )}

      {/* Duration cards */}
      {[
        { mins:30, price:10, icon:'⚡', title:'30 Min Session', desc:'Focused practice · Unlimited questions · ₹10 per session' },
        { mins:60, price:15, icon:'🎯', title:'60 Min Full Mock', desc:'Complete interview · Unlimited questions · ₹15 per session' },
      ].map(opt => (
        <div key={opt.mins} onClick={() => setSelectedDur(opt.mins)} style={{
          padding:'1.4rem', borderRadius:'16px', cursor:'pointer', transition:'all 0.25s',
          border: selectedDur===opt.mins ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.06)',
          background: selectedDur===opt.mins ? 'rgba(99,102,241,0.12)' : 'rgba(20,20,42,0.5)',
          boxShadow: selectedDur===opt.mins ? '0 0 24px rgba(99,102,241,0.12)' : 'none',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
              <div style={{ width:46, height:46, borderRadius:'12px', background:selectedDur===opt.mins?'rgba(99,102,241,0.22)':'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>{opt.icon}</div>
              <div>
                <div style={{ fontWeight:600, fontSize:'15px', marginBottom:'0.2rem' }}>{opt.title}</div>
                <div style={{ fontSize:'12.5px', color:'var(--text2)' }}>{opt.desc}</div>
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0, marginLeft:'1rem' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:700, color:'#818cf8' }}>₹{opt.price}</div>
              {wallet < opt.price && <div style={{ fontSize:'11px', color:'#ef4444' }}>Low credits</div>}
            </div>
          </div>
        </div>
      ))}

      {error && <div style={{ padding:'0.75rem 1rem', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, color:'#ef4444', fontSize:'13px' }}>{error}</div>}

      <Button onClick={() => selectedDur && onStart(selectedDur)} disabled={!selectedDur || !hasResume || !interviewRole || !experienceLevel || wallet < (PRICE[selectedDur]||99)} size="lg" style={{ width:'100%' }}>
        🎤 {!hasResume ? 'Upload Resume First' : !interviewRole || !experienceLevel ? 'Save Role & Experience First' : !selectedDur ? 'Select Duration' : `Start ${getRoleLabel(interviewRole)} Interview (${PRICE[selectedDur]} credits)`}
      </Button>

      <div style={{ padding:'0.7rem', background:'rgba(20,20,42,0.4)', borderRadius:'10px', fontSize:'12px', color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
        🔊 Best experience in <strong style={{ color:'var(--text2)' }}>Chrome or Edge</strong> · Mic activates automatically · Speak clearly
      </div>
    </div>
  );
}

// ── Report Screen ──
function ReportScreen({ scores, completionMessage, sessionQs, answers, feedbacks, onRestart, duration }) {
  const [expanded, setExpanded] = useState(null);

  if (!scores) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'40vh' }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'1rem' }}>
        <Spinner size={48} />
        <span style={{ color:'var(--text2)' }}>Scoring your interview...</span>
      </div>
    </div>
  );

  if (scores.pending) {
    const answered = answers.filter(a => a && a !== '(no answer)' && a !== '(skipped)').length;
    return (
      <div style={{ maxWidth:760, margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.25rem' }}>
        <Card style={{ padding:'2rem', textAlign:'center', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)' }}>
          <div style={{ fontSize:'42px', marginBottom:'0.75rem' }}>⏳</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:800, marginBottom:'0.6rem' }}>Report Pending</h2>
          <p style={{ color:'var(--text2)', fontSize:'14px', lineHeight:1.8, maxWidth:560, margin:'0 auto' }}>
            {completionMessage || 'Your answers are saved. The AI scoring service is temporarily unavailable, so your detailed report will be available later on the Performance page.'}
          </p>
          <p style={{ color:'var(--text3)', fontSize:'12px', marginTop:'0.85rem' }}>
            Answered {answered} of {sessionQs.length} asked questions · {duration} min session
          </p>
        </Card>

        <Card style={{ padding:'1.5rem' }}>
          <h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'1.25rem' }}>Full Q&A Review</h3>
          {sessionQs.map((q, i) => (
            <div key={i} style={{ borderBottom: i < sessionQs.length-1 ? '1px solid var(--border2)' : 'none', padding:'0.9rem 0' }}>
              <div style={{ fontSize:'13.5px', fontWeight:500, color:'#93c5fd', lineHeight:1.5, marginBottom:'0.4rem' }}>Q{i+1}. {q.question}</div>
              <pre style={{ margin:0, whiteSpace:'pre-wrap', overflowX:'auto', fontFamily:q.type === 'coding' ? 'var(--font-mono)' : 'inherit', fontSize:'13px', color:'var(--text2)', lineHeight:1.7 }}>{answers[i] || (q.type === 'coding' ? '(no code submitted)' : '(no answer recorded)')}</pre>
            </div>
          ))}
        </Card>
        <Button onClick={onRestart} size="lg" style={{ width:'100%' }}>Start New Interview</Button>
      </div>
    );
  }

  const overall  = scores.overall || 0;
  const categoryCards = Object.entries(scores.categories || {})
    .filter(([, val]) => Number(val) > 0)
    .slice(0, 8)
    .map(([category, val]) => ({ label: formatCategoryLabel(category), val, category }));
  const scoreCards = [
    { label:'Overall', val:overall },
    { label:'Technical', val:scores.technical||0 },
    { label:'Communication', val:scores.communication||0 },
    { label:'Problem Solving', val:scores.problemSolving||0 },
    ...categoryCards.filter(c => !['problem_solving', 'behavioral'].includes(c.category)).slice(0, 4),
  ];
  const answered = answers.filter(a => a && a !== '(no answer)' && a !== '(skipped)').length;
  const verdict  = overall >= 80 ? { label:'Strong Hire 🎉', color:'#10b981' }
                 : overall >= 65 ? { label:'Probable Hire 👍', color:'#f59e0b' }
                 : { label:'Keep Practicing 💪', color:'#ef4444' };

  return (
    <div style={{ maxWidth:760, margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

      {/* Hero */}
      <Card style={{ padding:'2.5rem', textAlign:'center', background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(167,139,250,0.07))', border:'1px solid rgba(99,102,241,0.25)' }}>
        <div style={{ fontSize:'52px', marginBottom:'0.75rem' }}>🏆</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:800, marginBottom:'0.5rem' }}>Interview Complete!</h2>
        <div style={{ display:'inline-block', padding:'0.4rem 1.25rem', borderRadius:'100px', background:verdict.color+'20', border:`1px solid ${verdict.color}40`, color:verdict.color, fontSize:'14px', fontWeight:600, marginBottom:'0.85rem' }}>
          {verdict.label}
        </div>
        <p style={{ color:'var(--text2)', fontSize:'13px' }}>
          Answered {answered} of {sessionQs.length} questions · {duration} min session
        </p>
      </Card>

      {/* Score breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'0.75rem' }}>
        {scoreCards.map(s => (
          <Card key={s.label} style={{ padding:'1.1rem', textAlign:'center' }}>
            <ScoreRing score={s.val} size={68} />
            <div style={{ fontSize:'11px', color:'var(--text3)', marginTop:'0.5rem', lineHeight:1.3 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Full Q&A review — expandable */}
      <Card style={{ padding:'1.5rem' }}>
        <h3 style={{ fontSize:'15px', fontWeight:700, marginBottom:'1.25rem' }}>📝 Full Q&A Review</h3>
        {sessionQs.map((q, i) => (
          <div key={i} style={{ borderBottom: i < sessionQs.length-1 ? '1px solid var(--border2)' : 'none', marginBottom:'0' }}>
            <div
              onClick={() => setExpanded(expanded===i ? null : i)}
              style={{ padding:'0.9rem 0', cursor:'pointer', display:'flex', alignItems:'flex-start', gap:'0.75rem' }}>
              <span style={{ fontSize:'12px', color:'var(--text3)', fontFamily:'var(--font-mono)', paddingTop:3, flexShrink:0 }}>Q{i+1}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:'13.5px', fontWeight:500, color:'#93c5fd', lineHeight:1.5, marginBottom:'0.35rem' }}>{q.question}</div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <Badge color={CAT_COLORS[q.category]||'#6366f1'}>{formatCategoryLabel(q.category)}</Badge>
                  <Badge color={q.difficulty==='hard'?'#ef4444':q.difficulty==='easy'?'#10b981':'#f59e0b'}>{q.difficulty}</Badge>
                </div>
              </div>
              <span style={{ color:'var(--text3)', fontSize:'12px', flexShrink:0 }}>{expanded===i?'▲':'▼'}</span>
            </div>
            {expanded===i && (
              <div style={{ paddingBottom:'1rem', paddingLeft:'1.5rem', animation:'slide-up 0.2s ease' }}>
                <div style={{ fontSize:'13px', color:'var(--text2)', lineHeight:1.75, marginBottom:'0.6rem', padding:'0.75rem', background:'rgba(20,20,42,0.5)', borderRadius:'8px', borderLeft:'3px solid rgba(148,163,184,0.3)' }}>
                  <span style={{ fontSize:'11px', color:'var(--text3)', display:'block', marginBottom:'0.35rem' }}>YOUR ANSWER</span>
                  {answers[i] || (q.type === 'coding' ? '(no code submitted)' : '(no answer recorded)')}
                </div>
                {feedbacks[i] && (
                  <div style={{ fontSize:'13px', color:'#86efac', lineHeight:1.75, padding:'0.75rem', background:'rgba(16,185,129,0.06)', borderRadius:'8px', borderLeft:'3px solid rgba(16,185,129,0.4)' }}>
                    <span style={{ fontSize:'11px', color:'#10b981', display:'block', marginBottom:'0.35rem' }}>💡 SARAH'S FEEDBACK</span>
                    {feedbacks[i]}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </Card>

      <Button onClick={onRestart} size="lg" style={{ width:'100%' }}>🔄 Start New Interview</Button>
    </div>
  );
}

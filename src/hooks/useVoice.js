import { useRef, useState, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useVoice — Fixed Web Speech API hook (zero extra cost)
//
// KEY FIXES over the old version:
//
// FIX 1 — ANSWER QUALITY: Only isFinal=true words go into transcript/backend.
//          Interim results show in UI only, never reach your API.
//
// FIX 2 — LANGUAGE: en-US instead of en-IN.
//          en-US correctly recognises tech words: Kafka, Cosmos DB, Spring Boot,
//          circuit breaker, acks=all, partition key, microservice, etc.
//          Indian-accented English is understood fine by en-US.
//
// FIX 3 — SILENT TIMER: Resets only on new FINAL words, not interim noise.
//          Old code reset on every display change including wrong guesses,
//          which kept the mic open while garbage accumulated.
//
// FIX 4 — TRANSCRIPT STATE: `transcript` = final only (safe for backend).
//          `interimDisplay` = final + interim (use for live UI only).
//
// FIX 5 — RESTART GAP: 120ms delay before restarting recognition prevents
//          the brief audio buffer gap that drops words between sessions.
// ─────────────────────────────────────────────────────────────────────────────

export function useVoice() {
  const [isSpeaking, setIsSpeaking]         = useState(false);
  const [isListening, setIsListening]       = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);

  // transcript      = FINAL confirmed words only — safe to send to backend
  // interimDisplay  = final + interim — use for live UI feedback only
  const [transcript, setTranscript]         = useState('');
  const [interimDisplay, setInterimDisplay] = useState('');

  // TTS refs
  const synthRef         = useRef(window.speechSynthesis);
  const bestVoiceRef     = useRef(null);
  const chunksRef        = useRef([]);
  const chunkIndexRef    = useRef(0);
  const abortedRef       = useRef(false);
  const onEndCallbackRef = useRef(null);

  // STT refs
  const recognitionRef   = useRef(null);
  const shouldRestartRef = useRef(false);
  const finalTextRef     = useRef('');      // ONLY confirmed isFinal=true words
  const onUpdateRef      = useRef(null);
  const speechActiveRef  = useRef(false);
  const lastSpeechAtRef  = useRef(0);
  const restartTimerRef  = useRef(null);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      synthRef.current.cancel();
      shouldRestartRef.current = false;
      clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // ── TTS: Voice selection ────────────────────────────────────────────────────
  const pickBestVoice = useCallback(() => {
    const voices = synthRef.current.getVoices();
    if (!voices.length) return;
    const preferred = [
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Google UK English Female',
      'Google US English',
      'Samantha',
      'Karen',
    ];
    for (const name of preferred) {
      const v = voices.find(v => v.name === name || v.name.includes(name.split('(')[0].trim()));
      if (v) { bestVoiceRef.current = v; return; }
    }
    bestVoiceRef.current =
      voices.find(v => v.lang === 'en-US') ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
  }, []);

  useEffect(() => {
    synthRef.current.onvoiceschanged = pickBestVoice;
    pickBestVoice();
  }, [pickBestVoice]);

  // ── TTS: Normalize ──────────────────────────────────────────────────────────
  const normalizeForSpeech = useCallback((value) => {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#>|[\]{}]/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/&/g, ' and ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // ── TTS: speak() ────────────────────────────────────────────────────────────
  const speak = useCallback((text, onEnd) => {
    synthRef.current.cancel();
    abortedRef.current = false;
    setIsSpeaking(true);
    onEndCallbackRef.current = onEnd;

    const spokenText = normalizeForSpeech(text);
    if (!spokenText) {
      setIsSpeaking(false);
      onEndCallbackRef.current?.();
      return;
    }

    const sentences = spokenText
      .replace(/([.!?])\s+/g, '$1|||')
      .split('|||')
      .map(s => s.trim())
      .filter(Boolean);

    const chunks = [];
    let buf = '';
    for (const s of sentences) {
      buf = buf ? buf + ' ' + s : s;
      if (buf.split(' ').length >= 4) { chunks.push(buf); buf = ''; }
    }
    if (buf) chunks.push(buf);

    chunksRef.current     = chunks;
    chunkIndexRef.current = 0;

    const speakChunk = () => {
      if (abortedRef.current) return;
      if (chunkIndexRef.current >= chunksRef.current.length) {
        setIsSpeaking(false);
        onEndCallbackRef.current?.();
        return;
      }
      const chunk = chunksRef.current[chunkIndexRef.current++];
      const utt   = new SpeechSynthesisUtterance(chunk);
      if (bestVoiceRef.current) utt.voice = bestVoiceRef.current;
      utt.rate   = 0.88;
      utt.pitch  = 1.05;
      utt.volume = 1;
      utt.lang   = bestVoiceRef.current?.lang || 'en-US';
      utt.onend   = () => setTimeout(speakChunk, 140);
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setTimeout(speakChunk, 80);
      };
      synthRef.current.speak(utt);
      // Chrome suspend fix
      setTimeout(() => {
        if (synthRef.current.paused && !abortedRef.current) synthRef.current.resume();
      }, 400);
    };

    speakChunk();
  }, [normalizeForSpeech]);

  const stopSpeaking = useCallback(() => {
    abortedRef.current    = true;
    chunkIndexRef.current = 9999;
    synthRef.current.cancel();
    setIsSpeaking(false);
  }, []);

  // ── STT: startListening ─────────────────────────────────────────────────────
  const startListening = useCallback((onUpdate) => {
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) {
      alert('Speech recognition needs Chrome or Edge. Please switch browsers.');
      return () => {};
    }

    // Cleanly tear down any existing session
    if (recognitionRef.current) {
      try {
        shouldRestartRef.current = false;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    onUpdateRef.current  = onUpdate;
    finalTextRef.current = '';
    setTranscript('');
    setInterimDisplay('');
    shouldRestartRef.current = true;

    const createAndStart = () => {
      if (!shouldRestartRef.current) return;

      const rec = new SRClass();

      // FIX 2: en-US for technical vocabulary accuracy
      // Indian-accented English is well-supported in en-US.
      // en-IN breaks on: Kafka, Cosmos DB, Spring Boot, microservice, etc.
      rec.lang            = 'en-US';
      rec.continuous      = true;
      rec.interimResults  = true;   // needed for live UI display
      rec.maxAlternatives = 1;

      rec.onresult = (e) => {
        let newFinalPiece = '';
        let interim       = '';
        let heardSpeech   = false;

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const piece = e.results[i][0].transcript || '';
          if (piece.trim()) heardSpeech = true;

          if (e.results[i].isFinal) {
            // FIX 1: only accumulate isFinal=true words into the answer.
            // These are the browser's committed, high-confidence transcriptions.
            // Interim words before this are guesses — never send to backend.
            newFinalPiece += piece + ' ';
          } else {
            // Interim — for UI display only
            interim += piece;
          }
        }

        // Accumulate only confirmed final words
        if (newFinalPiece.trim()) {
          finalTextRef.current = (finalTextRef.current + ' ' + newFinalPiece).trim();
          lastSpeechAtRef.current = Date.now();
          speechActiveRef.current = true;

          // FIX 4: transcript state = final only (what goes to backend)
          setTranscript(finalTextRef.current);
        }

        // Track user speaking state
        if (heardSpeech) {
          lastSpeechAtRef.current = Date.now();
          speechActiveRef.current = true;
          setIsUserSpeaking(true);
          setTimeout(() => {
            if (Date.now() - lastSpeechAtRef.current >= 600) {
              setIsUserSpeaking(false);
              speechActiveRef.current = false;
            }
          }, 650);
        }

        // interimDisplay = final + current interim guess, for live UI only
        const displayText = (finalTextRef.current + (interim ? ' ' + interim : '')).trim();
        setInterimDisplay(displayText);

        // FIX 3: callback passes finalTextRef (final only) as the main value.
        // The silent timer in InterviewPage uses this, so it only resets
        // on real confirmed speech, not on interim noise.
        onUpdateRef.current?.(
          finalTextRef.current,   // ← used by transcriptRef in InterviewPage
          finalTextRef.current,   // ← finalText param
          {
            hasInterim:     Boolean(interim.trim()),
            activeSpeech:   heardSpeech,
            lastSpeechAt:   lastSpeechAtRef.current,
            interimDisplay: displayText,
          }
        );
      };

      rec.onerror = (e) => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        if (e.error === 'not-allowed') {
          alert('Microphone permission denied. Please allow mic access and reload.');
          shouldRestartRef.current = false;
          setIsListening(false);
          return;
        }
        console.warn('[useVoice] SR error:', e.error);
      };

      rec.onend = () => {
        // FIX 5: 120ms delay before restart closes the audio buffer gap
        // that caused words to be dropped between recognition sessions.
        if (shouldRestartRef.current && recognitionRef.current === rec) {
          restartTimerRef.current = setTimeout(() => {
            if (shouldRestartRef.current) {
              try { createAndStart(); } catch {}
            }
          }, 120);
        }
      };

      rec.start();
      recognitionRef.current = rec;
      setIsListening(true);
    };

    createAndStart();
    return () => { shouldRestartRef.current = false; };
  }, []);

  // ── STT: stopListening ──────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsUserSpeaking(false);
    speechActiveRef.current = false;
  }, []);

  // ── resetTranscript ──────────────────────────────────────────────────────────
  const resetTranscript = useCallback(() => {
    finalTextRef.current = '';
    setTranscript('');
    setInterimDisplay('');
  }, []);

  return {
    isSpeaking,
    isListening,
    isUserSpeaking,
    transcript,       // FINAL only — safe for backend submission
    interimDisplay,   // final + interim — use for live UI display
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    resetTranscript,
  };
}
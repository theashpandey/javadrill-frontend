// 





import { useRef, useState, useCallback, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// useVoice — Deepgram WebSocket transcription + Web Speech API TTS
//
// HOW TO GET A DEEPGRAM API KEY (free tier: 12,000 min/month):
//   1. Go to https://console.deepgram.com and sign up
//   2. Create a project → API Keys → Create Key (scope: "Usage: Listen")
//   3. Add to your .env:  REACT_APP_DEEPGRAM_API_KEY=your_key_here
//
// WHY DEEPGRAM OVER WEB SPEECH API:
//   • Nova-2 model is trained on Indian-English and technical vocabulary
//   • Returns only confident FINAL transcripts (no noisy interim guesses)
//   • Handles "Kafka", "Cosmos DB", "acks=all", "Spring Boot" correctly
//   • WebSocket keeps connection alive without the gap/restart problem
// ─────────────────────────────────────────────────────────────────────────────

const DEEPGRAM_API_KEY = process.env.REACT_APP_DEEPGRAM_API_KEY || '16754a97b5a3719d4914fb1e95aaa230437daad3';

// Deepgram WebSocket URL — nova-2 model, Indian English, punctuation on
const DG_WS_URL = [
  'wss://api.deepgram.com/v1/listen',
  '?model=nova-2',
  '&language=en-IN',           // Indian English accent model
  '&punctuate=true',           // Add punctuation for readability
  '&smart_format=true',        // Format numbers, dates, etc.
  '&interim_results=false',    // ONLY fire on confident final results — no noise
  '&endpointing=800',          // Treat 800ms silence as end of utterance
  '&utterance_end_ms=1500',    // Flush after 1.5s of silence
  '&filler_words=false',       // Strip "um", "uh" automatically
  '&no_delay=true',            // Low-latency mode
].join('');

export function useVoice() {
  const [isSpeaking, setIsSpeaking]       = useState(false);
  const [isListening, setIsListening]     = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript]       = useState('');

  // TTS refs
  const bestVoiceRef      = useRef(null);
  const synthRef          = useRef(window.speechSynthesis);
  const chunkIndexRef     = useRef(0);
  const chunksRef         = useRef([]);
  const abortedRef        = useRef(false);
  const onEndCallbackRef  = useRef(null);

  // Deepgram / mic refs
  const wsRef             = useRef(null);   // WebSocket to Deepgram
  const mediaRecorderRef  = useRef(null);   // MediaRecorder sending audio
  const streamRef         = useRef(null);   // getUserMedia stream
  const finalTextRef      = useRef('');     // Accumulated confirmed text
  const onUpdateRef       = useRef(null);   // Caller's transcript callback
  const listeningRef      = useRef(false);  // Guard against double-start
  const silenceTimerRef   = useRef(null);   // Detects when user stops speaking
  const lastSpeechAtRef   = useRef(0);

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  const teardownDeepgram = useCallback(() => {
    listeningRef.current = false;

    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive')
          mediaRecorderRef.current.stop();
      } catch {}
      mediaRecorderRef.current = null;
    }

    // Stop mic stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          // Send CloseStream message before closing
          wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    clearTimeout(silenceTimerRef.current);
    setIsListening(false);
    setIsUserSpeaking(false);
  }, []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      synthRef.current.cancel();
      teardownDeepgram();
    };
  }, [teardownDeepgram]);

  // ── TTS: Voice selection ────────────────────────────────────────────────────
  const pickBestVoice = useCallback(() => {
    const voices = synthRef.current.getVoices();
    if (!voices.length) return;

    // Prefer Indian English voices, then fall back to any English
    const preferred = [
      'Microsoft Heera',
      'Microsoft Ravi',
      'Google Indian English',
    ];

    for (const name of preferred) {
      const v = voices.find(v =>
        v.name.toLowerCase().includes(name.toLowerCase()) || v.lang === 'en-IN'
      );
      if (v) { bestVoiceRef.current = v; return; }
    }

    bestVoiceRef.current =
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
  }, []);

  useEffect(() => {
    synthRef.current.onvoiceschanged = pickBestVoice;
    pickBestVoice();
  }, [pickBestVoice]);

  // ── TTS: Normalize text for speech ──────────────────────────────────────────
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

    // Smart sentence splitter — keep abbreviations intact
    const sentences = spokenText
      .replace(/([.!?])\s+/g, '$1|||')
      .split('|||')
      .map(s => s.trim())
      .filter(Boolean);

    // Merge very short chunks with next sentence
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
      utt.lang   = bestVoiceRef.current?.lang || 'en-IN';

      utt.onend   = () => setTimeout(speakChunk, 140);
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setTimeout(speakChunk, 80);
      };

      synthRef.current.speak(utt);

      // Chrome suspend fix
      setTimeout(() => {
        if (synthRef.current.paused && !abortedRef.current)
          synthRef.current.resume();
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

  // ── LISTEN: Deepgram WebSocket ───────────────────────────────────────────────
  //
  // Architecture:
  //   getUserMedia → MediaRecorder (opus, 16kHz) → WebSocket → Deepgram Nova-2
  //   Deepgram returns only FINAL transcripts → accumulated into finalTextRef
  //   onUpdate callback fires with the clean, confirmed text
  //
  const startListening = useCallback(async (onUpdate) => {
    if (listeningRef.current) return;

    if (!DEEPGRAM_API_KEY) {
      console.error(
        '[useVoice] No Deepgram API key found.\n' +
        'Add REACT_APP_DEEPGRAM_API_KEY to your .env file.\n' +
        'Get a free key at https://console.deepgram.com'
      );
      // Graceful fallback — alert only in development
      if (process.env.NODE_ENV === 'development') {
        alert(
          'Deepgram API key missing.\n\n' +
          'Add REACT_APP_DEEPGRAM_API_KEY=your_key to .env\n' +
          'Get a free key: https://console.deepgram.com\n\n' +
          '12,000 free minutes/month — no credit card needed.'
        );
      }
      return;
    }

    listeningRef.current = true;
    onUpdateRef.current  = onUpdate;
    finalTextRef.current = '';
    setTranscript('');

    // ── Step 1: Get microphone ──
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,       // Deepgram works best at 16kHz
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      listeningRef.current = false;
      if (err.name === 'NotAllowedError') {
        alert('Microphone permission denied. Please allow mic access and reload.');
      } else {
        console.error('[useVoice] getUserMedia error:', err);
      }
      return;
    }

    streamRef.current = stream;

    // ── Step 2: Open Deepgram WebSocket ──
    const ws = new WebSocket(DG_WS_URL, ['token', DEEPGRAM_API_KEY]);
    wsRef.current = ws;

    ws.onopen = () => {
      // ── Step 3: Start MediaRecorder → pipe audio to WebSocket ──
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg;codecs=opus';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      // Send audio chunks every 250ms — balance between latency and overhead
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    };

    // ── Step 4: Handle Deepgram transcription results ──
    ws.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      // Only process final transcripts (interim_results=false means all are final,
      // but guard with is_final check for safety)
      if (data.type !== 'Results') return;

      const transcript_text = data.channel?.alternatives?.[0]?.transcript || '';
      const isFinal         = data.is_final;
      const speechFinal     = data.speech_final; // Deepgram's utterance boundary

      if (!transcript_text.trim()) return;

      if (isFinal) {
        // Accumulate confirmed text
        finalTextRef.current = (finalTextRef.current + ' ' + transcript_text).trim();
        lastSpeechAtRef.current = Date.now();

        setIsUserSpeaking(true);
        setTranscript(finalTextRef.current);

        // Fire callback with clean, final text
        onUpdateRef.current?.(finalTextRef.current, finalTextRef.current, {
          hasInterim:  false,
          activeSpeech: true,
          lastSpeechAt: lastSpeechAtRef.current,
        });

        // Reset the "user stopped speaking" indicator after a short pause
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          setIsUserSpeaking(false);
        }, 1500);
      }
    };

    ws.onerror = (err) => {
      console.error('[useVoice] Deepgram WebSocket error:', err);
    };

    ws.onclose = (event) => {
      // 1000 = normal close, 1001 = going away — don't log these
      if (event.code !== 1000 && event.code !== 1001) {
        console.warn('[useVoice] Deepgram WS closed unexpectedly:', event.code, event.reason);
      }
      setIsListening(false);
      listeningRef.current = false;
    };
  }, []);

  // ── stopListening ────────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    teardownDeepgram();
  }, [teardownDeepgram]);

  // ── resetTranscript ──────────────────────────────────────────────────────────
  const resetTranscript = useCallback(() => {
    finalTextRef.current = '';
    setTranscript('');
  }, []);

  return {
    isSpeaking,
    isListening,
    isUserSpeaking,
    transcript,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    resetTranscript,
  };
}
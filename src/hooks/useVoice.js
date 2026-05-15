import { useRef, useState, useCallback, useEffect } from 'react';

export function useVoice() {

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const bestVoiceRef = useRef(null);

  const chunkIndexRef = useRef(0);
  const chunksRef = useRef([]);

  const abortedRef = useRef(false);
  const onEndCallbackRef = useRef(null);

  const restartTimeoutRef = useRef(null);
  const speakingTimeoutRef = useRef(null);

  const intentionalStopRef = useRef(false);

  const transcriptRef = useRef('');

  const pendingUpdateRef = useRef(null);
  const flushScheduledRef = useRef(false);

  // ✅ MOBILE DETECTION
  const isMobileRef = useRef(
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );

  // ─────────────────────────────────────────────────────────────
  // NORMALIZE SPEECH
  // ─────────────────────────────────────────────────────────────

  const normalizeForSpeech = useCallback((value) => {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#>|[\]{}]/g, ' ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/&/g, ' and ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // PICK BEST VOICE
  // ─────────────────────────────────────────────────────────────

  const pickBestVoice = useCallback(() => {

    const voices = synthRef.current.getVoices();

    if (!voices.length) return;

    const preferredPatterns = [
      'Microsoft Heera',
      'Neerja',
      'Google India',
      'Microsoft Aria Online (Natural)',
      'Microsoft Jenny Online (Natural)',
      'Google UK English Female',
      'Samantha',
      'Karen',
      'Moira',
      'Tessa',
    ];

    for (const pattern of preferredPatterns) {

      const matched = voices.find(v =>
        v.name.toLowerCase().includes(pattern.toLowerCase())
      );

      if (matched) {
        bestVoiceRef.current = matched;
        return;
      }
    }

    bestVoiceRef.current =
      voices.find(v => v.lang.toLowerCase() === 'en-in') ||
      voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
      voices[0];

  }, []);

  // ─────────────────────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {

    synthRef.current.onvoiceschanged = pickBestVoice;

    pickBestVoice();

    return () => {

      synthRef.current.cancel();

      clearTimeout(restartTimeoutRef.current);
      clearTimeout(speakingTimeoutRef.current);

    };

  }, [pickBestVoice]);

  // ─────────────────────────────────────────────────────────────
  // VISIBILITY RECOVERY
  // KEEPING FOR PC SUPPORT
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {

    const handleVisibility = () => {

      // ✅ DON'T FORCE RESTART ON MOBILE
      if (isMobileRef.current) return;

      if (
        document.visibilityState === 'visible' &&
        isListening &&
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.start();
        } catch {}
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);

  }, [isListening]);

  // ─────────────────────────────────────────────────────────────
  // SPEAK
  // ─────────────────────────────────────────────────────────────

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

      if (buf.split(' ').length >= 4) {
        chunks.push(buf);
        buf = '';
      }
    }

    if (buf) chunks.push(buf);

    chunksRef.current = chunks;

    chunkIndexRef.current = 0;

    const speakChunk = () => {

      if (abortedRef.current) return;

      if (chunkIndexRef.current >= chunksRef.current.length) {

        setIsSpeaking(false);

        onEndCallbackRef.current?.();

        return;
      }

      const chunk = chunksRef.current[chunkIndexRef.current++];

      const utt = new SpeechSynthesisUtterance(chunk);

      if (bestVoiceRef.current) {
        utt.voice = bestVoiceRef.current;
      }

      utt.rate = 0.9;
      utt.pitch = 1;
      utt.volume = 1;

      utt.lang = bestVoiceRef.current?.lang || 'en-IN';

      utt.onend = () => {
        setTimeout(() => {
          if (!abortedRef.current) speakChunk();
        }, 120);
      };

      utt.onerror = (e) => {

        if (
          e.error === 'interrupted' ||
          e.error === 'canceled'
        ) {
          return;
        }

        setTimeout(() => {
          if (!abortedRef.current) speakChunk();
        }, 80);
      };

      synthRef.current.speak(utt);

      setTimeout(() => {

        if (
          synthRef.current.paused &&
          !abortedRef.current
        ) {
          synthRef.current.resume();
        }

      }, 400);

    };

    speakChunk();

  }, [normalizeForSpeech]);

  // ─────────────────────────────────────────────────────────────
  // STOP SPEAKING
  // ─────────────────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {

    abortedRef.current = true;

    synthRef.current.cancel();

    chunkIndexRef.current = 9999;

    setIsSpeaking(false);

  }, []);

  // ─────────────────────────────────────────────────────────────
  // START LISTENING
  // ─────────────────────────────────────────────────────────────

  const startListening = useCallback(async (onUpdate) => {

    const SRClass =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SRClass) {

      alert(
        'Speech recognition works best in Chrome or Edge.'
      );

      return () => {};
    }

    // ✅ HTTPS CHECK
    if (
      location.protocol !== 'https:' &&
      location.hostname !== 'localhost'
    ) {
      alert('Microphone requires HTTPS');
      return () => {};
    }

    intentionalStopRef.current = false;

    try {

      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

    } catch {

      alert('Microphone access denied.');

      return () => {};
    }

    // CLEAN OLD INSTANCE

    if (recognitionRef.current) {

      try {

        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;

        recognitionRef.current.abort();

      } catch {}

      recognitionRef.current = null;
    }

    let finalText = transcriptRef.current || '';

    // ─────────────────────────────────────────────
    // FLUSH QUEUE
    // ─────────────────────────────────────────────

    const scheduleFlush = (payload) => {

      pendingUpdateRef.current = payload;

      if (flushScheduledRef.current) return;

      flushScheduledRef.current = true;

      Promise.resolve().then(() => {

        flushScheduledRef.current = false;

        const latest = pendingUpdateRef.current;

        pendingUpdateRef.current = null;

        if (!latest) return;

        setIsUserSpeaking(latest.isUserSpeaking);

        setTranscript(latest.display);

        onUpdate?.(
          latest.display,
          latest.finalText,
          latest.meta
        );

        clearTimeout(speakingTimeoutRef.current);

        if (!latest.hasInterim) {

          speakingTimeoutRef.current = setTimeout(() => {
            setIsUserSpeaking(false);
          }, 350);
        }

      });
    };

    // ─────────────────────────────────────────────
    // CREATE RECOGNITION
    // ─────────────────────────────────────────────

    const createRecognition = () => {

      const rec = new SRClass();

      // ✅ MOBILE SAFE CONFIG

      if (isMobileRef.current) {

        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';

      } else {

        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-IN';

      }

      rec.maxAlternatives = 1;

      // ─────────────────────────────────────────
      // RESULT
      // ─────────────────────────────────────────

      rec.onresult = (e) => {

        let interim = '';

        for (
          let i = e.resultIndex;
          i < e.results.length;
          i++
        ) {

          const piece =
            e.results[i][0].transcript || '';

          if (e.results[i].isFinal) {

            finalText += piece;

            if (
              finalText &&
              !finalText.endsWith(' ')
            ) {
              finalText += ' ';
            }

          } else {

            interim += piece;

          }
        }

        transcriptRef.current = finalText;

        const display =
          (finalText + interim).trim();

        const hasInterim =
          Boolean(interim.trim());

        scheduleFlush({
          display,
          finalText: finalText.trim(),
          isUserSpeaking: hasInterim,
          hasInterim,
          meta: {
            hasInterim,
            lastSpeechAt: Date.now(),
          },
        });
      };

      // ─────────────────────────────────────────
      // ERROR
      // ─────────────────────────────────────────

      rec.onerror = (e) => {

        if (e.error === 'not-allowed') {

          setIsListening(false);

          alert('Microphone permission denied.');

          return;
        }

        // ✅ IGNORE COMMON MOBILE ERRORS

        if (
          e.error === 'network' ||
          e.error === 'aborted'
        ) {
          return;
        }

        console.warn(
          'Speech recognition error:',
          e.error
        );
      };

      // ─────────────────────────────────────────
      // END
      // ─────────────────────────────────────────

      rec.onend = () => {

        if (intentionalStopRef.current) return;

        if (recognitionRef.current !== rec) return;

        clearTimeout(restartTimeoutRef.current);

        restartTimeoutRef.current = setTimeout(() => {

          if (intentionalStopRef.current) return;

          try {

            // ✅ MOBILE:
            // recreate every time

            if (isMobileRef.current) {

              rec.onresult = null;
              rec.onerror = null;
              rec.onend = null;

              recognitionRef.current = null;

              const fresh = createRecognition();

              recognitionRef.current = fresh;

              fresh.start();

            } else {

              // ✅ PC:
              // keep your original behavior

              rec.start();

            }

          } catch (err) {

            console.warn(
              'Recognition restart failed:',
              err
            );

            if (!intentionalStopRef.current) {

              try {

                const fresh = createRecognition();

                recognitionRef.current = fresh;

                fresh.start();

              } catch {}

            }
          }

        }, isMobileRef.current ? 1200 : 150);

      };

      return rec;
    };

    // CREATE INSTANCE

    const rec = createRecognition();

    recognitionRef.current = rec;

    try {

      rec.start();

      setIsListening(true);

    } catch (err) {

      console.error(
        'Failed to start recognition:',
        err
      );
    }

    return () => {
      intentionalStopRef.current = true;
    };

  }, []);

  // ─────────────────────────────────────────────────────────────
  // STOP LISTENING
  // ─────────────────────────────────────────────────────────────

  const stopListening = useCallback(() => {

    intentionalStopRef.current = true;

    clearTimeout(restartTimeoutRef.current);
    clearTimeout(speakingTimeoutRef.current);

    if (recognitionRef.current) {

      try {

        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;

        recognitionRef.current.abort();

      } catch {}

      recognitionRef.current = null;
    }

    flushScheduledRef.current = false;

    pendingUpdateRef.current = null;

    setIsListening(false);

    setIsUserSpeaking(false);

  }, []);

  // ─────────────────────────────────────────────────────────────
  // RESET TRANSCRIPT
  // ─────────────────────────────────────────────────────────────

  const resetTranscript = useCallback(() => {

    transcriptRef.current = '';

    setTranscript('');

  }, []);

  // ─────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────

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
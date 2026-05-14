import { useRef, useState, useCallback, useEffect } from 'react';

export function useVoice() {

  // =========================
  // STATE
  // =========================
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');

  // =========================
  // REFS
  // =========================
  const recognitionRef = useRef(null);

  const synthRef = useRef(window.speechSynthesis);

  const bestVoiceRef = useRef(null);

  const chunkIndexRef = useRef(0);
  const chunksRef = useRef([]);

  const abortedRef = useRef(false);

  const onEndCallbackRef = useRef(null);

  const speechFrameRef = useRef(null);
  const pendingSpeechRef = useRef(null);

  const restartCountRef = useRef(0);
  const restartTimeoutRef = useRef(null);

  const speakingTimeoutRef = useRef(null);

  const lastFinalRef = useRef('');

  const intentionalStopRef = useRef(false);

  const transcriptRef = useRef('');

  // =========================
  // CLEAN TEXT FOR TTS
  // =========================
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

  // =========================
  // PICK BEST VOICE
  // =========================
  const pickBestVoice = useCallback(() => {

    const voices = synthRef.current.getVoices();

    if (!voices.length) return;

    const preferredPatterns = [
      'Microsoft Heera',
      'Google applied system english (india) female',
      'Neerja',
      'Google India',
      'Microsoft Aria Online (Natural)',
      'Microsoft Jenny Online (Natural)',
      'Google UK English Female',
      'Samantha',
      'Karen',
      'Moira',
      'Tessa'
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

  // =========================
  // INIT VOICES
  // =========================
  useEffect(() => {

    synthRef.current.onvoiceschanged = pickBestVoice;

    pickBestVoice();

    return () => {

      synthRef.current.cancel();

      clearTimeout(restartTimeoutRef.current);

      clearTimeout(speakingTimeoutRef.current);

      if (speechFrameRef.current) {
        cancelAnimationFrame(speechFrameRef.current);
      }
    };

  }, [pickBestVoice]);

  // =========================
  // TAB VISIBILITY RECOVERY
  // =========================
  useEffect(() => {

    const handleVisibility = () => {

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

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );
    };

  }, [isListening]);

  // =========================
  // SPEAK
  // =========================
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

          if (!abortedRef.current) {
            speakChunk();
          }

        }, 120);

      };

      utt.onerror = (e) => {

        if (
          e.error === 'interrupted' ||
          e.error === 'canceled'
        ) return;

        setTimeout(() => {

          if (!abortedRef.current) {
            speakChunk();
          }

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

  // =========================
  // STOP SPEAKING
  // =========================
  const stopSpeaking = useCallback(() => {

    abortedRef.current = true;

    synthRef.current.cancel();

    chunkIndexRef.current = 9999;

    setIsSpeaking(false);

  }, []);

  // =========================
  // START LISTENING
  // =========================
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

    intentionalStopRef.current = false;

    // =========================
    // MIC PRE-WARM
    // =========================
    try {

      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

    } catch (err) {

      alert('Microphone access denied.');

      return () => {};
    }

    // =========================
    // CLEAN OLD INSTANCE
    // =========================
    if (recognitionRef.current) {

      try {

        recognitionRef.current.onend = null;

        recognitionRef.current.abort();

      } catch {}
    }

    const rec = new SRClass();

    rec.continuous = true;

    rec.interimResults = true;

    rec.lang = 'en-GB';

    rec.maxAlternatives = 3;

    let finalText = transcriptRef.current || '';

    // =========================
    // UI UPDATE THROTTLE
    // =========================
    const publishSpeechUpdate = (payload) => {

      pendingSpeechRef.current = payload;

      if (speechFrameRef.current) return;

      speechFrameRef.current =
        requestAnimationFrame(() => {

          speechFrameRef.current = null;

          const latest =
            pendingSpeechRef.current;

          pendingSpeechRef.current = null;

          if (!latest) return;

          setIsUserSpeaking(
            latest.isUserSpeaking
          );

          setTranscript(latest.display);

          onUpdate?.(
            latest.display,
            latest.finalText,
            latest.meta
          );

          clearTimeout(
            speakingTimeoutRef.current
          );

          if (!latest.hasInterim) {

            speakingTimeoutRef.current =
              setTimeout(() => {

                setIsUserSpeaking(false);

              }, 350);
          }
        });
    };

    let lastDisplay = '';

    let lastUserSpeaking = false;

    // =========================
    // RESULT
    // =========================
    rec.onresult = (e) => {

      restartCountRef.current = 0;

      let interim = '';

      let heardSpeech = false;

      for (
        let i = e.resultIndex;
        i < e.results.length;
        i++
      ) {

        const piece =
          e.results[i][0].transcript || '';

        if (piece.trim()) {
          heardSpeech = true;
        }

        if (e.results[i].isFinal) {

          if (piece !== lastFinalRef.current) {

            finalText += piece + ' ';

            lastFinalRef.current = piece;
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

      const isUserSpeakingNow =
        heardSpeech && hasInterim;

      if (
        display === lastDisplay &&
        isUserSpeakingNow === lastUserSpeaking
      ) {
        return;
      }

      lastDisplay = display;

      lastUserSpeaking = isUserSpeakingNow;

      publishSpeechUpdate({
        display,
        finalText: finalText.trim(),
        isUserSpeaking: isUserSpeakingNow,
        hasInterim,
        meta: {
          activeSpeech: heardSpeech,
          hasInterim,
          lastSpeechAt: Date.now(),
        },
      });
    };

    // =========================
    // ERROR
    // =========================
    rec.onerror = (e) => {

      console.warn('Speech recognition error:', e.error);

      if (e.error === 'not-allowed') {

        setIsListening(false);

        alert(
          'Microphone permission denied.'
        );
      }
    };

    // =========================
    // AUTO RECOVERY
    // =========================
    rec.onend = () => {

      if (intentionalStopRef.current) return;

      restartCountRef.current++;

      const delay = Math.min(
        1000 * restartCountRef.current,
        5000
      );

      clearTimeout(restartTimeoutRef.current);

      restartTimeoutRef.current =
        setTimeout(() => {

          try {

            rec.start();

          } catch (err) {

            console.warn(
              'Recognition restart failed',
              err
            );
          }

        }, delay);
    };

    // =========================
    // START
    // =========================
    try {

      rec.start();

      recognitionRef.current = rec;

      setIsListening(true);

    } catch (err) {

      console.error(err);
    }

    return () => {

      intentionalStopRef.current = true;
    };

  }, []);

  // =========================
  // STOP LISTENING
  // =========================
  const stopListening = useCallback(() => {

    intentionalStopRef.current = true;

    clearTimeout(restartTimeoutRef.current);

    clearTimeout(speakingTimeoutRef.current);

    if (recognitionRef.current) {

      try {

        recognitionRef.current.onend = null;

        recognitionRef.current.abort();

      } catch {}
    }

    recognitionRef.current = null;

    if (speechFrameRef.current) {

      cancelAnimationFrame(
        speechFrameRef.current
      );

      speechFrameRef.current = null;

      pendingSpeechRef.current = null;
    }

    setIsListening(false);

    setIsUserSpeaking(false);

  }, []);

  // =========================
  // RESET TRANSCRIPT
  // =========================
  const resetTranscript = useCallback(() => {

    transcriptRef.current = '';

    lastFinalRef.current = '';

    setTranscript('');

  }, []);

  // =========================
  // RETURN
  // =========================
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

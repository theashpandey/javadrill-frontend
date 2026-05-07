import { useRef, useState, useCallback, useEffect } from 'react';

export function useVoice() {
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript]   = useState('');
  const recognitionRef  = useRef(null);
  const bestVoiceRef    = useRef(null);
  const synthRef        = useRef(window.speechSynthesis);
  const chunkIndexRef   = useRef(0);
  const chunksRef       = useRef([]);
  const abortedRef      = useRef(false);
  const onEndCallbackRef = useRef(null);

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

  // ── Voice selection ──
  const pickBestVoice = useCallback(() => {
  const voices = synthRef.current.getVoices();
  if (!voices.length) return;

  // 🇮🇳 Priority: Indian voices FIRST
  const preferred = [
    'Microsoft Heera',
    'Microsoft Ravi',
    'Google Indian English',
    'en-IN',
  ];

  // Step 1: Exact / partial match
  for (const name of preferred) {
    const v = voices.find(v =>
      v.name.toLowerCase().includes(name.toLowerCase()) ||
      v.lang === 'en-IN'
    );
    if (v) {
      bestVoiceRef.current = v;
      console.log("Selected voice:", v.name);
      return;
    }
  }

  // Step 2: fallback to English
  bestVoiceRef.current =
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0];

  console.log("Fallback voice:", bestVoiceRef.current.name);
}, []);
  const pickBestVoice1 = useCallback(() => {
    const voices = synthRef.current.getVoices();
    if (!voices.length) return;

    // Priority list — natural sounding female/neutral voices
    const preferred = [
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Jenny Online (Natural) - English (United States)',
      'Google UK English Female',
      'Google US English',
      'Samantha',       // macOS
      'Karen',          // macOS AU
      'Moira',          // macOS
      'Tessa',
    ];

    for (const name of preferred) {
      const v = voices.find(v => v.name === name || v.name.includes(name.split('(')[0].trim()));
      if (v) { bestVoiceRef.current = v; return; }
    }
    // Fallback: first English voice
    bestVoiceRef.current =
      voices.find(v => v.lang === 'en-US' && !v.name.includes('Google') ) ||
      voices.find(v => v.lang.startsWith('en')) ||
      voices[0];
  }, []);

  useEffect(() => {
    synthRef.current.addEventListener?.('voiceschanged', pickBestVoice);
    synthRef.current.onvoiceschanged = pickBestVoice;
    pickBestVoice();
    return () => { synthRef.current.cancel(); };
  }, [pickBestVoice]);

  // ── SPEAK — chunked sentence-by-sentence so Chrome doesn't cut off ──
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

    // Smart sentence splitter — keeps abbreviations intact
    const sentences = spokenText
      .replace(/([.!?])\s+/g, '$1|||')
      .split('|||')
      .map(s => s.trim())
      .filter(Boolean);

    // Merge very short chunks (< 4 words) with next
    const chunks = [];
    let buf = '';
    for (const s of sentences) {
      buf = buf ? buf + ' ' + s : s;
      if (buf.split(' ').length >= 4) { chunks.push(buf); buf = ''; }
    }
    if (buf) chunks.push(buf);

    chunksRef.current   = chunks;
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
      if (bestVoiceRef.current) utt.voice = bestVoiceRef.current;
      utt.rate   = 0.88;   // slightly slower = more natural
      utt.pitch  = 1.05;
      utt.volume = 1;
      utt.lang   = bestVoiceRef.current?.lang || 'en-IN';

      utt.onend   = () => setTimeout(speakChunk, 140);
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        console.warn('TTS error:', e.error);
        setTimeout(speakChunk, 80);
      };

      synthRef.current.speak(utt);

      // Chrome suspend fix — resume if paused
      setTimeout(() => {
        if (synthRef.current.paused && !abortedRef.current) synthRef.current.resume();
      }, 400);
    };

    speakChunk();
  }, [normalizeForSpeech]);

  const stopSpeaking = useCallback(() => {
    abortedRef.current = true;
    synthRef.current.cancel();
    chunkIndexRef.current = 9999;
    setIsSpeaking(false);
  }, []);

  // ── LISTEN — continuous, auto-restart, en-IN for Indian accent ──
  const startListening = useCallback((onUpdate) => {
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) {
      alert('Speech recognition needs Chrome or Edge. Please switch browsers.');
      return () => {};
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch {}
    }

    const rec = new SRClass();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'en-IN';   // best for Indian-English accent
    rec.maxAlternatives = 1;

    let finalText   = '';
    let shouldReset = true;

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      const display = (finalText + interim).trim();
      setTranscript(display);
      onUpdate?.(display, finalText.trim());
    };

    rec.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      console.warn('SR error:', e.error);
      if (e.error === 'not-allowed') {
        alert('Microphone permission denied. Please allow mic access and reload.');
        setIsListening(false);
      }
    };

    rec.onend = () => {
      if (shouldReset && recognitionRef.current === rec) {
        try { rec.start(); } catch {}
      }
    };

    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
    setTranscript('');

    return () => { shouldReset = false; };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return {
    isSpeaking, isListening, transcript,
    speak, stopSpeaking, startListening, stopListening, resetTranscript,
  };
}

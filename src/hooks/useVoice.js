import { useRef, useState, useCallback, useEffect } from 'react';

export function useVoice() {
  const [isSpeaking, setIsSpeaking]   = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript]   = useState('');
  const recognitionRef  = useRef(null);
  const bestVoiceRef    = useRef(null);
  const synthRef        = useRef(window.speechSynthesis);
  const chunkIndexRef   = useRef(0);
  const chunksRef       = useRef([]);
  const abortedRef      = useRef(false);
  const onEndCallbackRef = useRef(null);
  const speechFrameRef  = useRef(null);
  const pendingSpeechRef = useRef(null);

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
      const matchedVoice = voices.find(v => 
        v.name.toLowerCase().includes(pattern.toLowerCase())
      );
      if (matchedVoice) {
        bestVoiceRef.current = matchedVoice;
        console.log("Selected Premium Female Voice:", matchedVoice.name);
        return;
      }
    }

    const fallbackFemale = 
      voices.find(v => v.lang.toLowerCase() === 'en-in' && /female/i.test(v.name)) ||
      voices.find(v => v.lang.toLowerCase().startsWith('en') && /female/i.test(v.name)) ||
      voices.find(v => v.lang.toLowerCase() === 'en-in') || 
      voices.find(v => v.lang.toLowerCase().startsWith('en')) || 
      voices[0];

    bestVoiceRef.current = fallbackFemale;
    console.log("Selected Fallback Voice:", bestVoiceRef.current.name);
  }, []);
  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  useEffect(() => {
    synthRef.current.addEventListener?.('voiceschanged', pickBestVoice);
    synthRef.current.onvoiceschanged = pickBestVoice;
    pickBestVoice();
    return () => {
      synthRef.current.cancel();
      if (speechFrameRef.current) cancelAnimationFrame(speechFrameRef.current);
    };
  }, [pickBestVoice]);

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
      utt.rate   = 0.85;   
      utt.pitch  = 1.0;
      utt.volume = 1;
      utt.lang   = bestVoiceRef.current?.lang || 'en-IN';

      utt.onend   = () => setTimeout(speakChunk, 140);
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        console.warn('TTS error:', e.error);
        setTimeout(speakChunk, 80);
      };

      synthRef.current.speak(utt);

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
    rec.lang            = 'en-IN';   
    rec.maxAlternatives = 1;

    let finalText   = '';
    let shouldReset = true;

    setIsListening(true);

    const publishSpeechUpdate = (payload) => {
      pendingSpeechRef.current = payload;
      if (speechFrameRef.current) return;
      speechFrameRef.current = requestAnimationFrame(() => {
        speechFrameRef.current = null;
        const latest = pendingSpeechRef.current;
        pendingSpeechRef.current = null;
        if (!latest) return;
        setIsUserSpeaking(latest.isUserSpeaking);
        setTranscript(latest.display);
        onUpdate?.(latest.display, latest.finalText, latest.meta);
        if (!latest.hasInterim) setTimeout(() => setIsUserSpeaking(false), 350);
      });
    };

    let lastDisplay = '';
    let lastUserSpeaking = false;


        rec.onresult = (e) => {
      let interim = '';
      let heardSpeech = false;
      
      // Always rebuild final text cleanly from completed results to avoid data loss
      let accumulatedFinal = '';

      for (let i = 0; i < e.results.length; i++) {
        const piece = e.results[i][0].transcript || '';
        if (piece.trim()) heardSpeech = true;
        
        if (e.results[i].isFinal) {
          accumulatedFinal += piece + ' ';
        } else {
          interim += piece;
        }
      }
      
      // Sync local scope state
      finalText = accumulatedFinal;
      
      const display = (finalText + interim).trim();
      const hasInterim = Boolean(interim.trim());
      const isUserSpeakingNow = heardSpeech && hasInterim;
      
      if (display === lastDisplay && isUserSpeakingNow === lastUserSpeaking) return;
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
      } else {
        setIsListening(false);
      }
    };

    rec.start();
    recognitionRef.current = rec;

    return () => {
      shouldReset = false;
      rec.onend = null;
      try { rec.stop(); } catch {}
      setIsListening(false);
      setIsUserSpeaking(false);
    };
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setIsUserSpeaking(false);
  }, []);

  return {
    isSpeaking,
    isListening,
    isUserSpeaking,
    transcript,
    speak,
    stopSpeaking,
       resetTranscript ,
    startListening,
    stopListening
  };
}

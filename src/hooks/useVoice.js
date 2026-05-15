import { useRef, useState, useCallback, useEffect } from 'react';

export function useVoice() {

  const [isSpeaking, setIsSpeaking]       = useState(false);
  const [isListening, setIsListening]     = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [transcript, setTranscript]       = useState('');
  const [debugLog, setDebugLog]           = useState([]);

  const recognitionRef      = useRef(null);
  const synthRef            = useRef(window.speechSynthesis);
  const bestVoiceRef        = useRef(null);
  const chunkIndexRef       = useRef(0);
  const chunksRef           = useRef([]);
  const abortedRef          = useRef(false);
  const onEndCallbackRef    = useRef(null);
  const restartTimeoutRef   = useRef(null);
  const speakingTimeoutRef  = useRef(null);
  const intentionalStopRef  = useRef(false);
  const transcriptRef       = useRef('');
  const audioStreamRef      = useRef(null);

  const pendingUpdateRef    = useRef(null);
  const flushScheduledRef   = useRef(false);

  const addLog = useCallback((msg) => {
    console.log('🎤 VOICE:', msg);
    setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }, []);

  const normalizeForSpeech = useCallback((value) => {
    return String(value || '')
      .replace(/```[\s\S]*?```/g, ' code block ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_~#>|[\]{}]/g, ' ')
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/&/g, ' and ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const pickBestVoice = useCallback(() => {
    const voices = synthRef.current.getVoices();
    if (!voices.length) {
      addLog('⚠️ No voices available yet');
      return;
    }

    const preferredPatterns = [
      'Microsoft Heera', 'Neerja', 'Google India',
      'Microsoft Aria Online (Natural)', 'Microsoft Jenny Online (Natural)',
      'Google UK English Female', 'Samantha', 'Karen', 'Moira', 'Tessa',
    ];

    for (const pattern of preferredPatterns) {
      const matched = voices.find(v =>
        v.name.toLowerCase().includes(pattern.toLowerCase())
      );
      if (matched) { 
        bestVoiceRef.current = matched;
        addLog(`✅ Voice selected: ${matched.name}`);
        return; 
      }
    }

    bestVoiceRef.current =
      voices.find(v => v.lang.toLowerCase() === 'en-in') ||
      voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
      voices[0];

    addLog(`✅ Fallback voice: ${bestVoiceRef.current?.name}`);
  }, [addLog]);

  useEffect(() => {
    synthRef.current.onvoiceschanged = pickBestVoice;
    pickBestVoice();
    return () => {
      synthRef.current.cancel();
      clearTimeout(restartTimeoutRef.current);
      clearTimeout(speakingTimeoutRef.current);
    };
  }, [pickBestVoice]);

  useEffect(() => {
    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        isListening &&
        recognitionRef.current?.instance
      ) {
        try { 
          addLog('📱 Tab visible, resuming listening...');
          recognitionRef.current.instance.start(); 
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isListening, addLog]);

  // ─── SPEAK ───────────────────────────────────────────────────────────────
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
      if (bestVoiceRef.current) utt.voice = bestVoiceRef.current;
      
      utt.rate   = 0.9;
      utt.pitch  = 1;
      utt.volume = 1;
      utt.lang   = bestVoiceRef.current?.lang || 'en-IN';
      
      utt.onend  = () => { 
        setTimeout(() => { 
          if (!abortedRef.current) speakChunk(); 
        }, 120); 
      };
      
      utt.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        setTimeout(() => { 
          if (!abortedRef.current) speakChunk(); 
        }, 80);
      };
      
      synthRef.current.speak(utt);
      
      setTimeout(() => {
        if (synthRef.current.paused && !abortedRef.current) {
          synthRef.current.resume();
        }
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

  // ─── START LISTENING ─────────────────────────────────────────────────────
  const startListening = useCallback(async (onUpdate) => {
    addLog('🎤 startListening called...');

    // Check browser support
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) {
      addLog('❌ Speech Recognition NOT supported');
      alert('Speech recognition not supported on this browser');
      return () => {};
    }
    addLog('✅ SpeechRecognition API available');

    intentionalStopRef.current = false;

    // CRITICAL FIX: Get microphone permission FIRST
    try {
      addLog('🎤 Requesting microphone permission...');
      
      // Try relaxed constraints first (for Android compatibility)
      let audioConstraints = { audio: true };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        audioStreamRef.current = stream;
        addLog('✅ Microphone permission GRANTED');
        
        // Keep stream alive - DO NOT let it be garbage collected
        // We'll keep the reference until stopListening is called
        
      } catch (firstErr) {
        addLog(`❌ Microphone failed: ${firstErr.message}`);
        alert(`Microphone Error: ${firstErr.name}\n\nPlease check:\n1. Microphone is connected\n2. App has permission\n3. Try Chrome/Edge browser`);
        return () => {};
      }
    } catch (err) {
      addLog(`❌ getUserMedia error: ${err.message}`);
      return () => {};
    }

    // Clean up old instance
    if (recognitionRef.current?.instance) {
      try {
        addLog('🧹 Cleaning up old recognition instance');
        recognitionRef.current.instance.onstart = null;
        recognitionRef.current.instance.onresult = null;
        recognitionRef.current.instance.onerror = null;
        recognitionRef.current.instance.onend = null;
        recognitionRef.current.instance.abort();
      } catch {}
    }

    let finalText = transcriptRef.current || '';

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
        onUpdate?.(latest.display, latest.finalText, latest.meta);
        clearTimeout(speakingTimeoutRef.current);
        if (!latest.hasInterim) {
          speakingTimeoutRef.current = setTimeout(() => setIsUserSpeaking(false), 350);
        }
      });
    };

    const createRecognition = () => {
      addLog('🔨 Creating new SpeechRecognition instance');
      const rec = new SRClass();
      
      // CRITICAL SETTINGS FOR MOBILE
      rec.continuous = true;           // Keep listening through pauses
      rec.interimResults = true;       // Get interim results
      rec.lang = 'en-IN';              // India English
      rec.maxAlternatives = 0;         // No alternatives (more stable)
      
      // CRITICAL: onstart callback
      rec.onstart = () => {
        addLog('🟢 Recognition STARTED');
        setIsListening(true);
      };

      rec.onresult = (e) => {
        addLog(`📝 Result event: resultIndex=${e.resultIndex}, total=${e.results.length}`);
        
        let interim = '';

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const piece = e.results[i][0].transcript || '';
          const isFinal = e.results[i].isFinal;

          addLog(`  [${i}] ${isFinal ? '✅ FINAL' : '⏳ INTERIM'}: "${piece}"`);

          if (isFinal) {
            finalText += piece;
            if (finalText && !finalText.endsWith(' ')) finalText += ' ';
          } else {
            interim += piece;
          }
        }

        transcriptRef.current = finalText;
        const display = (finalText + interim).trim();
        const hasInterim = Boolean(interim.trim());

        addLog(`  Display: "${display}"`);

        scheduleFlush({
          display,
          finalText: finalText.trim(),
          isUserSpeaking: hasInterim,
          hasInterim,
          meta: { hasInterim, lastSpeechAt: Date.now() },
        });
      };

      rec.onerror = (e) => {
        addLog(`⚠️ Recognition ERROR: ${e.error}`);
        
        if (e.error === 'not-allowed') {
          addLog('❌ Microphone permission DENIED');
          setIsListening(false);
          alert('Microphone permission was denied');
          return;
        }
        
        if (e.error === 'no-speech') {
          addLog('⏱️ No speech detected (normal, waiting for audio)');
        }
        
        if (e.error === 'network') {
          addLog('❌ Network error - offline?');
        }
        
        if (e.error === 'audio-capture') {
          addLog('❌ Audio capture error - microphone problem?');
        }
      };

      rec.onend = () => {
        addLog('🔴 Recognition ENDED');
        
        if (intentionalStopRef.current) {
          addLog('↪️ Stop was intentional, not restarting');
          return;
        }
        
        if (recognitionRef.current?.instance !== rec) {
          addLog('↪️ This is an old instance, ignoring');
          return;
        }

        clearTimeout(restartTimeoutRef.current);

        // MOBILE FIX: Longer restart delay
        const delayMs = isMobile() ? 800 : 300;
        addLog(`⏳ Scheduling restart in ${delayMs}ms...`);
        
        restartTimeoutRef.current = setTimeout(() => {
          if (intentionalStopRef.current) {
            addLog('↪️ Cancelled restart - user stopped');
            return;
          }
          
          try {
            addLog('🔄 Restarting recognition...');
            rec.start();
          } catch (err) {
            addLog(`⚠️ Restart failed: ${err.message}, creating fresh instance`);
            if (!intentionalStopRef.current) {
              const fresh = createRecognition();
              recognitionRef.current.instance = fresh;
              try { 
                addLog('🎤 Starting fresh instance');
                fresh.start(); 
              } catch (e) {
                addLog(`❌ Fresh start failed: ${e.message}`);
              }
            }
          }
        }, delayMs);
      };

      return rec;
    };

    const rec = createRecognition();
    if (!recognitionRef.current) {
      recognitionRef.current = {};
    }
    recognitionRef.current.instance = rec;

    try {
      addLog('🎤 Calling rec.start()...');
      rec.start();
      addLog('✅ rec.start() succeeded');
    } catch (err) {
      addLog(`❌ rec.start() failed: ${err.message}`);
      setIsListening(false);
    }

    return () => { 
      addLog('🛑 Cleanup function called');
      intentionalStopRef.current = true;
    };
  }, [addLog, isMobile]);

  // ─── STOP LISTENING ───────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    addLog('🛑 stopListening called');
    intentionalStopRef.current = true;
    clearTimeout(restartTimeoutRef.current);
    clearTimeout(speakingTimeoutRef.current);
    
    // Stop audio stream
    if (audioStreamRef.current) {
      addLog('🛑 Stopping audio stream');
      try {
        audioStreamRef.current.getTracks().forEach(track => {
          track.stop();
          addLog(`  Stopped track: ${track.kind}`);
        });
      } catch (e) {
        addLog(`⚠️ Error stopping stream: ${e.message}`);
      }
      audioStreamRef.current = null;
    }
    
    // Stop recognition
    if (recognitionRef.current?.instance) {
      try {
        addLog('🛑 Stopping recognition instance');
        recognitionRef.current.instance.onstart = null;
        recognitionRef.current.instance.onresult = null;
        recognitionRef.current.instance.onerror = null;
        recognitionRef.current.instance.onend = null;
        recognitionRef.current.instance.abort();
      } catch (e) {
        addLog(`⚠️ Error stopping recognition: ${e.message}`);
      }
      recognitionRef.current = null;
    }
    
    flushScheduledRef.current = false;
    pendingUpdateRef.current = null;
    setIsListening(false);
    setIsUserSpeaking(false);
    addLog('✅ Listening stopped');
  }, [addLog]);

  // ─── RESET TRANSCRIPT ─────────────────────────────────────────────────────
  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
  }, []);

  return {
    isSpeaking, isListening, isUserSpeaking, transcript,
    speak, stopSpeaking, startListening, stopListening, resetTranscript,
    debugLog, // Export debug log for troubleshooting
  };
}
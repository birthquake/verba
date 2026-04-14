import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

const LANGUAGES = [
  { label: 'Spanish',    code: 'es', voice: 'es-ES', whisper: 'es' },
  { label: 'Mandarin',   code: 'zh', voice: 'zh-CN', whisper: 'zh' },
  { label: 'Cantonese',  code: 'yue', voice: 'zh-HK', whisper: 'yue' },
  { label: 'Portuguese', code: 'pt', voice: 'pt-BR', whisper: 'pt' },
  { label: 'French',     code: 'fr', voice: 'fr-FR', whisper: 'fr' },
  { label: 'Arabic',     code: 'ar', voice: 'ar-SA', whisper: 'ar' },
];

const PATIENT_LABELS = {
  es:  'Paciente — Español',
  zh:  '患者 — 普通话',
  yue: '病人 — 廣東話',
  pt:  'Paciente — Português',
  fr:  'Patient — Français',
  ar:  'مريض — العربية',
};

const PATIENT_BUTTONS = {
  es:  { idle: 'Mantén para hablar',    listening: 'Escuchando...' },
  zh:  { idle: '按住说话',               listening: '聆听中...' },
  yue: { idle: '按住講嘢',               listening: '聆聽中...' },
  pt:  { idle: 'Segure para falar',     listening: 'Ouvindo...' },
  fr:  { idle: 'Maintenir pour parler', listening: 'Écoute...' },
  ar:  { idle: 'اضغط للتحدث',           listening: 'جارٍ الاستماع...' },
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [activeSide, setActiveSide] = useState(null);
  const [status, setStatus] = useState('');
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const providerRef = useRef(null);
  const patientRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (providerRef.current) {
      providerRef.current.scrollTop = providerRef.current.scrollHeight;
    }
    if (patientRef.current) {
      patientRef.current.scrollTop = patientRef.current.scrollHeight;
    }
  }, [messages]);

  // Prevent screen lock
  useEffect(() => {
    let wakeLock = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.log('Wake lock not available:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  const getSupportedMimeType = () => {
    const types = [
      'audio/mp4',
      'audio/aac',
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startListening = async (side) => {
    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;
      setIsListening(true);
      setActiveSide(side);
      setStatus('Listening...');
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setStatus('Translating...');
        const mimeUsed = mediaRecorder.mimeType || mimeType || 'audio/mp4';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeUsed });
        await processAudio(audioBlob, side, mimeUsed);
      };

      mediaRecorder.start(250);

    } catch (err) {
      console.error('Mic error:', err);
      setStatus('Microphone access denied. Please allow microphone in Safari settings.');
      setIsListening(false);
      setActiveSide(null);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Stop error:', e);
      }
      setIsListening(false);
      setActiveSide(null);
    }
  };

  const getFileExtension = (mimeType) => {
    if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg')) return 'ogg';
    return 'mp4';
  };

  const processAudio = async (audioBlob, side, mimeType) => {
    try {
      if (audioBlob.size < 500) {
        setStatus('Recording too short. Hold longer and speak clearly.');
        return;
      }

      const extension = getFileExtension(mimeType);
      const formData = new FormData();
      formData.append('file', audioBlob, `audio.${extension}`);
      formData.append('model', 'whisper-1');
      formData.append('language', side === 'provider' ? 'en' : selectedLang.whisper);

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });

      if (!whisperRes.ok) {
        const errData = await whisperRes.json();
        console.error('Whisper error:', errData);
        setStatus('Transcription failed. Please try again.');
        return;
      }

      const whisperData = await whisperRes.json();
      const originalText = whisperData.text?.trim();

      if (!originalText) {
        setStatus('No speech detected. Hold longer and speak clearly.');
        return;
      }

      const messageId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          side,
          original: originalText,
          translated: null,
        },
      ]);
      setStatus('');

      const sourceLang = side === 'provider' ? 'English' : selectedLang.label;
      const targetLang = side === 'provider' ? selectedLang.label : 'English';

      const translateRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
  role: 'system',
  content: `You are a certified medical interpreter specializing in clinical communication. 

Your rules:
- Translate from ${sourceLang} to ${targetLang}
- Use formal clinical register appropriate for a hospital or clinic setting
- Preserve all medical terminology, anatomical terms, medication names, and dosages exactly
- Preserve numbers, measurements, and units exactly (e.g. "10mg", "120/80", "37.5°C")
- Do not add explanations, clarifications, or commentary
- Do not soften or rephrase symptoms — translate them as stated
- If a term has no direct equivalent, use the closest clinical term in the target language
- Return only the translated text, nothing else`,
},
            { role: 'user', content: originalText },
          ],
        }),
      });

      if (!translateRes.ok) {
        const errData = await translateRes.json();
        console.error('Translation error:', errData);
        setStatus('Translation failed. Please try again.');
        return;
      }

      const translateData = await translateRes.json();
      const translatedText = translateData.choices?.[0]?.message?.content?.trim();

      if (!translatedText) {
        setStatus('Translation failed. Try again.');
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, translated: translatedText } : m
        )
      );

      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = side === 'provider' ? selectedLang.voice : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

    } catch (err) {
      console.error('Process error:', err);
      setStatus('Something went wrong. Please try again.');
    }
  };

  const clearSession = () => {
    setMessages([]);
    setStatus('');
  };

  const handleLangChange = (e) => {
    const lang = LANGUAGES.find(l => l.code === e.target.value);
    if (lang) {
      setSelectedLang(lang);
      clearSession();
    }
  };

  const patientLabel = PATIENT_LABELS[selectedLang.code];
  const patientBtn = PATIENT_BUTTONS[selectedLang.code];

  return (
    <div className="app">

      {/* Audio unlock overlay */}
      {!audioUnlocked && (
        <div className="unlock-overlay" onClick={() => {
          const utterance = new SpeechSynthesisUtterance(' ');
          utterance.volume = 0;
          window.speechSynthesis.speak(utterance);
          setAudioUnlocked(true);
        }}>
          <div className="unlock-box">
            <span className="unlock-icon">🔊</span>
            <p className="unlock-title">Tap to enable audio</p>
            <p className="unlock-sub">Required for voice translation</p>
          </div>
        </div>
      )}

      {/* Provider side (top) */}
      <div className={`side provider ${activeSide === 'provider' && isListening ? 'active' : ''}`}>
        <div className="side-label">Healthcare Provider — English</div>
        <div className="messages" ref={providerRef}>
          {messages.map((m) => (
            <div key={m.id} className={`message ${m.side === 'provider' ? 'sent' : 'received'}`}>
              <span className="original">
                {m.side === 'provider' ? m.original : (m.translated ?? '...')}
              </span>
            </div>
          ))}
        </div>
        <button
          className={`speak-btn ${activeSide === 'provider' && isListening ? 'listening' : ''}`}
          onMouseDown={() => startListening('provider')}
          onMouseUp={stopListening}
          onTouchStart={(e) => { e.preventDefault(); startListening('provider'); }}
          onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
        >
          {activeSide === 'provider' && isListening ? 'Listening...' : 'Hold to Speak'}
        </button>
      </div>

      {/* Center divider */}
      <div className="divider">
        <span className="app-name">Verba</span>
        <select
          className="lang-select"
          value={selectedLang.code}
          onChange={handleLangChange}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
        {status ? <span className="status">{status}</span> : null}
        {messages.length > 0 && (
          <button className="clear-btn" onClick={clearSession}>Clear</button>
        )}
      </div>

      {/* Patient side (bottom, rotated) */}
      <div className={`side patient ${activeSide === 'patient' && isListening ? 'active' : ''}`}>
        <button
          className={`speak-btn ${activeSide === 'patient' && isListening ? 'listening' : ''}`}
          onMouseDown={() => startListening('patient')}
          onMouseUp={stopListening}
          onTouchStart={(e) => { e.preventDefault(); startListening('patient'); }}
          onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
        >
          {activeSide === 'patient' && isListening ? patientBtn.listening : patientBtn.idle}
        </button>
        <div className="messages" ref={patientRef}>
          {messages.map((m) => (
            <div key={m.id} className={`message ${m.side === 'patient' ? 'sent' : 'received'}`}>
              <span className="original">
                {m.side === 'patient' ? m.original : (m.translated ?? '...')}
              </span>
            </div>
          ))}
        </div>
        <div className="side-label">{patientLabel}</div>
      </div>

    </div>
  );
}

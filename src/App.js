import React, { useState, useRef, useEffect, useCallback } from 'react';
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

const SPECIALTIES = [
  { label: 'General',    code: 'general',    prompt: '' },
  {
    label: 'Emergency',  code: 'emergency',
    prompt: `This is an emergency department encounter. Prioritize clarity and urgency in all translations. 
Use triage vocabulary, vital signs terminology, and trauma language where appropriate. 
Translate time-sensitive instructions with directness and precision.`,
  },
  {
    label: 'Maternity',  code: 'maternity',
    prompt: `This is a maternity or obstetrics encounter. Use terminology appropriate for labor, delivery, 
prenatal care, postpartum recovery, and infant care. Be precise with contraction timing, 
dilation measurements, and fetal monitoring terms.`,
  },
  {
    label: 'Pediatrics', code: 'pediatrics',
    prompt: `This is a pediatric encounter. When speaking to the patient use age-appropriate language. 
When speaking to the parent or caregiver use clear, non-alarming clinical language. 
Use developmental and growth terminology where appropriate.`,
  },
  {
    label: 'Cardiology', code: 'cardiology',
    prompt: `This is a cardiology encounter. Use precise cardiac terminology including symptoms, 
diagnostic procedures, medications, and monitoring terms. Be exact with measurements 
such as blood pressure readings, heart rate, and ejection fraction values.`,
  },
  {
    label: 'Surgery',    code: 'surgery',
    prompt: `This is a surgical encounter. Use terminology appropriate for pre-operative consent, 
post-operative instructions, wound care, pain management, and anesthesia. 
Be precise with procedure names and recovery expectations.`,
  },
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

const PATIENT_ONBOARDING = {
  es: {
    title: 'Bienvenido a Verba',
    body: 'Esta aplicación traduce lo que usted y su médico dicen en tiempo real.',
    instruction: 'Mantenga presionado el botón verde para hablar. Hable con naturalidad.',
    privacy: 'Su conversación es privada y no se almacena.',
    dismiss: 'Entendido',
    repeat: 'Repetir',
  },
  zh: {
    title: '欢迎使用 Verba',
    body: '此应用程序可实时翻译您和医生之间的对话。',
    instruction: '按住绿色按钮说话。请自然地说话。',
    privacy: '您的对话是私密的，不会被存储。',
    dismiss: '我明白了',
    repeat: '重复',
  },
  yue: {
    title: '歡迎使用 Verba',
    body: '此應用程式可即時翻譯您和醫生之間的對話。',
    instruction: '按住綠色按鈕說話。請自然地說話。',
    privacy: '您的對話是私密的，不會被儲存。',
    dismiss: '我明白了',
    repeat: '重複',
  },
  pt: {
    title: 'Bem-vindo ao Verba',
    body: 'Este aplicativo traduz em tempo real o que você e seu médico dizem.',
    instruction: 'Mantenha o botão verde pressionado para falar. Fale naturalmente.',
    privacy: 'Sua conversa é privada e não é armazenada.',
    dismiss: 'Entendi',
    repeat: 'Repetir',
  },
  fr: {
    title: 'Bienvenue sur Verba',
    body: 'Cette application traduit en temps réel ce que vous et votre médecin dites.',
    instruction: 'Maintenez le bouton vert appuyé pour parler. Parlez naturellement.',
    privacy: "Votre conversation est privée et n'est pas enregistrée.",
    dismiss: "J'ai compris",
    repeat: 'Répéter',
  },
  ar: {
    title: 'مرحباً بك في Verba',
    body: 'يترجم هذا التطبيق ما تقوله أنت وطبيبك في الوقت الفعلي.',
    instruction: 'اضغط باستمرار على الزر الأخضر للتحدث. تحدث بشكل طبيعي.',
    privacy: 'محادثتك خاصة ولا يتم تخزينها.',
    dismiss: 'فهمت',
    repeat: 'كرر',
  },
};

const PHRASE_CATEGORIES = [
  {
    category: 'Pain',
    phrases: [
      'Where is your pain?',
      'Rate your pain 1 to 10.',
      'Is the pain constant or does it come and go?',
      'Does the pain radiate anywhere?',
    ],
  },
  {
    category: 'Assessment',
    phrases: [
      'Are you having trouble breathing?',
      'Do you feel dizzy or nauseous?',
      'Do you have a fever?',
      'How long have you had this symptom?',
    ],
  },
  {
    category: 'History',
    phrases: [
      'Do you have any allergies?',
      'What medications are you currently taking?',
      'Do you have any chronic conditions?',
    ],
  },
  {
    category: 'Consent',
    phrases: [
      'I need to examine you.',
      'I am going to give you medication.',
      'Do you understand?',
      'Please sign here.',
    ],
  },
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [activeSide, setActiveSide] = useState(null);
  const [status, setStatus] = useState('');
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(SPECIALTIES[0]);
  const [showPhrases, setShowPhrases] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [translatingPhrase, setTranslatingPhrase] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isSpeakingOnboarding, setIsSpeakingOnboarding] = useState(false);
  const providerRef = useRef(null);
  const patientRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (providerRef.current) {
      providerRef.current.scrollTop = providerRef.current.scrollHeight;
    }
    if (patientRef.current) {
      patientRef.current.scrollTop = patientRef.current.scrollHeight;
    }
  }, [messages]);

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

  const speakOnboarding = useCallback(() => {
    window.speechSynthesis.cancel();
    const onboarding = PATIENT_ONBOARDING[selectedLang.code];
    const fullText = `${onboarding.body} ${onboarding.instruction} ${onboarding.privacy}`;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = selectedLang.voice;
    utterance.rate = 0.85;
    utterance.onstart = () => setIsSpeakingOnboarding(true);
    utterance.onend = () => setIsSpeakingOnboarding(false);
    utterance.onerror = () => setIsSpeakingOnboarding(false);
    window.speechSynthesis.speak(utterance);
  }, [selectedLang]);

  useEffect(() => {
    if (showOnboarding) {
      setTimeout(() => speakOnboarding(), 400);
    } else {
      window.speechSynthesis.cancel();
      setIsSpeakingOnboarding(false);
    }
  }, [showOnboarding, speakOnboarding]);

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

  const buildSystemPrompt = (sourceLang, targetLang) => {
    const base = `You are a certified medical interpreter specializing in clinical communication.

Your rules:
- Translate from ${sourceLang} to ${targetLang}
- Use formal clinical register appropriate for a hospital or clinic setting
- Preserve all medical terminology, anatomical terms, medication names, and dosages exactly
- Preserve numbers, measurements, and units exactly (e.g. "10mg", "120/80", "37.5°C")
- Do not add explanations, clarifications, or commentary
- Do not soften or rephrase symptoms — translate them as stated
- If a term has no direct equivalent, use the closest clinical term in the target language
- Return only the translated text, nothing else`;

    if (selectedSpecialty.prompt) {
      return `${base}\n\nSpecialty context:\n${selectedSpecialty.prompt}`;
    }
    return base;
  };

  const handleBubbleTap = async (message, viewSide) => {
    const key = `${message.id}-${viewSide}`;
    const isExpanded = expandedMessages[key];

    if (isExpanded) {
      setExpandedMessages((prev) => ({ ...prev, [key]: null }));
      return;
    }

    const shownText = viewSide === 'provider'
      ? (message.side === 'provider' ? message.original : message.translated)
      : (message.side === 'patient' ? message.original : message.translated);

    if (!shownText || shownText === '...') return;

    const shownLang = viewSide === 'provider'
      ? (message.side === 'provider' ? 'English' : selectedLang.label)
      : (message.side === 'patient' ? selectedLang.label : 'English');

    const backLang = shownLang === 'English' ? selectedLang.label : 'English';

    if (message.backTranslations?.[key]) {
      setExpandedMessages((prev) => ({
        ...prev,
        [key]: message.backTranslations[key],
      }));
      return;
    }

    setExpandedMessages((prev) => ({ ...prev, [key]: 'loading' }));

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `You are a certified medical interpreter. Translate from ${shownLang} to ${backLang}. Return only the translated text, nothing else.`,
            },
            { role: 'user', content: shownText },
          ],
        }),
      });

      const data = await res.json();
      const backText = data.choices?.[0]?.message?.content?.trim();

      if (backText) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? { ...m, backTranslations: { ...m.backTranslations, [key]: backText } }
              : m
          )
        );
        setExpandedMessages((prev) => ({ ...prev, [key]: backText }));
      } else {
        setExpandedMessages((prev) => ({ ...prev, [key]: null }));
      }
    } catch (err) {
      console.error('Back-translation error:', err);
      setExpandedMessages((prev) => ({ ...prev, [key]: null }));
    }
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
          backTranslations: {},
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
              content: buildSystemPrompt(sourceLang, targetLang),
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

  const handlePhraseTap = async (phrase) => {
    setTranslatingPhrase(phrase);

    try {
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
              content: buildSystemPrompt('English', selectedLang.label),
            },
            { role: 'user', content: phrase },
          ],
        }),
      });

      const translateData = await translateRes.json();
      const translatedText = translateData.choices?.[0]?.message?.content?.trim();

      if (!translatedText) return;

      const messageId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          side: 'provider',
          original: phrase,
          translated: translatedText,
          backTranslations: {},
        },
      ]);

      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = selectedLang.voice;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

      setShowPhrases(false);

    } catch (err) {
      console.error('Phrase translation error:', err);
    } finally {
      setTranslatingPhrase(null);
    }
  };

  const buildTranscript = () => {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const time = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });
    const header = [
      'Verba Session Transcript',
      `Date: ${date} at ${time}`,
      `Languages: English — ${selectedLang.label}`,
      `Specialty: ${selectedSpecialty.label}`,
      '',
      '---',
      '',
    ].join('\n');

    const body = messages
      .filter((m) => m.translated)
      .map((m) => {
        const providerLabel = 'Provider';
        const patientLabel = selectedLang.label;
        if (m.side === 'provider') {
          return `[${providerLabel}] ${m.original}\n[${patientLabel}] ${m.translated}`;
        } else {
          return `[${patientLabel}] ${m.original}\n[${providerLabel}] ${m.translated}`;
        }
      })
      .join('\n\n');

    return header + body;
  };

  const handleCopy = async () => {
    const transcript = buildTranscript();
    try {
      await navigator.clipboard.writeText(transcript);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleShare = async () => {
    const transcript = buildTranscript();
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Verba Session Transcript',
          text: transcript,
        });
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const clearSession = () => {
    setMessages([]);
    setStatus('');
    setShowExport(false);
    setExpandedMessages({});
    setShowSettings(false);
  };

  const handleLangChange = (e) => {
    const lang = LANGUAGES.find(l => l.code === e.target.value);
    if (lang) {
      setSelectedLang(lang);
      clearSession();
    }
  };

  const handleSpecialtyChange = (e) => {
    const specialty = SPECIALTIES.find(s => s.code === e.target.value);
    if (specialty) {
      setSelectedSpecialty(specialty);
      clearSession();
    }
  };

  const patientLabel = PATIENT_LABELS[selectedLang.code];
  const patientBtn = PATIENT_BUTTONS[selectedLang.code];
  const onboarding = PATIENT_ONBOARDING[selectedLang.code];

  const renderMessages = (viewSide, ref) => (
    <div className="messages" ref={ref}>
      {messages.map((m) => {
        const key = `${m.id}-${viewSide}`;
        const isSent = m.side === viewSide;
        const shownText = isSent ? m.original : (m.translated ?? '...');
        const backText = expandedMessages[key];
        const isExpanded = !!backText;

        return (
          <div
            key={m.id}
            className={`message ${isSent ? 'sent' : 'received'} ${isExpanded ? 'expanded' : ''}`}
            onClick={() => m.translated && handleBubbleTap(m, viewSide)}
          >
            <span className="original">{shownText}</span>
            {isExpanded && (
              <span className="back-translation">
                {backText === 'loading' ? 'Verifying...' : `↩ ${backText}`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

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
        <div className="side-label">
          Healthcare Provider — English
          {selectedSpecialty.code !== 'general' && (
            <span className="specialty-badge">{selectedSpecialty.label}</span>
          )}
        </div>
        {renderMessages('provider', providerRef)}
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
        {status && <span className="status">{status}</span>}
        <div className="divider-actions">
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            ⚙
          </button>
        </div>
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
        {renderMessages('patient', patientRef)}
        <div className="side-label">{patientLabel}</div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="phrases-overlay" onClick={() => setShowSettings(false)}>
          <div className="phrases-panel settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Session Settings</span>
              <button className="phrases-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div className="settings-row">
              <span className="settings-label">Patient language</span>
              <select
                className="settings-select"
                value={selectedLang.code}
                onChange={handleLangChange}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="settings-row">
              <span className="settings-label">Specialty</span>
              <select
                className="settings-select"
                value={selectedSpecialty.code}
                onChange={handleSpecialtyChange}
              >
                {SPECIALTIES.map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="settings-divider" />

            <button
              className="settings-action-btn"
              onClick={() => { setShowSettings(false); setShowPhrases(true); }}
            >
              Quick Phrases
            </button>

            <button
              className="settings-action-btn"
              onClick={() => { setShowSettings(false); setShowOnboarding(true); }}
            >
              Patient Intro
            </button>

            {messages.length > 0 && (
              <>
                <div className="settings-divider" />
                <button
                  className="settings-action-btn"
                  onClick={() => { setShowSettings(false); setShowExport(true); }}
                >
                  Export Transcript
                </button>
                <button
                  className="settings-action-btn danger"
                  onClick={clearSession}
                >
                  Clear Session
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Patient onboarding overlay */}
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-box">
            <div className="onboarding-icon">🌐</div>
            <p className="onboarding-title">{onboarding.title}</p>
            <p className="onboarding-body">{onboarding.body}</p>
            <p className="onboarding-instruction">{onboarding.instruction}</p>
            <p className="onboarding-privacy">{onboarding.privacy}</p>
            <button
              className="onboarding-repeat"
              onClick={speakOnboarding}
              disabled={isSpeakingOnboarding}
            >
              {isSpeakingOnboarding ? '🔊 ...' : `🔊 ${onboarding.repeat}`}
            </button>
            <button
              className="onboarding-dismiss"
              onClick={() => setShowOnboarding(false)}
            >
              {onboarding.dismiss}
            </button>
          </div>
        </div>
      )}

      {/* Phrases panel */}
      {showPhrases && (
        <div className="phrases-overlay" onClick={() => setShowPhrases(false)}>
          <div className="phrases-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Quick Phrases</span>
              <button className="phrases-close" onClick={() => setShowPhrases(false)}>✕</button>
            </div>
            <div className="phrases-tabs">
              {PHRASE_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.category}
                  className={`phrases-tab ${activeCategory === i ? 'active' : ''}`}
                  onClick={() => setActiveCategory(i)}
                >
                  {cat.category}
                </button>
              ))}
            </div>
            <div className="phrases-list">
              {PHRASE_CATEGORIES[activeCategory].phrases.map((phrase) => (
                <button
                  key={phrase}
                  className={`phrase-item ${translatingPhrase === phrase ? 'loading' : ''}`}
                  onClick={() => handlePhraseTap(phrase)}
                  disabled={translatingPhrase !== null}
                >
                  {translatingPhrase === phrase ? 'Translating...' : phrase}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export panel */}
      {showExport && (
        <div className="phrases-overlay" onClick={() => setShowExport(false)}>
          <div className="phrases-panel export-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Export Transcript</span>
              <button className="phrases-close" onClick={() => setShowExport(false)}>✕</button>
            </div>
            <p className="export-desc">
              Export the full bilingual transcript from this session.
            </p>
            <button className="export-action-btn" onClick={handleCopy}>
              {copyConfirmed ? '✓ Copied to clipboard' : 'Copy to clipboard'}
            </button>
            <button className="export-action-btn share" onClick={handleShare}>
              Share via...
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

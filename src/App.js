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

// PHRASE_CATEGORIES now includes pre-translated versions for all 6 languages.
// Each phrase object has: english + translations keyed by language code.
const PHRASE_CATEGORIES = [
  {
    category: 'Pain',
    phrases: [
      {
        english: 'Where is your pain?',
        es: '¿Dónde le duele?',
        zh: '您哪里疼？',
        yue: '你喺邊度痛？',
        pt: 'Onde é a sua dor?',
        fr: 'Où avez-vous mal?',
        ar: 'أين يوجد ألمك؟',
      },
      {
        english: 'Rate your pain 1 to 10.',
        es: 'Califique su dolor del 1 al 10.',
        zh: '请用1到10分来描述您的疼痛程度。',
        yue: '請用1至10分評估你嘅痛楚程度。',
        pt: 'Classifique sua dor de 1 a 10.',
        fr: 'Évaluez votre douleur de 1 à 10.',
        ar: 'قيّم ألمك من 1 إلى 10.',
      },
      {
        english: 'Is the pain constant or does it come and go?',
        es: '¿El dolor es constante o va y viene?',
        zh: '疼痛是持续的还是时好时坏？',
        yue: '痛楚係持續定係時好時壞？',
        pt: 'A dor é constante ou vai e vem?',
        fr: 'La douleur est-elle constante ou intermittente?',
        ar: 'هل الألم مستمر أم يأتي ويذهب؟',
      },
      {
        english: 'Does the pain radiate anywhere?',
        es: '¿El dolor se irradia a algún lugar?',
        zh: '疼痛是否向其他部位放射？',
        yue: '痛楚有冇擴散到其他地方？',
        pt: 'A dor irradia para algum lugar?',
        fr: 'La douleur irradie-t-elle quelque part?',
        ar: 'هل ينتشر الألم إلى مكان آخر؟',
      },
    ],
  },
  {
    category: 'Assessment',
    phrases: [
      {
        english: 'Are you having trouble breathing?',
        es: '¿Tiene dificultad para respirar?',
        zh: '您呼吸困难吗？',
        yue: '你有冇呼吸困難？',
        pt: 'Você está tendo dificuldade para respirar?',
        fr: 'Avez-vous des difficultés à respirer?',
        ar: 'هل تعاني من صعوبة في التنفس؟',
      },
      {
        english: 'Do you feel dizzy or nauseous?',
        es: '¿Se siente mareado o con náuseas?',
        zh: '您感到头晕或恶心吗？',
        yue: '你有冇頭暈或作嘔？',
        pt: 'Você se sente tonto ou com náusea?',
        fr: 'Vous sentez-vous étourdi ou nauséeux?',
        ar: 'هل تشعر بالدوار أو الغثيان؟',
      },
      {
        english: 'Do you have a fever?',
        es: '¿Tiene fiebre?',
        zh: '您发烧了吗？',
        yue: '你有冇發燒？',
        pt: 'Você tem febre?',
        fr: 'Avez-vous de la fièvre?',
        ar: 'هل لديك حمى؟',
      },
      {
        english: 'How long have you had this symptom?',
        es: '¿Cuánto tiempo lleva con este síntoma?',
        zh: '这个症状持续多久了？',
        yue: '呢個症狀持續幾耐了？',
        pt: 'Há quanto tempo você tem esse sintoma?',
        fr: 'Depuis combien de temps avez-vous ce symptôme?',
        ar: 'منذ متى وأنت تعاني من هذا العَرَض؟',
      },
    ],
  },
  {
    category: 'History',
    phrases: [
      {
        english: 'Do you have any allergies?',
        es: '¿Tiene alguna alergia?',
        zh: '您有过敏症吗？',
        yue: '你有冇過敏？',
        pt: 'Você tem alguma alergia?',
        fr: 'Avez-vous des allergies?',
        ar: 'هل لديك أي حساسية؟',
      },
      {
        english: 'What medications are you currently taking?',
        es: '¿Qué medicamentos está tomando actualmente?',
        zh: '您目前在服用哪些药物？',
        yue: '你而家食緊咩藥？',
        pt: 'Quais medicamentos você está tomando atualmente?',
        fr: 'Quels médicaments prenez-vous actuellement?',
        ar: 'ما الأدوية التي تتناولها حالياً؟',
      },
      {
        english: 'Do you have any chronic conditions?',
        es: '¿Tiene alguna enfermedad crónica?',
        zh: '您有慢性疾病吗？',
        yue: '你有冇慢性病？',
        pt: 'Você tem alguma condição crônica?',
        fr: 'Avez-vous des maladies chroniques?',
        ar: 'هل لديك أي أمراض مزمنة؟',
      },
    ],
  },
  {
    category: 'Consent',
    phrases: [
      {
        english: 'I need to examine you.',
        es: 'Necesito examinarlo/a.',
        zh: '我需要给您做检查。',
        yue: '我需要為你進行檢查。',
        pt: 'Preciso examiná-lo/a.',
        fr: 'Je dois vous examiner.',
        ar: 'أحتاج إلى فحصك.',
      },
      {
        english: 'I am going to give you medication.',
        es: 'Le voy a administrar medicamento.',
        zh: '我要给您用药。',
        yue: '我將會為你用藥。',
        pt: 'Vou lhe administrar medicamento.',
        fr: 'Je vais vous administrer un médicament.',
        ar: 'سأعطيك دواءً.',
      },
      {
        english: 'Do you understand?',
        es: '¿Entiende?',
        zh: '您明白吗？',
        yue: '你明白嗎？',
        pt: 'Você entende?',
        fr: 'Comprenez-vous?',
        ar: 'هل تفهم؟',
      },
      {
        english: 'Please sign here.',
        es: 'Por favor firme aquí.',
        zh: '请在这里签名。',
        yue: '請喺呢度簽名。',
        pt: 'Por favor, assine aqui.',
        fr: 'Veuillez signer ici.',
        ar: 'من فضلك وقّع هنا.',
      },
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
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryCopyConfirmed, setSummaryCopyConfirmed] = useState(false);
  const [caregiverMode, setCaregiverMode] = useState(false);
  const [caregiverSpeaksEnglish, setCaregiverSpeaksEnglish] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineManual, setOfflineManual] = useState(false);
  const providerRef = useRef(null);
  const patientRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Auto-detect online/offline status
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Combined offline state: auto-detected OR manually set
  const offlineActive = isOffline || offlineManual;

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

  const getSideLanguages = (side) => {
    if (side === 'provider' || (side === 'caregiver' && caregiverSpeaksEnglish)) {
      return {
        sourceLang: 'English',
        targetLang: selectedLang.label,
        targetVoice: selectedLang.voice,
        whisperLang: 'en',
      };
    }
    return {
      sourceLang: selectedLang.label,
      targetLang: 'English',
      targetVoice: 'en-US',
      whisperLang: selectedLang.whisper,
    };
  };

  const generateSummary = async (forceRegenerate = false) => {
    if (sessionSummary && !forceRegenerate) {
      setShowSettings(false);
      setShowSummary(true);
      return;
    }

    setShowSettings(false);
    setShowSummary(true);
    setSummaryLoading(true);
    setSessionSummary(null);

    const transcriptLines = messages
      .filter((m) => m.translated)
      .map((m) => {
        const speakerLabel =
          m.side === 'provider' ? 'Provider'
          : m.side === 'caregiver' ? 'Caregiver'
          : 'Patient';
        return `${speakerLabel}: ${m.original}\n→ (translated): ${m.translated}`;
      })
      .join('\n\n');

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
              content: `You are a clinical documentation assistant. Given a bilingual clinical conversation transcript, generate a concise session summary in English for the healthcare provider.

The summary should be structured with these sections, and only include a section if relevant content exists in the transcript:
- Chief Complaint
- Key Symptoms
- Instructions Given
- Follow-up Needed

Write in clear, clinical language. Be brief — this is a quick reference, not a full note. Do not include patient names or identifying information. Return only the summary, no preamble.`,
            },
            {
              role: 'user',
              content: `Specialty: ${selectedSpecialty.label}\nLanguages: English — ${selectedLang.label}\n\nTranscript:\n${transcriptLines}`,
            },
          ],
        }),
      });

      const data = await res.json();
      const summary = data.choices?.[0]?.message?.content?.trim();
      setSessionSummary(summary || 'Could not generate summary. Please try again.');
    } catch (err) {
      console.error('Summary error:', err);
      setSessionSummary('Something went wrong. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSummaryCopy = async () => {
    if (!sessionSummary) return;
    try {
      await navigator.clipboard.writeText(sessionSummary);
      setSummaryCopyConfirmed(true);
      setTimeout(() => setSummaryCopyConfirmed(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const handleBubbleTap = async (message, viewSide) => {
    const key = `${message.id}-${viewSide}`;
    const isExpanded = expandedMessages[key];

    if (isExpanded) {
      setExpandedMessages((prev) => ({ ...prev, [key]: null }));
      return;
    }

    const isSent =
      message.side === viewSide ||
      (viewSide === 'provider' && message.side === 'caregiver' && caregiverSpeaksEnglish) ||
      (viewSide === 'patient' && message.side === 'caregiver' && !caregiverSpeaksEnglish);

    const shownText = isSent ? message.original : (message.translated ?? '...');
    if (!shownText || shownText === '...') return;

    const { sourceLang, targetLang } = getSideLanguages(message.side);
    const shownLang = isSent ? sourceLang : targetLang;
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
    if (offlineActive) {
      setStatus('Voice unavailable offline. Use Quick Phrases.');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

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

      const { sourceLang, targetLang, targetVoice, whisperLang } = getSideLanguages(side);

      const extension = getFileExtension(mimeType);
      const formData = new FormData();
      formData.append('file', audioBlob, `audio.${extension}`);
      formData.append('model', 'whisper-1');
      formData.append('language', whisperLang);

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
      utterance.lang = targetVoice;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

    } catch (err) {
      console.error('Process error:', err);
      setStatus('Something went wrong. Please try again.');
    }
  };

  // Offline-aware phrase tap: uses hardcoded translation if offline, API if online
  const handlePhraseTap = async (phrase) => {
    if (offlineActive) {
      // Use hardcoded translation directly
      const translatedText = phrase[selectedLang.code];
      if (!translatedText) return;

      const messageId = Date.now();
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          side: 'provider',
          original: phrase.english,
          translated: translatedText,
          backTranslations: {},
        },
      ]);

      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = selectedLang.voice;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

      setShowPhrases(false);
      return;
    }

    // Online: use API as before
    setTranslatingPhrase(phrase.english);

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
            { role: 'user', content: phrase.english },
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
          original: phrase.english,
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
    const lines = [
      'Verba Session Transcript',
      `Date: ${date} at ${time}`,
      `Languages: English — ${selectedLang.label}`,
      `Specialty: ${selectedSpecialty.label}`,
    ];
    if (caregiverMode) {
      lines.push(`Caregiver mode: on (caregiver speaks ${caregiverSpeaksEnglish ? 'English' : selectedLang.label})`);
    }
    lines.push('', '---', '');

    const body = messages
      .filter((m) => m.translated)
      .map((m) => {
        const speakerLabel =
          m.side === 'provider' ? 'Provider'
          : m.side === 'caregiver' ? 'Caregiver'
          : selectedLang.label;
        const { targetLang } = getSideLanguages(m.side);
        return `[${speakerLabel}] ${m.original}\n[${targetLang}] ${m.translated}`;
      })
      .join('\n\n');

    return lines.join('\n') + body;
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
    setSessionSummary(null);
    setShowSummary(false);
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

        const isSent =
          m.side === viewSide ||
          (viewSide === 'provider' && m.side === 'caregiver' && caregiverSpeaksEnglish) ||
          (viewSide === 'patient' && m.side === 'caregiver' && !caregiverSpeaksEnglish);

        const shownText = isSent ? m.original : (m.translated ?? '...');
        const backText = expandedMessages[key];
        const isExpanded = !!backText;

        return (
          <div
            key={m.id}
            className={`message ${isSent ? 'sent' : 'received'} ${isExpanded ? 'expanded' : ''} ${m.side === 'caregiver' ? 'caregiver-message' : ''}`}
            onClick={() => m.translated && handleBubbleTap(m, viewSide)}
          >
            {m.side === 'caregiver' && (
              <span className="caregiver-tag">Caregiver</span>
            )}
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

      {/* Offline banner */}
      {offlineActive && (
        <div className="offline-banner">
          {isOffline ? '⚠ No connection — ' : '⚠ Offline mode — '}
          Voice unavailable. Use Quick Phrases.
          {!isOffline && (
            <button className="offline-banner-dismiss" onClick={() => setOfflineManual(false)}>
              Go online
            </button>
          )}
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
          className={`speak-btn ${activeSide === 'provider' && isListening ? 'listening' : ''} ${offlineActive ? 'offline-disabled' : ''}`}
          onMouseDown={() => startListening('provider')}
          onMouseUp={stopListening}
          onTouchStart={(e) => { e.preventDefault(); startListening('provider'); }}
          onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
        >
          {offlineActive ? 'Voice unavailable offline' : (activeSide === 'provider' && isListening ? 'Listening...' : 'Hold to Speak')}
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
      <div className={`side patient ${(activeSide === 'patient' || activeSide === 'caregiver') && isListening ? 'active' : ''}`}>

        {caregiverMode && (
          <div className="caregiver-controls">
            <button
              className={`speak-btn caregiver-btn ${activeSide === 'caregiver' && isListening ? 'listening' : ''} ${offlineActive ? 'offline-disabled' : ''}`}
              onMouseDown={() => startListening('caregiver')}
              onMouseUp={stopListening}
              onTouchStart={(e) => { e.preventDefault(); startListening('caregiver'); }}
              onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
            >
              {offlineActive ? 'Voice unavailable offline' : (activeSide === 'caregiver' && isListening ? 'Listening...' : 'Caregiver — Hold to Speak')}
            </button>
            <div className="caregiver-lang-toggle">
              <span className="caregiver-lang-label">Caregiver speaks</span>
              <button
                className={`caregiver-lang-btn ${caregiverSpeaksEnglish ? 'active' : ''}`}
                onClick={() => setCaregiverSpeaksEnglish(true)}
              >
                English
              </button>
              <button
                className={`caregiver-lang-btn ${!caregiverSpeaksEnglish ? 'active' : ''}`}
                onClick={() => setCaregiverSpeaksEnglish(false)}
              >
                {selectedLang.label}
              </button>
            </div>
          </div>
        )}

        <button
          className={`speak-btn ${activeSide === 'patient' && isListening ? 'listening' : ''} ${offlineActive ? 'offline-disabled' : ''}`}
          onMouseDown={() => startListening('patient')}
          onMouseUp={stopListening}
          onTouchStart={(e) => { e.preventDefault(); startListening('patient'); }}
          onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
        >
          {offlineActive ? 'Voice unavailable offline' : (activeSide === 'patient' && isListening ? patientBtn.listening : patientBtn.idle)}
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

            <div className="settings-row">
              <span className="settings-label">Caregiver mode</span>
              <button
                className={`caregiver-toggle ${caregiverMode ? 'on' : ''}`}
                onClick={() => setCaregiverMode((prev) => !prev)}
              >
                {caregiverMode ? 'On' : 'Off'}
              </button>
            </div>

            <div className="settings-row">
              <span className="settings-label">Offline mode</span>
              <button
                className={`caregiver-toggle ${offlineManual ? 'on' : ''}`}
                onClick={() => setOfflineManual((prev) => !prev)}
              >
                {offlineManual ? 'On' : 'Off'}
              </button>
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
                  onClick={() => generateSummary()}
                >
                  Session Summary
                </button>
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
              <span className="phrases-title">
                Quick Phrases
                {offlineActive && <span className="offline-phrases-badge">Offline</span>}
              </span>
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
                  key={phrase.english}
                  className={`phrase-item ${translatingPhrase === phrase.english ? 'loading' : ''}`}
                  onClick={() => handlePhraseTap(phrase)}
                  disabled={translatingPhrase !== null}
                >
                  <span className="phrase-english">{phrase.english}</span>
                  {offlineActive && (
                    <span className="phrase-pretranslated">{phrase[selectedLang.code]}</span>
                  )}
                  {translatingPhrase === phrase.english && (
                    <span className="phrase-pretranslated">Translating...</span>
                  )}
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

      {/* Session summary panel */}
      {showSummary && (
        <div className="phrases-overlay" onClick={() => setShowSummary(false)}>
          <div className="phrases-panel export-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Session Summary</span>
              <button className="phrases-close" onClick={() => setShowSummary(false)}>✕</button>
            </div>
            {summaryLoading ? (
              <p className="export-desc">Generating summary...</p>
            ) : (
              <>
                <p className="summary-text">{sessionSummary}</p>
                <button className="export-action-btn" onClick={handleSummaryCopy}>
                  {summaryCopyConfirmed ? '✓ Copied to clipboard' : 'Copy to clipboard'}
                </button>
                <button
                  className="export-action-btn share"
                  onClick={() => generateSummary(true)}
                >
                  Regenerate
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

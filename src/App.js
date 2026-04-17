import React, { useState, useRef, useEffect, useCallback } from 'react';
import Ably from 'ably';
import './App.css';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const ABLY_API_KEY = process.env.REACT_APP_ABLY_API_KEY;

const LANGUAGES = [
  { label: 'Spanish',    code: 'es',  voice: 'es-ES', whisper: 'es' },
  { label: 'Mandarin',   code: 'zh',  voice: 'zh-CN', whisper: 'zh' },
  { label: 'Cantonese',  code: 'yue', voice: 'zh-HK', whisper: 'yue' },
  { label: 'Portuguese', code: 'pt',  voice: 'pt-BR', whisper: 'pt' },
  { label: 'French',     code: 'fr',  voice: 'fr-FR', whisper: 'fr' },
  { label: 'Arabic',     code: 'ar',  voice: 'ar-SA', whisper: 'ar' },
  { label: 'Vietnamese', code: 'vi',  voice: 'vi-VN', whisper: 'vi' },
  { label: 'Hindi',      code: 'hi',  voice: 'hi-IN', whisper: 'hi' },
  { label: 'Korean',     code: 'ko',  voice: 'ko-KR', whisper: 'ko' },
  { label: 'Russian',    code: 'ru',  voice: 'ru-RU', whisper: 'ru' },
  { label: 'Ukrainian',  code: 'uk',  voice: 'uk-UA', whisper: 'uk' },
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
  vi:  'Bệnh nhân — Tiếng Việt',
  hi:  'रोगी — हिन्दी',
  ko:  '환자 — 한국어',
  ru:  'Пациент — Русский',
  uk:  'Пацієнт — Українська',
};

const PATIENT_BUTTONS = {
  es:  { idle: 'Mantén para hablar',       listening: 'Escuchando...' },
  zh:  { idle: '按住说话',                  listening: '聆听中...' },
  yue: { idle: '按住講嘢',                  listening: '聆聽中...' },
  pt:  { idle: 'Segure para falar',        listening: 'Ouvindo...' },
  fr:  { idle: 'Maintenir pour parler',    listening: 'Écoute...' },
  ar:  { idle: 'اضغط للتحدث',              listening: 'جارٍ الاستماع...' },
  vi:  { idle: 'Giữ để nói',               listening: 'Đang nghe...' },
  hi:  { idle: 'बोलने के लिए दबाएं',        listening: 'सुन रहा है...' },
  ko:  { idle: '눌러서 말하기',              listening: '듣는 중...' },
  ru:  { idle: 'Держите для разговора',    listening: 'Слушаю...' },
  uk:  { idle: 'Утримуйте для розмови',    listening: 'Слухаю...' },
};

const HELP_BUTTON_LABELS = {
  es:  'Necesito ayuda',
  zh:  '我需要帮助',
  yue: '我需要幫助',
  pt:  'Preciso de ajuda',
  fr:  "J'ai besoin d'aide",
  ar:  'أحتاج مساعدة',
  vi:  'Tôi cần giúp đỡ',
  hi:  'मुझे मदद चाहिए',
  ko:  '도움이 필요해요',
  ru:  'Мне нужна помощь',
  uk:  'Мені потрібна допомога',
};

const PATIENT_ONBOARDING = {
  es: {
    title: 'Bienvenido a Verba',
    body: 'Esta aplicación traduce lo que usted y su médico dicen en tiempo real.',
    instruction: 'Mantenga presionado el botón para hablar. Hable con naturalidad.',
    privacy: 'Su conversación es privada y no se almacena.',
    dismiss: 'Entendido',
    repeat: 'Repetir',
  },
  zh: {
    title: '欢迎使用 Verba',
    body: '此应用程序可实时翻译您和医生之间的对话。',
    instruction: '按住按钮说话。请自然地说话。',
    privacy: '您的对话是私密的，不会被存储。',
    dismiss: '我明白了',
    repeat: '重复',
  },
  yue: {
    title: '歡迎使用 Verba',
    body: '此應用程式可即時翻譯您和醫生之間的對話。',
    instruction: '按住按鈕說話。請自然地說話。',
    privacy: '您的對話是私密的，不會被儲存。',
    dismiss: '我明白了',
    repeat: '重複',
  },
  pt: {
    title: 'Bem-vindo ao Verba',
    body: 'Este aplicativo traduz em tempo real o que você e seu médico dizem.',
    instruction: 'Mantenha o botão pressionado para falar. Fale naturalmente.',
    privacy: 'Sua conversa é privada e não é armazenada.',
    dismiss: 'Entendi',
    repeat: 'Repetir',
  },
  fr: {
    title: 'Bienvenue sur Verba',
    body: 'Cette application traduit en temps réel ce que vous et votre médecin dites.',
    instruction: 'Maintenez le bouton appuyé pour parler. Parlez naturellement.',
    privacy: "Votre conversation est privée et n'est pas enregistrée.",
    dismiss: "J'ai compris",
    repeat: 'Répéter',
  },
  ar: {
    title: 'مرحباً بك في Verba',
    body: 'يترجم هذا التطبيق ما تقوله أنت وطبيبك في الوقت الفعلي.',
    instruction: 'اضغط باستمرار على الزر للتحدث. تحدث بشكل طبيعي.',
    privacy: 'محادثتك خاصة ولا يتم تخزينها.',
    dismiss: 'فهمت',
    repeat: 'كرر',
  },
  vi: {
    title: 'Chào mừng đến với Verba',
    body: 'Ứng dụng này dịch theo thời gian thực những gì bạn và bác sĩ nói.',
    instruction: 'Giữ nút để nói. Hãy nói tự nhiên.',
    privacy: 'Cuộc trò chuyện của bạn được bảo mật và không được lưu trữ.',
    dismiss: 'Đã hiểu',
    repeat: 'Lặp lại',
  },
  hi: {
    title: 'Verba में आपका स्वागत है',
    body: 'यह ऐप आप और आपके डॉक्टर की बातों का रियल टाइम में अनुवाद करता है।',
    instruction: 'बोलने के लिए बटन को दबाए रखें। स्वाभाविक रूप से बोलें।',
    privacy: 'आपकी बातचीत निजी है और संग्रहीत नहीं की जाती।',
    dismiss: 'समझ गया',
    repeat: 'दोहराएं',
  },
  ko: {
    title: 'Verba에 오신 것을 환영합니다',
    body: '이 앱은 귀하와 의사의 대화를 실시간으로 번역합니다.',
    instruction: '말하려면 버튼을 누르고 계세요. 자연스럽게 말씀하세요.',
    privacy: '대화 내용은 비공개이며 저장되지 않습니다.',
    dismiss: '확인했습니다',
    repeat: '반복',
  },
  ru: {
    title: 'Добро пожаловать в Verba',
    body: 'Это приложение переводит в реальном времени то, что говорите вы и ваш врач.',
    instruction: 'Удерживайте кнопку, чтобы говорить. Говорите естественно.',
    privacy: 'Ваш разговор конфиденциален и не сохраняется.',
    dismiss: 'Понятно',
    repeat: 'Повторить',
  },
  uk: {
    title: 'Ласкаво просимо до Verba',
    body: 'Цей застосунок перекладає в реальному часі те, що говорите ви та ваш лікар.',
    instruction: 'Утримуйте кнопку, щоб говорити. Говоріть природно.',
    privacy: 'Ваша розмова є конфіденційною і не зберігається.',
    dismiss: 'Зрозуміло',
    repeat: 'Повторити',
  },
};

const PHRASE_CATEGORIES = [
  {
    category: 'Pain',
    phrases: [
      {
        english: 'Where is your pain?',
        es: '¿Dónde le duele?', zh: '您哪里疼？', yue: '你喺邊度痛？', pt: 'Onde é a sua dor?',
        fr: 'Où avez-vous mal?', ar: 'أين يوجد ألمك؟', vi: 'Bạn đau ở đâu?',
        hi: 'आपको दर्द कहाँ है?', ko: '어디가 아프세요?', ru: 'Где у вас боль?', uk: 'Де у вас біль?',
      },
      {
        english: 'Rate your pain 1 to 10.',
        es: 'Califique su dolor del 1 al 10.', zh: '请用1到10分来描述您的疼痛程度。', yue: '請用1至10分評估你嘅痛楚程度。',
        pt: 'Classifique sua dor de 1 a 10.', fr: 'Évaluez votre douleur de 1 à 10.', ar: 'قيّم ألمك من 1 إلى 10.',
        vi: 'Đánh giá cơn đau của bạn từ 1 đến 10.', hi: 'अपने दर्द को 1 से 10 के पैमाने पर बताएं।',
        ko: '통증을 1에서 10으로 평가해 주세요.', ru: 'Оцените боль по шкале от 1 до 10.', uk: 'Оцініть біль за шкалою від 1 до 10.',
      },
      {
        english: 'Is the pain constant or does it come and go?',
        es: '¿El dolor es constante o va y viene?', zh: '疼痛是持续的还是时好时坏？', yue: '痛楚係持續定係時好時壞？',
        pt: 'A dor é constante ou vai e vem?', fr: 'La douleur est-elle constante ou intermittente?',
        ar: 'هل الألم مستمر أم يأتي ويذهب؟', vi: 'Cơn đau có liên tục hay đến rồi đi?',
        hi: 'क्या दर्द लगातार है या आता-जाता है?', ko: '통증이 지속적인가요, 아니면 왔다 갔다 하나요?',
        ru: 'Боль постоянная или приходит и уходит?', uk: 'Біль постійний чи приходить і відходить?',
      },
      {
        english: 'Does the pain radiate anywhere?',
        es: '¿El dolor se irradia a algún lugar?', zh: '疼痛是否向其他部位放射？', yue: '痛楚有冇擴散到其他地方？',
        pt: 'A dor irradia para algum lugar?', fr: 'La douleur irradie-t-elle quelque part?',
        ar: 'هل ينتشر الألم إلى مكان آخر؟', vi: 'Cơn đau có lan ra nơi nào không?',
        hi: 'क्या दर्द कहीं और फैलता है?', ko: '통증이 다른 곳으로 퍼지나요?',
        ru: 'Боль отдаёт куда-нибудь?', uk: 'Біль віддає кудись?',
      },
    ],
  },
  {
    category: 'Assessment',
    phrases: [
      {
        english: 'Are you having trouble breathing?',
        es: '¿Tiene dificultad para respirar?', zh: '您呼吸困难吗？', yue: '你有冇呼吸困難？',
        pt: 'Você está tendo dificuldade para respirar?', fr: 'Avez-vous des difficultés à respirer?',
        ar: 'هل تعاني من صعوبة في التنفس؟', vi: 'Bạn có khó thở không?',
        hi: 'क्या आपको सांस लेने में तकलीफ हो रही है?', ko: '숨쉬기가 힘드세요?',
        ru: 'У вас есть затруднение дыхания?', uk: 'У вас є труднощі з диханням?',
      },
      {
        english: 'Do you feel dizzy or nauseous?',
        es: '¿Se siente mareado o con náuseas?', zh: '您感到头晕或恶心吗？', yue: '你有冇頭暈或作嘔？',
        pt: 'Você se sente tonto ou com náusea?', fr: 'Vous sentez-vous étourdi ou nauséeux?',
        ar: 'هل تشعر بالدوار أو الغثيان؟', vi: 'Bạn có cảm thấy chóng mặt hoặc buồn nôn không?',
        hi: 'क्या आपको चक्कर आ रहे हैं या मतली हो रही है?', ko: '어지럽거나 메스꺼움을 느끼시나요?',
        ru: 'Вы чувствуете головокружение или тошноту?', uk: 'Ви відчуваєте запаморочення або нудоту?',
      },
      {
        english: 'Do you have a fever?',
        es: '¿Tiene fiebre?', zh: '您发烧了吗？', yue: '你有冇發燒？', pt: 'Você tem febre?',
        fr: 'Avez-vous de la fièvre?', ar: 'هل لديك حمى؟', vi: 'Bạn có bị sốt không?',
        hi: 'क्या आपको बुखार है?', ko: '열이 있으세요?', ru: 'У вас есть температура?', uk: 'У вас є температура?',
      },
      {
        english: 'How long have you had this symptom?',
        es: '¿Cuánto tiempo lleva con este síntoma?', zh: '这个症状持续多久了？', yue: '呢個症狀持續幾耐了？',
        pt: 'Há quanto tempo você tem esse sintoma?', fr: 'Depuis combien de temps avez-vous ce symptôme?',
        ar: 'منذ متى وأنت تعاني من هذا العَرَض؟', vi: 'Bạn có triệu chứng này bao lâu rồi?',
        hi: 'यह लक्षण आपको कितने समय से है?', ko: '이 증상이 얼마나 됐나요?',
        ru: 'Как давно у вас этот симптом?', uk: 'Як давно у вас цей симптом?',
      },
    ],
  },
  {
    category: 'History',
    phrases: [
      {
        english: 'Do you have any allergies?',
        es: '¿Tiene alguna alergia?', zh: '您有过敏症吗？', yue: '你有冇過敏？', pt: 'Você tem alguma alergia?',
        fr: 'Avez-vous des allergies?', ar: 'هل لديك أي حساسية؟', vi: 'Bạn có bị dị ứng gì không?',
        hi: 'क्या आपको कोई एलर्जी है?', ko: '알레르기가 있으세요?',
        ru: 'Есть ли у вас аллергия?', uk: 'Чи є у вас алергія?',
      },
      {
        english: 'What medications are you currently taking?',
        es: '¿Qué medicamentos está tomando actualmente?', zh: '您目前在服用哪些药物？', yue: '你而家食緊咩藥？',
        pt: 'Quais medicamentos você está tomando atualmente?', fr: 'Quels médicaments prenez-vous actuellement?',
        ar: 'ما الأدوية التي تتناولها حالياً؟', vi: 'Bạn đang dùng thuốc gì?',
        hi: 'आप अभी कौन सी दवाएं ले रहे हैं?', ko: '현재 복용 중인 약이 있으세요?',
        ru: 'Какие лекарства вы сейчас принимаете?', uk: 'Які ліки ви зараз приймаєте?',
      },
      {
        english: 'Do you have any chronic conditions?',
        es: '¿Tiene alguna enfermedad crónica?', zh: '您有慢性疾病吗？', yue: '你有冇慢性病？',
        pt: 'Você tem alguma condição crônica?', fr: 'Avez-vous des maladies chroniques?',
        ar: 'هل لديك أي أمراض مزمنة؟', vi: 'Bạn có bệnh mãn tính nào không?',
        hi: 'क्या आपको कोई पुरानी बीमारी है?', ko: '만성 질환이 있으세요?',
        ru: 'Есть ли у вас хронические заболевания?', uk: 'Чи є у вас хронічні захворювання?',
      },
    ],
  },
  {
    category: 'Consent',
    phrases: [
      {
        english: 'I need to examine you.',
        es: 'Necesito examinarlo/a.', zh: '我需要给您做检查。', yue: '我需要為你進行檢查。',
        pt: 'Preciso examiná-lo/a.', fr: 'Je dois vous examiner.', ar: 'أحتاج إلى فحصك.',
        vi: 'Tôi cần khám cho bạn.', hi: 'मुझे आपकी जांच करनी है।', ko: '진찰을 해야 합니다.',
        ru: 'Мне нужно вас осмотреть.', uk: 'Мені потрібно вас оглянути.',
      },
      {
        english: 'I am going to give you medication.',
        es: 'Le voy a administrar medicamento.', zh: '我要给您用药。', yue: '我將會為你用藥。',
        pt: 'Vou lhe administrar medicamento.', fr: 'Je vais vous administrer un médicament.',
        ar: 'سأعطيك دواءً.', vi: 'Tôi sẽ cho bạn dùng thuốc.', hi: 'मैं आपको दवा दूंगा।',
        ko: '약을 드릴 것입니다.', ru: 'Я дам вам лекарство.', uk: 'Я дам вам ліки.',
      },
      {
        english: 'Do you understand?',
        es: '¿Entiende?', zh: '您明白吗？', yue: '你明白嗎？', pt: 'Você entende?',
        fr: 'Comprenez-vous?', ar: 'هل تفهم؟', vi: 'Bạn có hiểu không?',
        hi: 'क्या आप समझे?', ko: '이해하셨나요?', ru: 'Вы понимаете?', uk: 'Ви розумієте?',
      },
      {
        english: 'Please sign here.',
        es: 'Por favor firme aquí.', zh: '请在这里签名。', yue: '請喺呢度簽名。',
        pt: 'Por favor, assine aqui.', fr: 'Veuillez signer ici.', ar: 'من فضلك وقّع هنا.',
        vi: 'Vui lòng ký vào đây.', hi: 'कृपया यहाँ हस्ताक्षर करें।', ko: '여기에 서명해 주세요.',
        ru: 'Пожалуйста, подпишите здесь.', uk: 'Будь ласка, підпишіть тут.',
      },
    ],
  },
];

const PAIN_LEVELS = [
  { n: 0,  face: '😊', label: 'No pain',        color: '#2ecc71' },
  { n: 1,  face: '🙂', label: 'Very mild',      color: '#52d68a' },
  { n: 2,  face: '😐', label: 'Mild',           color: '#a8e063' },
  { n: 3,  face: '😕', label: 'Moderate',       color: '#f7dc6f' },
  { n: 4,  face: '😟', label: 'Uncomfortable',  color: '#f0a500' },
  { n: 5,  face: '😣', label: 'Distressing',    color: '#e67e22' },
  { n: 6,  face: '😖', label: 'Very bad',       color: '#e74c3c' },
  { n: 7,  face: '😫', label: 'Intense',        color: '#c0392b' },
  { n: 8,  face: '😭', label: 'Severe',         color: '#a93226' },
  { n: 9,  face: '😱', label: 'Very severe',    color: '#8e1a10' },
  { n: 10, face: '🤯', label: 'Worst possible', color: '#6c0a0a' },
];

const VITAL_SIGNS = [
  { key: 'bp',   labelEn: 'Blood Pressure', unit: 'mmHg',  placeholder: 'e.g. 120/80',
    labels: { es: 'Presión arterial', zh: '血压', yue: '血壓', pt: 'Pressão arterial', fr: 'Pression artérielle', ar: 'ضغط الدم', vi: 'Huyết áp', hi: 'रक्तचाप', ko: '혈압', ru: 'Артериальное давление', uk: 'Артеріальний тиск' } },
  { key: 'hr',   labelEn: 'Heart Rate',     unit: 'bpm',   placeholder: 'e.g. 72',
    labels: { es: 'Frecuencia cardíaca', zh: '心率', yue: '心率', pt: 'Frequência cardíaca', fr: 'Fréquence cardiaque', ar: 'معدل ضربات القلب', vi: 'Nhịp tim', hi: 'हृदय गति', ko: '심박수', ru: 'Частота пульса', uk: 'Частота пульсу' } },
  { key: 'temp', labelEn: 'Temperature',    unit: '',      placeholder: 'e.g. 98.6°F',
    labels: { es: 'Temperatura', zh: '体温', yue: '體溫', pt: 'Temperatura', fr: 'Température', ar: 'درجة الحرارة', vi: 'Nhiệt độ', hi: 'तापमान', ko: '체온', ru: 'Температура', uk: 'Температура' } },
  { key: 'o2',   labelEn: 'Oxygen Level',   unit: '%',     placeholder: 'e.g. 98',
    labels: { es: 'Nivel de oxígeno', zh: '血氧水平', yue: '血氧水平', pt: 'Nível de oxigênio', fr: "Niveau d'oxygène", ar: 'مستوى الأكسجين', vi: 'Nồng độ oxy', hi: 'ऑक्सीजन स्तर', ko: '산소 포화도', ru: 'Уровень кислорода', uk: 'Рівень кисню' } },
];

const generateSessionCode = () => {
  const words = ['HAWK', 'BLUE', 'PINE', 'SALT', 'GOLD', 'IRON', 'LAKE', 'MOON', 'RAIN', 'WIND'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}-${num}`;
};

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
  const [showMedInstructions, setShowMedInstructions] = useState(false);
  const [showMedPatient, setShowMedPatient] = useState(false);
  const [medInstructions, setMedInstructions] = useState([]);
  const [medInputText, setMedInputText] = useState('');
  const [medInputLoading, setMedInputLoading] = useState(false);
  const [medIsRecording, setMedIsRecording] = useState(false);
  const [medIsSpeaking, setMedIsSpeaking] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionElapsed, setSessionElapsed] = useState('0:00');
  const [showPainScale, setShowPainScale] = useState(false);
  const [showVitalSigns, setShowVitalSigns] = useState(false);
  const [showVitalPatient, setShowVitalPatient] = useState(false);
  const [vitalValues, setVitalValues] = useState({ bp: '', hr: '', temp: '', o2: '' });
  const [vitalSpeaking, setVitalSpeaking] = useState(false);
  const [panicAlert, setPanicAlert] = useState(false);

  // Two-device mode
  const [twoDeviceMode, setTwoDeviceMode] = useState(false);
  const [twoDeviceRole, setTwoDeviceRole] = useState(null);
  const [twoDeviceCode, setTwoDeviceCode] = useState('');
  const [twoDeviceJoinCode, setTwoDeviceJoinCode] = useState('');
  const [twoDeviceConnected, setTwoDeviceConnected] = useState(false);
  const [showTwoDeviceSetup, setShowTwoDeviceSetup] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [twoDeviceStatus, setTwoDeviceStatus] = useState('');

  const ablyRef = useRef(null);
  const ablyChannelRef = useRef(null);
  const medRecorderRef = useRef(null);
  const medChunksRef = useRef([]);
  const medStreamRef = useRef(null);
  const providerRef = useRef(null);
  const patientRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const swipeStartX = useRef({});

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

  const offlineActive = isOffline || offlineManual;

  useEffect(() => {
    if (providerRef.current) providerRef.current.scrollTop = providerRef.current.scrollHeight;
    if (patientRef.current) patientRef.current.scrollTop = patientRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
      } catch (err) { console.log('Wake lock not available:', err); }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock) wakeLock.release();
    };
  }, []);

  useEffect(() => {
    if (messages.length === 1 && !sessionStartTime) {
      setSessionStartTime(Date.now());
    }
  }, [messages, sessionStartTime]);

  useEffect(() => {
    if (!sessionStartTime) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setSessionElapsed(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  useEffect(() => {
    return () => {
      if (ablyRef.current) ablyRef.current.close();
    };
  }, []);

  const disconnectAbly = useCallback(() => {
    if (ablyChannelRef.current) {
      ablyChannelRef.current.unsubscribe();
      ablyChannelRef.current = null;
    }
    if (ablyRef.current) {
      ablyRef.current.close();
      ablyRef.current = null;
    }
    setTwoDeviceConnected(false);
    setTwoDeviceMode(false);
    setTwoDeviceRole(null);
    setTwoDeviceCode('');
    setTwoDeviceStatus('');
  }, []);

  const connectAbly = useCallback((code, role) => {
    if (ablyRef.current) {
      ablyRef.current.close();
      ablyRef.current = null;
      ablyChannelRef.current = null;
    }

    const client = new Ably.Realtime({ key: ABLY_API_KEY });
    ablyRef.current = client;

    client.connection.on('connected', () => {
      setTwoDeviceStatus('Connected');
      setTwoDeviceConnected(true);
    });

    client.connection.on('disconnected', () => {
      setTwoDeviceStatus('Disconnected');
      setTwoDeviceConnected(false);
    });

    client.connection.on('failed', () => {
      setTwoDeviceStatus('Connection failed');
      setTwoDeviceConnected(false);
    });

    const channel = client.channels.get(`verba-${code}`);
    ablyChannelRef.current = channel;

    channel.subscribe('translation', (msg) => {
      const { fromRole, original, translated, side, messageId } = msg.data;
      if (fromRole === role) return;

      setMessages((prev) => {
        if (prev.find(m => m.id === messageId)) return prev;
        return [...prev, { id: messageId, side, original, translated, backTranslations: {}, dismissed: false }];
      });

      const speakText = role === 'provider' ? original : translated;
      const speakLang = role === 'provider' ? 'en-US' : selectedLang.voice;
      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.lang = speakLang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    });

    channel.subscribe('end-session', () => {
      disconnectAbly();
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, disconnectAbly]);

  const handleStartTwoDeviceAsProvider = () => {
    const code = generateSessionCode();
    setTwoDeviceCode(code);
    setTwoDeviceRole('provider');
    setTwoDeviceMode(true);
    connectAbly(code, 'provider');
    setShowTwoDeviceSetup(false);
    setShowSettings(false);
  };

  const handleJoinTwoDeviceAsPatient = () => {
    const code = twoDeviceJoinCode.trim().toUpperCase();
    if (!code) return;
    setTwoDeviceCode(code);
    setTwoDeviceRole('patient');
    setTwoDeviceMode(true);
    connectAbly(code, 'patient');
    setShowTwoDeviceSetup(false);
    setShowSettings(false);
  };

  const handleEndTwoDeviceSession = () => {
    if (ablyChannelRef.current) {
      ablyChannelRef.current.publish('end-session', {});
    }
    disconnectAbly();
  };

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

  const speakMedInstructions = useCallback((instructions) => {
    window.speechSynthesis.cancel();
    if (!instructions || instructions.length === 0) return;
    const texts = instructions.map(i => i.translated).filter(Boolean);
    if (texts.length === 0) return;
    setMedIsSpeaking(true);
    let index = 0;
    const speakNext = () => {
      if (index >= texts.length) { setMedIsSpeaking(false); return; }
      const utterance = new SpeechSynthesisUtterance(texts[index]);
      utterance.lang = selectedLang.voice;
      utterance.rate = 0.85;
      utterance.onend = () => { index++; speakNext(); };
      utterance.onerror = () => setMedIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  }, [selectedLang]);

  useEffect(() => {
    if (showMedPatient && medInstructions.length > 0) {
      setTimeout(() => speakMedInstructions(medInstructions), 400);
    } else if (!showMedPatient) {
      window.speechSynthesis.cancel();
      setMedIsSpeaking(false);
    }
  }, [showMedPatient, speakMedInstructions, medInstructions]);

  const getSupportedMimeType = () => {
    const types = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
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
    if (selectedSpecialty.prompt) return `${base}\n\nSpecialty context:\n${selectedSpecialty.prompt}`;
    return base;
  };

  const getSideLanguages = (side) => {
    if (side === 'provider' || (side === 'caregiver' && caregiverSpeaksEnglish)) {
      return { sourceLang: 'English', targetLang: selectedLang.label, targetVoice: selectedLang.voice, whisperLang: 'en' };
    }
    return { sourceLang: selectedLang.label, targetLang: 'English', targetVoice: 'en-US', whisperLang: selectedLang.whisper };
  };

  const translateMedInstruction = async (text) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a certified medical interpreter. Translate the following discharge or medication instruction from English to ${selectedLang.label}. Use clear, plain language the patient can understand. Preserve medication names, dosages, and timing exactly. Return only the translated text, nothing else.`,
          },
          { role: 'user', content: text },
        ],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  };

  const handleMedAddText = async () => {
    const text = medInputText.trim();
    if (!text) return;
    setMedInputLoading(true);
    try {
      const translated = await translateMedInstruction(text);
      if (translated) { setMedInstructions((prev) => [...prev, { english: text, translated }]); setMedInputText(''); }
    } catch (err) { console.error('Med instruction translation error:', err); }
    finally { setMedInputLoading(false); }
  };

  const handleMedStartRecording = async () => {
    if (medIsRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      medStreamRef.current = stream;
      setMedIsRecording(true);
      medChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      medRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) medChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        if (medStreamRef.current) { medStreamRef.current.getTracks().forEach(t => t.stop()); medStreamRef.current = null; }
        setMedInputLoading(true);
        const mimeUsed = recorder.mimeType || mimeType || 'audio/mp4';
        const ext = mimeUsed.includes('webm') ? 'webm' : mimeUsed.includes('ogg') ? 'ogg' : 'mp4';
        const blob = new Blob(medChunksRef.current, { type: mimeUsed });
        try {
          const formData = new FormData();
          formData.append('file', blob, `audio.${ext}`);
          formData.append('model', 'whisper-1');
          formData.append('language', 'en');
          const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: formData,
          });
          const whisperData = await whisperRes.json();
          const transcribed = whisperData.text?.trim();
          if (transcribed) {
            const translated = await translateMedInstruction(transcribed);
            if (translated) setMedInstructions((prev) => [...prev, { english: transcribed, translated }]);
          }
        } catch (err) { console.error('Med voice error:', err); }
        finally { setMedInputLoading(false); }
      };
      recorder.start(250);
    } catch (err) { console.error('Med mic error:', err); setMedIsRecording(false); }
  };

  const handleMedStopRecording = () => {
    if (medRecorderRef.current && medIsRecording) { medRecorderRef.current.stop(); setMedIsRecording(false); }
  };

  const handleMedRemove = (index) => setMedInstructions((prev) => prev.filter((_, i) => i !== index));

  const generateSummary = async (forceRegenerate = false) => {
    if (sessionSummary && !forceRegenerate) { setShowSettings(false); setShowSummary(true); return; }
    setShowSettings(false); setShowSummary(true); setSummaryLoading(true); setSessionSummary(null);
    const transcriptLines = messages.filter((m) => m.translated && !m.dismissed).map((m) => {
      const speakerLabel = m.side === 'provider' ? 'Provider' : m.side === 'caregiver' ? 'Caregiver' : 'Patient';
      return `${speakerLabel}: ${m.original}\n→ (translated): ${m.translated}`;
    }).join('\n\n');
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
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
            { role: 'user', content: `Specialty: ${selectedSpecialty.label}\nLanguages: English — ${selectedLang.label}\n\nTranscript:\n${transcriptLines}` },
          ],
        }),
      });
      const data = await res.json();
      setSessionSummary(data.choices?.[0]?.message?.content?.trim() || 'Could not generate summary. Please try again.');
    } catch (err) { console.error('Summary error:', err); setSessionSummary('Something went wrong. Please try again.'); }
    finally { setSummaryLoading(false); }
  };

  const handleSummaryCopy = async () => {
    if (!sessionSummary) return;
    try { await navigator.clipboard.writeText(sessionSummary); setSummaryCopyConfirmed(true); setTimeout(() => setSummaryCopyConfirmed(false), 2000); }
    catch (err) { console.error('Copy failed:', err); }
  };

  const handleBubbleTap = async (message, viewSide) => {
    const key = `${message.id}-${viewSide}`;
    const isExpanded = expandedMessages[key];
    if (isExpanded) { setExpandedMessages((prev) => ({ ...prev, [key]: null })); return; }
    const isSent =
      message.side === viewSide ||
      (viewSide === 'provider' && message.side === 'caregiver' && caregiverSpeaksEnglish) ||
      (viewSide === 'patient' && message.side === 'caregiver' && !caregiverSpeaksEnglish);
    const shownText = isSent ? message.original : (message.translated ?? '...');
    if (!shownText || shownText === '...') return;
    const { sourceLang, targetLang } = getSideLanguages(message.side);
    const shownLang = isSent ? sourceLang : targetLang;
    const backLang = shownLang === 'English' ? selectedLang.label : 'English';
    if (message.backTranslations?.[key]) { setExpandedMessages((prev) => ({ ...prev, [key]: message.backTranslations[key] })); return; }
    setExpandedMessages((prev) => ({ ...prev, [key]: 'loading' }));
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: `You are a certified medical interpreter. Translate from ${shownLang} to ${backLang}. Return only the translated text, nothing else.` },
            { role: 'user', content: shownText },
          ],
        }),
      });
      const data = await res.json();
      const backText = data.choices?.[0]?.message?.content?.trim();
      if (backText) {
        setMessages((prev) => prev.map((m) => m.id === message.id ? { ...m, backTranslations: { ...m.backTranslations, [key]: backText } } : m));
        setExpandedMessages((prev) => ({ ...prev, [key]: backText }));
      } else { setExpandedMessages((prev) => ({ ...prev, [key]: null })); }
    } catch (err) { console.error('Back-translation error:', err); setExpandedMessages((prev) => ({ ...prev, [key]: null })); }
  };

  const handleSwipeStart = (e, messageId) => {
    const touch = e.touches?.[0] || e;
    swipeStartX.current[messageId] = touch.clientX;
  };

  const handleSwipeEnd = (e, messageId) => {
    const touch = e.changedTouches?.[0] || e;
    const startX = swipeStartX.current[messageId];
    if (startX === undefined) return;
    const delta = touch.clientX - startX;
    if (Math.abs(delta) > 60) {
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, dismissed: true } : m));
    }
    delete swipeStartX.current[messageId];
  };

  const startListening = async (side) => {
    if (isListening) return;
    if (offlineActive) { setStatus('Voice unavailable offline. Use Quick Phrases.'); setTimeout(() => setStatus(''), 3000); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
      streamRef.current = stream;
      if (navigator.vibrate) navigator.vibrate(30);
      setIsListening(true); setActiveSide(side); setStatus('Listening...'); audioChunksRef.current = [];
      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        setStatus('Translating...');
        const mimeUsed = mediaRecorder.mimeType || mimeType || 'audio/mp4';
        await processAudio(new Blob(audioChunksRef.current, { type: mimeUsed }), side, mimeUsed);
      };
      mediaRecorder.start(250);
    } catch (err) {
      console.error('Mic error:', err);
      setStatus('Microphone access denied. Please allow microphone in Safari settings.');
      setIsListening(false); setActiveSide(null);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      if (navigator.vibrate) navigator.vibrate([20, 50, 20]);
      try { mediaRecorderRef.current.stop(); } catch (e) { console.error('Stop error:', e); }
      setIsListening(false); setActiveSide(null);
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
      if (audioBlob.size < 500) { setStatus('Recording too short. Hold longer and speak clearly.'); return; }
      const { sourceLang, targetLang, targetVoice, whisperLang } = getSideLanguages(side);
      const extension = getFileExtension(mimeType);
      const formData = new FormData();
      formData.append('file', audioBlob, `audio.${extension}`);
      formData.append('model', 'whisper-1');
      formData.append('language', whisperLang);
      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: formData,
      });
      if (!whisperRes.ok) { setStatus('Transcription failed. Please try again.'); return; }
      const originalText = (await whisperRes.json()).text?.trim();
      if (!originalText) { setStatus('No speech detected. Hold longer and speak clearly.'); return; }
      const messageId = Date.now();
      setMessages((prev) => [...prev, { id: messageId, side, original: originalText, translated: null, backTranslations: {}, dismissed: false }]);
      setStatus('');
      const translateRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: buildSystemPrompt(sourceLang, targetLang) }, { role: 'user', content: originalText }] }),
      });
      if (!translateRes.ok) { setStatus('Translation failed. Please try again.'); return; }
      const translatedText = (await translateRes.json()).choices?.[0]?.message?.content?.trim();
      if (!translatedText) { setStatus('Translation failed. Try again.'); return; }
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, translated: translatedText } : m));

      if (twoDeviceMode && ablyChannelRef.current && twoDeviceConnected) {
        ablyChannelRef.current.publish('translation', {
          fromRole: twoDeviceRole, messageId, side,
          original: originalText, translated: translatedText,
        });
      }

      if (!twoDeviceMode) {
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = targetVoice; utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } else {
        const speakText = twoDeviceRole === 'provider' ? translatedText : originalText;
        const speakLang = twoDeviceRole === 'provider' ? selectedLang.voice : 'en-US';
        const utterance = new SpeechSynthesisUtterance(speakText);
        utterance.lang = speakLang; utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) { console.error('Process error:', err); setStatus('Something went wrong. Please try again.'); }
  };

  const handlePhraseTap = async (phrase) => {
    if (offlineActive) {
      const translatedText = phrase[selectedLang.code];
      if (!translatedText) return;
      const messageId = Date.now();
      setMessages((prev) => [...prev, { id: messageId, side: 'provider', original: phrase.english, translated: translatedText, backTranslations: {}, dismissed: false }]);
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = selectedLang.voice; utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      setShowPhrases(false); return;
    }
    setTranslatingPhrase(phrase.english);
    try {
      const translateRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: buildSystemPrompt('English', selectedLang.label) }, { role: 'user', content: phrase.english }] }),
      });
      const translatedText = (await translateRes.json()).choices?.[0]?.message?.content?.trim();
      if (!translatedText) return;
      const messageId = Date.now();
      setMessages((prev) => [...prev, { id: messageId, side: 'provider', original: phrase.english, translated: translatedText, backTranslations: {}, dismissed: false }]);
      if (twoDeviceMode && ablyChannelRef.current && twoDeviceConnected) {
        ablyChannelRef.current.publish('translation', {
          fromRole: 'provider', messageId, side: 'provider',
          original: phrase.english, translated: translatedText,
        });
      }
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = selectedLang.voice; utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      setShowPhrases(false);
    } catch (err) { console.error('Phrase translation error:', err); }
    finally { setTranslatingPhrase(null); }
  };

  const handlePanicButton = () => {
    // Vibrate: long pulse
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    // Play alert tone via Web Audio API
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playBeep = (startTime, freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.6, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      };
      playBeep(ctx.currentTime, 880);
      playBeep(ctx.currentTime + 0.45, 880);
      playBeep(ctx.currentTime + 0.9, 1100);
    } catch (e) { console.log('Audio context error:', e); }
    // Flash screen and show alert
    setPanicAlert(true);
  };

  const handlePanicDismiss = () => {
    setPanicAlert(false);
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handlePainLevelTap = (n) => {
    const spoken = `The patient reports a pain level of ${n} out of 10.`;
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
    setShowPainScale(false);
  };

  const handleShowVitalPatient = () => {
    const filled = VITAL_SIGNS.filter(v => vitalValues[v.key].trim());
    if (filled.length === 0) return;
    setShowVitalSigns(false);
    setShowVitalPatient(true);
    setTimeout(() => speakVitals(filled), 400);
  };

  const speakVitals = (filled) => {
    window.speechSynthesis.cancel();
    setVitalSpeaking(true);
    const utterances = [];
    filled.forEach(v => {
      const patientLabel = v.labels[selectedLang.code] || v.labelEn;
      const val = vitalValues[v.key].trim();
      const unit = v.unit ? ` ${v.unit}` : '';
      utterances.push({ text: `${patientLabel}: ${val}${unit}`, lang: selectedLang.voice });
      utterances.push({ text: `${v.labelEn}: ${val}${unit}`, lang: 'en-US' });
    });
    let index = 0;
    const speakNext = () => {
      if (index >= utterances.length) { setVitalSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(utterances[index].text);
      u.lang = utterances[index].lang;
      u.rate = 0.85;
      u.onend = () => { index++; speakNext(); };
      u.onerror = () => setVitalSpeaking(false);
      window.speechSynthesis.speak(u);
    };
    speakNext();
  };

  const buildTranscript = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const lines = ['Verba Session Transcript', `Date: ${date} at ${time}`, `Languages: English — ${selectedLang.label}`, `Specialty: ${selectedSpecialty.label}`];
    if (caregiverMode) lines.push(`Caregiver mode: on (caregiver speaks ${caregiverSpeaksEnglish ? 'English' : selectedLang.label})`);
    if (twoDeviceMode) lines.push(`Two-device mode: on (session code: ${twoDeviceCode})`);
    if (sessionStartTime) lines.push(`Session duration: ${sessionElapsed}`);
    lines.push('', '---', '');
    const body = messages.filter((m) => m.translated).map((m) => {
      const speakerLabel = m.side === 'provider' ? 'Provider' : m.side === 'caregiver' ? 'Caregiver' : selectedLang.label;
      const { targetLang } = getSideLanguages(m.side);
      const dismissedTag = m.dismissed ? ' [DISMISSED]' : '';
      return `[${speakerLabel}]${dismissedTag} ${m.original}\n[${targetLang}]${dismissedTag} ${m.translated}`;
    }).join('\n\n');
    return lines.join('\n') + body;
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(buildTranscript()); setCopyConfirmed(true); setTimeout(() => setCopyConfirmed(false), 2000); }
    catch (err) { console.error('Copy failed:', err); }
  };

  const handleShare = async () => {
    try { if (navigator.share) await navigator.share({ title: 'Verba Session Transcript', text: buildTranscript() }); }
    catch (err) { console.error('Share failed:', err); }
  };

  const clearSession = () => {
    setMessages([]); setStatus(''); setShowExport(false); setExpandedMessages({});
    setShowSettings(false); setSessionSummary(null); setShowSummary(false);
    setSessionStartTime(null); setSessionElapsed('0:00');
  };

  const handleLangChange = (e) => {
    const lang = LANGUAGES.find(l => l.code === e.target.value);
    if (lang) { setSelectedLang(lang); clearSession(); }
  };

  const handleSpecialtyChange = (e) => {
    const specialty = SPECIALTIES.find(s => s.code === e.target.value);
    if (specialty) { setSelectedSpecialty(specialty); clearSession(); }
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
            className={`message ${isSent ? 'sent' : 'received'} ${isExpanded ? 'expanded' : ''} ${m.side === 'caregiver' ? 'caregiver-message' : ''} ${m.dismissed ? 'dismissed' : ''}`}
            onClick={() => !m.dismissed && m.translated && handleBubbleTap(m, viewSide)}
            onTouchStart={(e) => handleSwipeStart(e, m.id)}
            onTouchEnd={(e) => handleSwipeEnd(e, m.id)}
          >
            {m.side === 'caregiver' && <span className="caregiver-tag">Caregiver</span>}
            {m.dismissed && <span className="dismissed-tag">Dismissed</span>}
            <span className="original">{shownText}</span>
            {isExpanded && !m.dismissed && <span className="back-translation">{backText === 'loading' ? 'Verifying...' : `↩ ${backText}`}</span>}
          </div>
        );
      })}
    </div>
  );

  // ── Two-device mode single-side layout ──
  if (twoDeviceMode && twoDeviceRole) {
    const isProvider = twoDeviceRole === 'provider';
    return (
      <div className="app">
        {!audioUnlocked && (
          <div className="splash-overlay">
            <div className="splash-content">
              <div className="splash-logo">
                <span className="splash-logo-icon">🌐</span>
                <h1 className="splash-logo-name">Verba</h1>
              </div>
              <p className="splash-tagline">Real-time voice translation<br />for clinical care</p>
              <button className="splash-btn" onClick={() => {
                const utterance = new SpeechSynthesisUtterance(' ');
                utterance.volume = 0;
                window.speechSynthesis.speak(utterance);
                setAudioUnlocked(true);
              }}>Begin Session</button>
            </div>
          </div>
        )}

        <div className="two-device-bar">
          <span className="two-device-code">
            {twoDeviceConnected ? '🟢' : '🔴'} {twoDeviceCode}
          </span>
          <span className="two-device-role">{isProvider ? 'Provider' : selectedLang.label}</span>
          <button className="two-device-end" onClick={handleEndTwoDeviceSession}>End</button>
        </div>

        <div
          className={`side ${isProvider ? 'provider' : 'patient'} two-device-full ${activeSide && isListening ? 'active' : ''}`}
          style={{ flex: 1, transform: 'none' }}
        >
          <div className="side-label">
            {isProvider ? 'Healthcare Provider — English' : patientLabel}
            {isProvider && selectedSpecialty.code !== 'general' && <span className="specialty-badge">{selectedSpecialty.label}</span>}
          </div>
          {renderMessages(twoDeviceRole, isProvider ? providerRef : patientRef)}
          <button
            className={`speak-btn ${activeSide && isListening ? 'listening' : ''}`}
            onMouseDown={() => startListening(twoDeviceRole)}
            onMouseUp={stopListening}
            onTouchStart={(e) => { e.preventDefault(); startListening(twoDeviceRole); }}
            onTouchEnd={(e) => { e.preventDefault(); stopListening(); }}
          >
            {activeSide && isListening
              ? (isProvider ? 'Listening...' : patientBtn.listening)
              : (isProvider ? 'Hold to Speak' : patientBtn.idle)}
          </button>
        </div>

        {status && <div className="two-device-status">{status}</div>}
      </div>
    );
  }

  // ── Standard single-device layout ──
  return (
    <div className="app">

      {!audioUnlocked && (
        <div className="splash-overlay">
          <div className="splash-content">
            <div className="splash-logo">
              <span className="splash-logo-icon">🌐</span>
              <h1 className="splash-logo-name">Verba</h1>
            </div>
            <p className="splash-tagline">Real-time voice translation<br />for clinical care</p>
            <div className="splash-langs">
              <span>ES</span><span>中</span><span>PT</span><span>FR</span>
              <span>AR</span><span>VI</span><span>HI</span><span>KO</span>
              <span>RU</span><span>UK</span><span>粵</span>
            </div>
            <button className="splash-btn" onClick={() => {
              const utterance = new SpeechSynthesisUtterance(' ');
              utterance.volume = 0;
              window.speechSynthesis.speak(utterance);
              setAudioUnlocked(true);
            }}>Begin Session</button>
            <p className="splash-privacy">Conversations are private and never stored</p>
          </div>
        </div>
      )}

      {offlineActive && (
        <div className="offline-banner" onClick={() => setShowPhrases(true)} style={{ cursor: 'pointer' }}>
          {isOffline ? '⚠ No connection — ' : '⚠ Offline mode — '}
          Voice unavailable. <span style={{ textDecoration: 'underline' }}>Open Quick Phrases</span>
          {!isOffline && (
            <button className="offline-banner-dismiss" onClick={(e) => { e.stopPropagation(); setOfflineManual(false); }}>Go online</button>
          )}
        </div>
      )}

      <div className={`side provider ${activeSide === 'provider' && isListening ? 'active' : ''}`}>
        <div className="side-label">
          Healthcare Provider — English
          {selectedSpecialty.code !== 'general' && <span className="specialty-badge">{selectedSpecialty.label}</span>}
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

      <div className="divider">
        <span className="app-name">Verba</span>
        {status && <span className="status">{status}</span>}
        {sessionStartTime && !status && <span className="session-timer">{sessionElapsed}</span>}
        <div className="divider-actions">
          <button className="settings-btn" onClick={() => setShowSettings(true)}>⚙</button>
        </div>
      </div>

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
              <button className={`caregiver-lang-btn ${caregiverSpeaksEnglish ? 'active' : ''}`} onClick={() => setCaregiverSpeaksEnglish(true)}>English</button>
              <button className={`caregiver-lang-btn ${!caregiverSpeaksEnglish ? 'active' : ''}`} onClick={() => setCaregiverSpeaksEnglish(false)}>{selectedLang.label}</button>
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
        <button className="help-btn" onClick={handlePanicButton}>
          {HELP_BUTTON_LABELS[selectedLang.code] || 'I need help'}
        </button>
      </div>

      {panicAlert && (
        <div className="panic-overlay" onClick={handlePanicDismiss}>
          <div className="panic-box">
            <div className="panic-icon">🆘</div>
            <p className="panic-title">Patient Needs Help</p>
            <p className="panic-sub">{HELP_BUTTON_LABELS[selectedLang.code] || 'I need help'}</p>
            <button className="panic-dismiss" onClick={handlePanicDismiss}>Dismiss</button>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="phrases-overlay" onClick={() => setShowSettings(false)}>
          <div className="phrases-panel settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Session Settings</span>
              <button className="phrases-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <div className="settings-row">
              <span className="settings-label">Patient language</span>
              <select className="settings-select" value={selectedLang.code} onChange={handleLangChange}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
            </div>
            <div className="settings-row">
              <span className="settings-label">Specialty</span>
              <select className="settings-select" value={selectedSpecialty.code} onChange={handleSpecialtyChange}>
                {SPECIALTIES.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>
            <div className="settings-row">
              <span className="settings-label">Caregiver mode</span>
              <button className={`caregiver-toggle ${caregiverMode ? 'on' : ''}`} onClick={() => setCaregiverMode((prev) => !prev)}>
                {caregiverMode ? 'On' : 'Off'}
              </button>
            </div>
            <div className="settings-row">
              <span className="settings-label">Offline mode</span>
              <button className={`caregiver-toggle ${offlineManual ? 'on' : ''}`} onClick={() => setOfflineManual((prev) => !prev)}>
                {offlineManual ? 'On' : 'Off'}
              </button>
            </div>
            <div className="settings-divider" />
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowPhrases(true); }}>Quick Phrases</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowPainScale(true); }}>Pain Scale</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowVitalSigns(true); }}>Vital Signs</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowOnboarding(true); }}>Patient Intro</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowMedInstructions(true); }}>Medication Instructions</button>
            <button className="settings-action-btn" onClick={() => { setShowTwoDeviceSetup(true); setShowSettings(false); }}>Two-Device Mode</button>
            {messages.length > 0 && (
              <>
                <div className="settings-divider" />
                <button className="settings-action-btn" onClick={() => generateSummary()}>Session Summary</button>
                <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowExport(true); }}>Export Transcript</button>
                <button className="settings-action-btn danger" onClick={clearSession}>Clear Session</button>
              </>
            )}
          </div>
        </div>
      )}

      {showTwoDeviceSetup && (
        <div className="phrases-overlay" onClick={() => setShowTwoDeviceSetup(false)}>
          <div className="phrases-panel settings-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Two-Device Mode</span>
              <button className="phrases-close" onClick={() => setShowTwoDeviceSetup(false)}>✕</button>
            </div>
            <p className="export-desc">Each person uses their own phone. The provider starts a session and shares the code with the patient.</p>
            <div className="settings-divider" />
            <p className="two-device-section-label">Provider — Start a session</p>
            <button className="export-action-btn" onClick={handleStartTwoDeviceAsProvider}>
              Generate Session Code
            </button>
            <div className="settings-divider" />
            <p className="two-device-section-label">Patient — Join a session</p>
            <div className="med-input-row">
              <input
                className="med-input"
                type="text"
                placeholder="Enter code e.g. HAWK-4291"
                value={twoDeviceJoinCode}
                onChange={(e) => setTwoDeviceJoinCode(e.target.value.toUpperCase())}
                maxLength={9}
              />
              <button
                className="med-input-add"
                onClick={handleJoinTwoDeviceAsPatient}
                disabled={!twoDeviceJoinCode.trim()}
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-box">
            <div className="onboarding-icon">🌐</div>
            <p className="onboarding-title">{onboarding.title}</p>
            <p className="onboarding-body">{onboarding.body}</p>
            <p className="onboarding-instruction">{onboarding.instruction}</p>
            <p className="onboarding-privacy">{onboarding.privacy}</p>
            <button className="onboarding-repeat" onClick={speakOnboarding} disabled={isSpeakingOnboarding}>
              {isSpeakingOnboarding ? '🔊 ...' : `🔊 ${onboarding.repeat}`}
            </button>
            <button className="onboarding-dismiss" onClick={() => setShowOnboarding(false)}>{onboarding.dismiss}</button>
          </div>
        </div>
      )}

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
                <button key={cat.category} className={`phrases-tab ${activeCategory === i ? 'active' : ''}`} onClick={() => setActiveCategory(i)}>
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
                  {offlineActive && <span className="phrase-pretranslated">{phrase[selectedLang.code]}</span>}
                  {translatingPhrase === phrase.english && <span className="phrase-pretranslated">Translating...</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showPainScale && (
        <div className="phrases-overlay" onClick={() => setShowPainScale(false)}>
          <div className="pain-scale-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Pain Scale</span>
              <button className="phrases-close" onClick={() => setShowPainScale(false)}>✕</button>
            </div>
            <p className="pain-scale-instruction">Ask the patient to tap their pain level.</p>
            <div className="pain-scale-grid">
              {PAIN_LEVELS.map(({ n, face, label, color }) => (
                <button
                  key={n}
                  className="pain-btn"
                  style={{ '--pain-color': color }}
                  onClick={() => handlePainLevelTap(n)}
                >
                  <span className="pain-face">{face}</span>
                  <span className="pain-number" style={{ color }}>{n}</span>
                  <span className="pain-label">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showVitalSigns && (
        <div className="phrases-overlay" onClick={() => setShowVitalSigns(false)}>
          <div className="phrases-panel vitals-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Vital Signs</span>
              <button className="phrases-close" onClick={() => setShowVitalSigns(false)}>✕</button>
            </div>
            <p className="pain-scale-instruction">Enter the patient's readings below.</p>
            <div className="vitals-inputs">
              {VITAL_SIGNS.map(v => (
                <div key={v.key} className="vitals-input-row">
                  <div className="vitals-input-label">
                    <span className="vitals-label-en">{v.labelEn}</span>
                    {v.unit && <span className="vitals-unit">{v.unit}</span>}
                  </div>
                  <input
                    className="vitals-input"
                    type="text"
                    placeholder={v.placeholder}
                    value={vitalValues[v.key]}
                    onChange={(e) => setVitalValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button
              className="export-action-btn"
              onClick={handleShowVitalPatient}
              disabled={!VITAL_SIGNS.some(v => vitalValues[v.key].trim())}
            >
              Show Patient →
            </button>
          </div>
        </div>
      )}

      {showVitalPatient && (
        <div className="med-patient-overlay">
          <div className="med-patient-header">
            <span className="med-patient-title">📊 {selectedLang.label}</span>
          </div>
          <div className="med-patient-list">
            {VITAL_SIGNS.filter(v => vitalValues[v.key].trim()).map(v => (
              <div key={v.key} className="vitals-patient-item">
                <div className="vitals-patient-labels">
                  <span className="vitals-patient-label-native">{v.labels[selectedLang.code] || v.labelEn}</span>
                  <span className="vitals-patient-label-en">{v.labelEn}</span>
                </div>
                <span className="vitals-patient-value">
                  {vitalValues[v.key].trim()}{v.unit ? ` ${v.unit}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="med-patient-actions">
            <button
              className="med-patient-repeat"
              onClick={() => speakVitals(VITAL_SIGNS.filter(v => vitalValues[v.key].trim()))}
              disabled={vitalSpeaking}
            >
              {vitalSpeaking ? '🔊 Reading...' : '🔊 Repeat'}
            </button>
            <button className="med-patient-done" onClick={() => { setShowVitalPatient(false); setShowVitalSigns(true); window.speechSynthesis.cancel(); }}>← Back</button>
            <button className="med-patient-close" onClick={() => { setShowVitalPatient(false); window.speechSynthesis.cancel(); setVitalValues({ bp: '', hr: '', temp: '', o2: '' }); }}>Done</button>
          </div>
        </div>
      )}

      {showExport && (
        <div className="phrases-overlay" onClick={() => setShowExport(false)}>
          <div className="phrases-panel export-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Export Transcript</span>
              <button className="phrases-close" onClick={() => setShowExport(false)}>✕</button>
            </div>
            <p className="export-desc">Export the full bilingual transcript from this session.</p>
            <button className="export-action-btn" onClick={handleCopy}>{copyConfirmed ? '✓ Copied to clipboard' : 'Copy to clipboard'}</button>
            <button className="export-action-btn share" onClick={handleShare}>Share via...</button>
          </div>
        </div>
      )}

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
                <button className="export-action-btn" onClick={handleSummaryCopy}>{summaryCopyConfirmed ? '✓ Copied to clipboard' : 'Copy to clipboard'}</button>
                <button className="export-action-btn share" onClick={() => generateSummary(true)}>Regenerate</button>
              </>
            )}
          </div>
        </div>
      )}

      {showMedInstructions && (
        <div className="phrases-overlay" onClick={() => setShowMedInstructions(false)}>
          <div className="phrases-panel med-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Medication Instructions</span>
              <button className="phrases-close" onClick={() => setShowMedInstructions(false)}>✕</button>
            </div>
            <div className="med-input-row">
              <input
                className="med-input"
                type="text"
                placeholder="Type an instruction..."
                value={medInputText}
                onChange={(e) => setMedInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleMedAddText(); }}
                disabled={medInputLoading || medIsRecording}
              />
              <button className="med-input-add" onClick={handleMedAddText} disabled={medInputLoading || medIsRecording || !medInputText.trim()}>
                {medInputLoading ? '...' : 'Add'}
              </button>
              <button
                className={`med-mic-btn ${medIsRecording ? 'recording' : ''}`}
                onMouseDown={handleMedStartRecording}
                onMouseUp={handleMedStopRecording}
                onTouchStart={(e) => { e.preventDefault(); handleMedStartRecording(); }}
                onTouchEnd={(e) => { e.preventDefault(); handleMedStopRecording(); }}
                disabled={medInputLoading}
              >
                {medIsRecording ? '🔴' : '🎙'}
              </button>
            </div>
            {medInputLoading && <p className="export-desc">Translating...</p>}
            {medInstructions.length > 0 && (
              <div className="med-list">
                {medInstructions.map((instr, i) => (
                  <div key={i} className="med-item">
                    <div className="med-item-content">
                      <span className="med-item-english">{instr.english}</span>
                      <span className="med-item-translated">{instr.translated}</span>
                    </div>
                    <button className="med-item-remove" onClick={() => handleMedRemove(i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {medInstructions.length > 0 && (
              <button className="export-action-btn" onClick={() => { setShowMedInstructions(false); setShowMedPatient(true); }}>
                Show Patient →
              </button>
            )}
          </div>
        </div>
      )}

      {showMedPatient && (
        <div className="med-patient-overlay">
          <div className="med-patient-header">
            <span className="med-patient-title">💊 {selectedLang.label}</span>
          </div>
          <div className="med-patient-list">
            {medInstructions.map((instr, i) => (
              <div key={i} className="med-patient-item">
                <span className="med-patient-number">{i + 1}</span>
                <span className="med-patient-text">{instr.translated}</span>
              </div>
            ))}
          </div>
          <div className="med-patient-actions">
            <button className="med-patient-repeat" onClick={() => speakMedInstructions(medInstructions)} disabled={medIsSpeaking}>
              {medIsSpeaking ? '🔊 Reading...' : '🔊 Repeat'}
            </button>
            <button className="med-patient-done" onClick={() => { setShowMedPatient(false); setShowMedInstructions(true); }}>← Back</button>
            <button className="med-patient-close" onClick={() => { setShowMedPatient(false); window.speechSynthesis.cancel(); }}>Done</button>
          </div>
        </div>
      )}

    </div>
  );
}

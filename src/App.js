import React, { useState, useRef, useEffect, useCallback } from 'react';
import Ably from 'ably';
import './App.css';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
const ABLY_API_KEY = process.env.REACT_APP_ABLY_API_KEY;

const LANGUAGES = [
  { label: 'Arabic',     code: 'ar',  voice: 'ar-SA', whisper: 'ar' },
  { label: 'Bulgarian',  code: 'bg',  voice: 'bg-BG', whisper: 'bg' },
  { label: 'Cantonese',  code: 'yue', voice: 'zh-HK', whisper: 'yue' },
  { label: 'Croatian',   code: 'hr',  voice: 'hr-HR', whisper: 'hr' },
  { label: 'Czech',      code: 'cs',  voice: 'cs-CZ', whisper: 'cs' },
  { label: 'Danish',     code: 'da',  voice: 'da-DK', whisper: 'da' },
  { label: 'Dutch',      code: 'nl',  voice: 'nl-NL', whisper: 'nl' },
  { label: 'Finnish',    code: 'fi',  voice: 'fi-FI', whisper: 'fi' },
  { label: 'French',     code: 'fr',  voice: 'fr-FR', whisper: 'fr' },
  { label: 'German',     code: 'de',  voice: 'de-DE', whisper: 'de' },
  { label: 'Greek',      code: 'el',  voice: 'el-GR', whisper: 'el' },
  { label: 'Hindi',      code: 'hi',  voice: 'hi-IN', whisper: 'hi' },
  { label: 'Hungarian',  code: 'hu',  voice: 'hu-HU', whisper: 'hu' },
  { label: 'Italian',    code: 'it',  voice: 'it-IT', whisper: 'it' },
  { label: 'Korean',     code: 'ko',  voice: 'ko-KR', whisper: 'ko' },
  { label: 'Mandarin',   code: 'zh',  voice: 'zh-CN', whisper: 'zh' },
  { label: 'Norwegian',  code: 'no',  voice: 'nb-NO', whisper: 'no' },
  { label: 'Persian',    code: 'fa',  voice: 'fa-IR', whisper: 'fa' },
  { label: 'Polish',     code: 'pl',  voice: 'pl-PL', whisper: 'pl' },
  { label: 'Portuguese', code: 'pt',  voice: 'pt-BR', whisper: 'pt' },
  { label: 'Romanian',   code: 'ro',  voice: 'ro-RO', whisper: 'ro' },
  { label: 'Russian',    code: 'ru',  voice: 'ru-RU', whisper: 'ru' },
  { label: 'Slovak',     code: 'sk',  voice: 'sk-SK', whisper: 'sk' },
  { label: 'Spanish',    code: 'es',  voice: 'es-ES', whisper: 'es' },
  { label: 'Swedish',    code: 'sv',  voice: 'sv-SE', whisper: 'sv' },
  { label: 'Turkish',    code: 'tr',  voice: 'tr-TR', whisper: 'tr' },
  { label: 'Ukrainian',  code: 'uk',  voice: 'uk-UA', whisper: 'uk' },
  { label: 'Vietnamese', code: 'vi',  voice: 'vi-VN', whisper: 'vi' },
];

const PROVIDER_LANGUAGES = [
  { label: 'English',    code: 'en',  voice: 'en-US', whisper: 'en' },
  { label: 'Arabic',     code: 'ar',  voice: 'ar-SA', whisper: 'ar' },
  { label: 'Bulgarian',  code: 'bg',  voice: 'bg-BG', whisper: 'bg' },
  { label: 'Cantonese',  code: 'yue', voice: 'zh-HK', whisper: 'yue' },
  { label: 'Croatian',   code: 'hr',  voice: 'hr-HR', whisper: 'hr' },
  { label: 'Czech',      code: 'cs',  voice: 'cs-CZ', whisper: 'cs' },
  { label: 'Danish',     code: 'da',  voice: 'da-DK', whisper: 'da' },
  { label: 'Dutch',      code: 'nl',  voice: 'nl-NL', whisper: 'nl' },
  { label: 'Finnish',    code: 'fi',  voice: 'fi-FI', whisper: 'fi' },
  { label: 'French',     code: 'fr',  voice: 'fr-FR', whisper: 'fr' },
  { label: 'German',     code: 'de',  voice: 'de-DE', whisper: 'de' },
  { label: 'Greek',      code: 'el',  voice: 'el-GR', whisper: 'el' },
  { label: 'Hindi',      code: 'hi',  voice: 'hi-IN', whisper: 'hi' },
  { label: 'Hungarian',  code: 'hu',  voice: 'hu-HU', whisper: 'hu' },
  { label: 'Italian',    code: 'it',  voice: 'it-IT', whisper: 'it' },
  { label: 'Korean',     code: 'ko',  voice: 'ko-KR', whisper: 'ko' },
  { label: 'Mandarin',   code: 'zh',  voice: 'zh-CN', whisper: 'zh' },
  { label: 'Norwegian',  code: 'no',  voice: 'nb-NO', whisper: 'no' },
  { label: 'Persian',    code: 'fa',  voice: 'fa-IR', whisper: 'fa' },
  { label: 'Polish',     code: 'pl',  voice: 'pl-PL', whisper: 'pl' },
  { label: 'Portuguese', code: 'pt',  voice: 'pt-BR', whisper: 'pt' },
  { label: 'Romanian',   code: 'ro',  voice: 'ro-RO', whisper: 'ro' },
  { label: 'Russian',    code: 'ru',  voice: 'ru-RU', whisper: 'ru' },
  { label: 'Slovak',     code: 'sk',  voice: 'sk-SK', whisper: 'sk' },
  { label: 'Spanish',    code: 'es',  voice: 'es-ES', whisper: 'es' },
  { label: 'Swedish',    code: 'sv',  voice: 'sv-SE', whisper: 'sv' },
  { label: 'Turkish',    code: 'tr',  voice: 'tr-TR', whisper: 'tr' },
  { label: 'Ukrainian',  code: 'uk',  voice: 'uk-UA', whisper: 'uk' },
  { label: 'Vietnamese', code: 'vi',  voice: 'vi-VN', whisper: 'vi' },
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
  ar:  'مريض — العربية',
  bg:  'Пациент — Български',
  yue: '病人 — 廣東話',
  hr:  'Pacijent — Hrvatski',
  cs:  'Pacient — Cestina',
  da:  'Patient — Dansk',
  nl:  'Patient — Nederlands',
  fi:  'Potilas — Suomi',
  fr:  'Patient — Français',
  de:  'Patient — Deutsch',
  el:  'Ασθενής — Ελληνικά',
  hi:  'रोगी — हिन्दी',
  hu:  'Beteg — Magyar',
  it:  'Paziente — Italiano',
  ko:  '환자 — 한국어',
  zh:  '患者 — 普通话',
  no:  'Pasient — Norsk',
  fa:  'بیمار — فارسی',
  pl:  'Pacjent — Polski',
  pt:  'Paciente — Português',
  ro:  'Pacient — Romana',
  ru:  'Пациент — Русский',
  sk:  'Pacient — Slovencina',
  es:  'Paciente — Español',
  sv:  'Patient — Svenska',
  tr:  'Hasta — Turkce',
  uk:  'Пацієнт — Українська',
  vi:  'Benh nhan — Tieng Viet',
};

const PATIENT_BUTTONS = {
  ar:  { idle: 'اضغط للتحدث',              listening: 'جارٍ الاستماع...' },
  bg:  { idle: 'Drzhi za govorene',        listening: 'Slushane...' },
  yue: { idle: '按住講嘢',                  listening: '聆聽中...' },
  hr:  { idle: 'Drzi za govor',            listening: 'Slusa...' },
  cs:  { idle: 'Podrzte pro mluveni',      listening: 'Poslouchani...' },
  da:  { idle: 'Hold for at tale',         listening: 'Lytter...' },
  nl:  { idle: 'Houd vast om te spreken',  listening: 'Luisteren...' },
  fi:  { idle: 'Pida puhuaksesi',          listening: 'Kuunnellaan...' },
  fr:  { idle: 'Maintenir pour parler',    listening: 'Ecoute...' },
  de:  { idle: 'Halten zum Sprechen',      listening: 'Zuhoren...' },
  el:  { idle: 'Kratiste gia na milete',   listening: 'Akouo...' },
  hi:  { idle: 'बोलने के लिए दबाएं',        listening: 'सुन रहा है...' },
  hu:  { idle: 'Tartsa lenyomva beszedhez',listening: 'Hallgatas...' },
  it:  { idle: 'Tieni premuto per parlare',listening: 'Ascolto...' },
  ko:  { idle: '눌러서 말하기',              listening: '듣는 중...' },
  zh:  { idle: '按住说话',                  listening: '聆听中...' },
  no:  { idle: 'Hold for a snakke',        listening: 'Lytter...' },
  fa:  { idle: 'برای صحبت نگه دارید',      listening: 'در حال گوش دادن...' },
  pl:  { idle: 'Przytrzymaj aby mowic',    listening: 'Sluchanie...' },
  pt:  { idle: 'Segure para falar',        listening: 'Ouvindo...' },
  ro:  { idle: 'Tineti apasat pentru vorbit', listening: 'Ascultare...' },
  ru:  { idle: 'Держите для разговора',    listening: 'Слушаю...' },
  sk:  { idle: 'Podrzte pre hovorenie',    listening: 'Pocuvanie...' },
  es:  { idle: 'Manten para hablar',       listening: 'Escuchando...' },
  sv:  { idle: 'Hall for att tala',        listening: 'Lyssnar...' },
  tr:  { idle: 'Konusmak icin basili tut', listening: 'Dinleniyor...' },
  uk:  { idle: 'Утримуйте для розмови',    listening: 'Слухаю...' },
  vi:  { idle: 'Giu de noi',               listening: 'Dang nghe...' },
};

const HELP_BUTTON_LABELS = {
  ar:  'احتاج مساعدة',
  bg:  'Nuzhdaya se ot pomosht',
  yue: '我需要幫助',
  hr:  'Trebam pomoc',
  cs:  'Potrebuji pomoc',
  da:  'Jeg har brug for hjaelp',
  nl:  'Ik heb hulp nodig',
  fi:  'Tarvitsen apua',
  fr:  "J'ai besoin d'aide",
  de:  'Ich brauche Hilfe',
  el:  'Xreiazomai voitheia',
  hi:  'मुझे मदद चाहिए',
  hu:  'Segitsegre van szuksegem',
  it:  'Ho bisogno di aiuto',
  ko:  '도움이 필요해요',
  zh:  '我需要帮助',
  no:  'Jeg trenger hjelp',
  fa:  'به کمک نیاز دارم',
  pl:  'Potrzebuje pomocy',
  pt:  'Preciso de ajuda',
  ro:  'Am nevoie de ajutor',
  ru:  'Мне нужна помощь',
  sk:  'Potrebujem pomoc',
  es:  'Necesito ayuda',
  sv:  'Jag behover hjalp',
  tr:  'Yardima ihtiyacim var',
  uk:  'Мені потрібна допомога',
  vi:  'Toi can giup do',
};

const PATIENT_ONBOARDING = {
  ar: { title: 'مرحباً بك في Verba', body: 'يترجم هذا التطبيق ما تقوله أنت وطبيبك في الوقت الفعلي.', instruction: 'اضغط باستمرار على الزر للتحدث. تحدث بشكل طبيعي.', privacy: 'محادثتك خاصة ولا يتم تخزينها.', dismiss: 'فهمت', repeat: 'كرر' },
  bg: { title: 'Dobre doshli v Verba', body: 'Tazi aplikatsiya prevezda v realno vreme.', instruction: 'Natsnete i drzhi butona za da govorite.', privacy: 'Razgovorat vi e poveritelno.', dismiss: 'Razbrakh', repeat: 'Povtori' },
  yue: { title: '歡迎使用 Verba', body: '此應用程式可即時翻譯您和醫生之間的對話。', instruction: '按住按鈕說話。請自然地說話。', privacy: '您的對話是私密的，不會被儲存。', dismiss: '我明白了', repeat: '重複' },
  hr: { title: 'Dobrodosli u Verba', body: 'Ova aplikacija prevodi u stvarnom vremenu.', instruction: 'Pritisnite i drzite tipku za govor.', privacy: 'Vas razgovor je povjerljiv.', dismiss: 'Razumijem', repeat: 'Ponovi' },
  cs: { title: 'Vitejte ve Verba', body: 'Tato aplikace prelozi v realnem case.', instruction: 'Podrzte tlacitko pro mluveni.', privacy: 'Vas rozhovor je duverny.', dismiss: 'Rozumim', repeat: 'Opakovat' },
  da: { title: 'Velkommen til Verba', body: 'Denne app oversaetter i realtid.', instruction: 'Hold knappen nede for at tale.', privacy: 'Din samtale er privat.', dismiss: 'Forstaet', repeat: 'Gentag' },
  nl: { title: 'Welkom bij Verba', body: 'Deze app vertaalt in realtime.', instruction: 'Houd de knop ingedrukt om te spreken.', privacy: 'Uw gesprek is prive.', dismiss: 'Begrepen', repeat: 'Herhaal' },
  fi: { title: 'Tervetuloa Verbaan', body: 'Tama sovellus kaantaa reaaliajassa.', instruction: 'Pida painiketta alhaalla puhuaksesi.', privacy: 'Keskustelusi on yksityinen.', dismiss: 'Ymmarra', repeat: 'Toista' },
  fr: { title: 'Bienvenue sur Verba', body: 'Cette application traduit en temps reel.', instruction: 'Maintenez le bouton pour parler.', privacy: "Votre conversation n'est pas enregistree.", dismiss: "J'ai compris", repeat: 'Repeter' },
  de: { title: 'Willkommen bei Verba', body: 'Diese App ubersetzt in Echtzeit.', instruction: 'Halten Sie die Taste zum Sprechen gedruckt.', privacy: 'Ihr Gesprach wird nicht gespeichert.', dismiss: 'Verstanden', repeat: 'Wiederholen' },
  el: { title: 'Kalosirthate sto Verba', body: 'Auti i efarmogi metafrazei se pragmatiko xrono.', instruction: 'Kratiste to koumpi gia na milete.', privacy: 'I synomilia sas einai empisteytiki.', dismiss: 'Katalava', repeat: 'Epanalipsi' },
  hi: { title: 'Verba में आपका स्वागत है', body: 'यह ऐप रियल टाइम में अनुवाद करता है।', instruction: 'बोलने के लिए बटन को दबाए रखें।', privacy: 'आपकी बातचीत निजी है।', dismiss: 'समझ गया', repeat: 'दोहराएं' },
  hu: { title: 'Udvozoljuk a Verbaban', body: 'Ez az alkalmazas valos idoben fordit.', instruction: 'Tartsa lenyomva a gombot a beszedhez.', privacy: 'A beszelgetese bizalmas.', dismiss: 'Ertettem', repeat: 'Ismetles' },
  it: { title: 'Benvenuto su Verba', body: 'Questa app traduce in tempo reale.', instruction: 'Tieni premuto il pulsante per parlare.', privacy: 'La tua conversazione e privata.', dismiss: 'Capito', repeat: 'Ripeti' },
  ko: { title: 'Verba에 오신 것을 환영합니다', body: '이 앱은 실시간으로 번역합니다.', instruction: '말하려면 버튼을 누르고 계세요.', privacy: '대화 내용은 저장되지 않습니다.', dismiss: '확인했습니다', repeat: '반복' },
  zh: { title: '欢迎使用 Verba', body: '此应用程序可实时翻译。', instruction: '按住按钮说话。', privacy: '您的对话不会被存储。', dismiss: '我明白了', repeat: '重复' },
  no: { title: 'Velkommen til Verba', body: 'Denne appen oversetter i sanntid.', instruction: 'Hold knappen nede for a snakke.', privacy: 'Samtalen din er privat.', dismiss: 'Forstaatt', repeat: 'Gjenta' },
  fa: { title: 'به Verba خوش آمدید', body: 'این برنامه به صورت زنده ترجمه می‌کند.', instruction: 'برای صحبت، دکمه را نگه دارید.', privacy: 'مکالمه شما ذخیره نمی‌شود.', dismiss: 'متوجه شدم', repeat: 'تکرار' },
  pl: { title: 'Witamy w Verba', body: 'Ta aplikacja tlumaczy w czasie rzeczywistym.', instruction: 'Przytrzymaj przycisk aby mowic.', privacy: 'Twoja rozmowa jest prywatna.', dismiss: 'Rozumiem', repeat: 'Powtorz' },
  pt: { title: 'Bem-vindo ao Verba', body: 'Este aplicativo traduz em tempo real.', instruction: 'Mantenha o botao pressionado para falar.', privacy: 'Sua conversa e privada.', dismiss: 'Entendi', repeat: 'Repetir' },
  ro: { title: 'Bun venit la Verba', body: 'Aceasta aplicatie traduce in timp real.', instruction: 'Tineti apasat butonul pentru a vorbi.', privacy: 'Conversatia dvs. este privata.', dismiss: 'Am inteles', repeat: 'Repeta' },
  ru: { title: 'Добро пожаловать в Verba', body: 'Это приложение переводит в реальном времени.', instruction: 'Удерживайте кнопку, чтобы говорить.', privacy: 'Ваш разговор не сохраняется.', dismiss: 'Понятно', repeat: 'Повторить' },
  sk: { title: 'Vitajte vo Verba', body: 'Tato aplikacia prelozi v realnom case.', instruction: 'Podrzte tlacidlo pre hovorenie.', privacy: 'Vas rozhovor je duverny.', dismiss: 'Rozumiem', repeat: 'Zopakovat' },
  es: { title: 'Bienvenido a Verba', body: 'Esta aplicacion traduce en tiempo real.', instruction: 'Mantenga presionado el boton para hablar.', privacy: 'Su conversacion es privada.', dismiss: 'Entendido', repeat: 'Repetir' },
  sv: { title: 'Valkommen till Verba', body: 'Den har appen oversatter i realtid.', instruction: 'Hall knappen intryckt for att tala.', privacy: 'Ditt samtal ar privat.', dismiss: 'Forstadd', repeat: 'Upprepa' },
  tr: { title: "Verba'ya Hos Geldiniz", body: 'Bu uygulama gercek zamanli cevirir.', instruction: 'Konusmak icin dugmeye basili tutun.', privacy: 'Konusmaniz saklanmaz.', dismiss: 'Anladim', repeat: 'Tekrarla' },
  uk: { title: 'Ласкаво просимо до Verba', body: 'Цей застосунок перекладає в реальному часі.', instruction: 'Утримуйте кнопку, щоб говорити.', privacy: 'Ваша розмова не зберігається.', dismiss: 'Зрозуміло', repeat: 'Повторити' },
  vi: { title: 'Chao mung den voi Verba', body: 'Ung dung nay dich theo thoi gian thuc.', instruction: 'Giu nut de noi.', privacy: 'Cuoc tro chuyen cua ban duoc bao mat.', dismiss: 'Da hieu', repeat: 'Lap lai' },
};

const PHRASE_CATEGORIES = [
  {
    category: 'Pain',
    phrases: [
      {
        english: 'Where is your pain?',
        ar: 'أين يوجد ألمك؟', bg: 'Kade e bolkata vi?', yue: '你喺邊度痛？', hr: 'Gdje vas boli?',
        cs: 'Kde vas boli?', da: 'Hvor har du ondt?', nl: 'Waar heeft u pijn?', fi: 'Missa on kipusi?',
        fr: 'Ou avez-vous mal?', de: 'Wo haben Sie Schmerzen?', el: 'Pou ponate?', hi: 'आपको दर्द कहाँ है?',
        hu: 'Hol faj?', it: 'Dove ha dolore?', ko: '어디가 아프세요?', zh: '您哪里疼？',
        no: 'Hvor har du vondt?', fa: 'درد شما کجاست؟', pl: 'Gdzie boli?', pt: 'Onde e a sua dor?',
        ro: 'Unde va doare?', ru: 'Где у вас боль?', sk: 'Kde vas boli?', es: 'Donde le duele?',
        sv: 'Var har du ont?', tr: 'Agriniz nerede?', uk: 'Де у вас біль?', vi: 'Ban dau o dau?',
      },
      {
        english: 'Rate your pain 1 to 10.',
        ar: 'قيّم ألمك من 1 إلى 10.', bg: 'Ocenete bolkata ot 1 do 10.', yue: '請用1至10分評估你嘅痛楚程度。', hr: 'Ocijenite bol od 1 do 10.',
        cs: 'Ohodnotte bolest od 1 do 10.', da: 'Vurder din smerte fra 1 til 10.', nl: 'Beoordeel uw pijn van 1 tot 10.', fi: 'Arvioi kipusi 1-10.',
        fr: 'Evaluez votre douleur de 1 a 10.', de: 'Bewerten Sie Ihren Schmerz von 1 bis 10.', el: 'Vathmologiste ton pono apo 1 eos 10.', hi: 'अपने दर्द को 1 से 10 पर बताएं।',
        hu: 'Ertekelje a fajdalmat 1-tol 10-ig.', it: 'Valuti il dolore da 1 a 10.', ko: '통증을 1에서 10으로 평가해 주세요.', zh: '请用1到10分描述您的疼痛。',
        no: 'Vurder smerten fra 1 til 10.', fa: 'درد خود را از ۱ تا ۱۰ ارزیابی کنید.', pl: 'Ocen bol w skali 1-10.', pt: 'Classifique sua dor de 1 a 10.',
        ro: 'Evaluati durerea de la 1 la 10.', ru: 'Оцените боль от 1 до 10.', sk: 'Ohodnotte bolest od 1 do 10.', es: 'Califique su dolor del 1 al 10.',
        sv: 'Bedomm din smarta fran 1 till 10.', tr: 'Agrinizi 1 ile 10 arasinda puanlayin.', uk: 'Оцініть біль від 1 до 10.', vi: 'Danh gia con dau tu 1 den 10.',
      },
      {
        english: 'Is the pain constant or does it come and go?',
        ar: 'هل الألم مستمر أم يأتي ويذهب؟', bg: 'Bolkata postoyanna li e ili idva i si otiva?', yue: '痛楚係持續定係時好時壞？', hr: 'Je li bol stalna ili dolazi i odlazi?',
        cs: 'Je bolest stala nebo prijde a odejde?', da: 'Er smerten konstant eller kommer og gar?', nl: 'Is de pijn constant of komt en gaat hij?', fi: 'Onko kipu jatkuvaa vai tuleeko ja menee?',
        fr: 'La douleur est-elle constante ou intermittente?', de: 'Ist der Schmerz konstant oder kommt und geht er?', el: 'Einai o ponos diarkis i erchetai kai fevgei?', hi: 'क्या दर्द लगातार है या आता-जाता है?',
        hu: 'A fajdalom allando vagy jon-megy?', it: 'Il dolore e costante o va e viene?', ko: '통증이 지속적인가요 아니면 왔다 갔다 하나요?', zh: '疼痛是持续的还是时好时坏？',
        no: 'Er smerten konstant eller kommer og gar den?', fa: 'آیا درد مداوم است یا می‌آید و می‌رود؟', pl: 'Czy bol jest staly czy przychodzi i odchodzi?', pt: 'A dor e constante ou vai e vem?',
        ro: 'Durerea este constanta sau vine si pleaca?', ru: 'Боль постоянная или приходит и уходит?', sk: 'Je bolest stala alebo prichádza a odchádza?', es: 'El dolor es constante o va y viene?',
        sv: 'Ar smarten konstant eller kommer och gar den?', tr: 'Agri surekli mi yoksa gelip geciyor mu?', uk: 'Біль постійний чи приходить і відходить?', vi: 'Con dau co lien tuc hay den roi di?',
      },
      {
        english: 'Does the pain radiate anywhere?',
        ar: 'هل ينتشر الألم إلى مكان آخر؟', bg: 'Razprostira li se bolkata njakade?', yue: '痛楚有冇擴散到其他地方？', hr: 'Siri li se bol negdje?',
        cs: 'Vyrizuje se bolest nekam?', da: 'Straaler smerten ud noget sted?', nl: 'Straalt de pijn ergens naartoe?', fi: 'Saatuuko kipu johonkin?',
        fr: 'La douleur irradie-t-elle quelque part?', de: 'Strahlt der Schmerz irgendwohin aus?', el: 'Aktinovolei o ponos kapoU?', hi: 'क्या दर्द कहीं और फैलता है?',
        hu: 'Kisugarzik-e a fajdalom valahova?', it: 'Il dolore irradia da qualche parte?', ko: '통증이 다른 곳으로 퍼지나요?', zh: '疼痛是否向其他部位放射？',
        no: 'Stralér smerten ut noe sted?', fa: 'آیا درد به جای دیگری می‌کشد؟', pl: 'Czy bol promieniuje gdzies?', pt: 'A dor irradia para algum lugar?',
        ro: 'Durerea iradiaza undeva?', ru: 'Боль отдаёт куда-нибудь?', sk: 'Vyrizuje sa bolest niekam?', es: 'El dolor se irradia a algun lugar?',
        sv: 'Straalar smarten ut nagon stans?', tr: 'Agri bir yere yayiliyor mu?', uk: 'Біль віддає кудись?', vi: 'Con dau co lan ra noi nao khong?',
      },
    ],
  },
  {
    category: 'Assessment',
    phrases: [
      {
        english: 'Are you having trouble breathing?',
        ar: 'هل تعاني من صعوبة في التنفس؟', bg: 'Trudno li vi e da diishate?', yue: '你有冇呼吸困難？', hr: 'Imate li poteskoca s disanjem?',
        cs: 'Mate problemy s dychanim?', da: 'Har du svaert ved at trække vejret?', nl: 'Heeft u moeite met ademen?', fi: 'Onko sinulla vaikeuksia hengittaa?',
        fr: 'Avez-vous des difficultes a respirer?', de: 'Haben Sie Schwierigkeiten beim Atmen?', el: 'Echete dyskolio na anapreete?', hi: 'क्या आपको सांस लेने में तकलीफ है?',
        hu: 'Nehezsegei vannak a legzesben?', it: 'Ha difficolta a respirare?', ko: '숨쉬기가 힘드세요?', zh: '您呼吸困难吗？',
        no: 'Har du vansker med a puste?', fa: 'آیا در تنفس مشکل دارید؟', pl: 'Czy ma pan/pani trudnosci z oddychaniem?', pt: 'Voce esta tendo dificuldade para respirar?',
        ro: 'Aveti dificultati de respiratie?', ru: 'У вас затруднение дыхания?', sk: 'Mate problemy s dychanim?', es: 'Tiene dificultad para respirar?',
        sv: 'Har du svarigheter att andas?', tr: 'Nefes almakta guclu cekiryor musunuz?', uk: 'У вас є труднощі з диханням?', vi: 'Ban co kho tho khong?',
      },
      {
        english: 'Do you feel dizzy or nauseous?',
        ar: 'هل تشعر بالدوار أو الغثيان؟', bg: 'Chuvstvate li zamayane ili gadno?', yue: '你有冇頭暈或作嘔？', hr: 'Osjecate li vrtoglavicu ili mucninu?',
        cs: 'Cítite se zavratelni nebo nevolno?', da: 'Har du svimmelhed eller kvalme?', nl: 'Voelt u zich duizelig of misselijk?', fi: 'Tunnetko huimausta tai pahoinvointia?',
        fr: 'Vous sentez-vous etourdi ou nauseeux?', de: 'Fuhlen Sie sich schwindelig oder ubel?', el: 'Aisthanesteili zali i nausia?', hi: 'क्या आपको चक्कर या मतली हो रही है?',
        hu: 'Szedulgeti magat vagy hanyingere van?', it: 'Si sente stordito o nauseato?', ko: '어지럽거나 메스꺼움을 느끼시나요?', zh: '您感到头晕或恶心吗？',
        no: 'Foles du svimmel eller kvalm?', fa: 'آیا احساس سرگیجه یا تهوع می‌کنید؟', pl: 'Czy czuje sie pan/pani zawroty glowy lub nudnosci?', pt: 'Voce se sente tonto ou com nausea?',
        ro: 'Va simtiti ametit sau greata?', ru: 'Вы чувствуете головокружение или тошноту?', sk: 'Cítite zavratie alebo nevolnost?', es: 'Se siente mareado o con nauseas?',
        sv: 'Kanner du dig yr eller illamaende?', tr: 'Bas donmesi veya mide bulantisi hissediyor musunuz?', uk: 'Ви відчуваєте запаморочення або нудоту?', vi: 'Ban co cam thay chong mat hoac buon non khong?',
      },
      {
        english: 'Do you have a fever?',
        ar: 'هل لديك حمى؟', bg: 'Imate li temperatura?', yue: '你有冇發燒？', hr: 'Imate li temperaturu?',
        cs: 'Mate horku?', da: 'Har du feber?', nl: 'Heeft u koorts?', fi: 'Onko sinulla kuumetta?',
        fr: 'Avez-vous de la fievre?', de: 'Haben Sie Fieber?', el: 'Echete pyreto?', hi: 'क्या आपको बुखार है?',
        hu: 'Van laza?', it: 'Ha la febbre?', ko: '열이 있으세요?', zh: '您发烧了吗？',
        no: 'Har du feber?', fa: 'آیا تب دارید؟', pl: 'Czy ma pan/pani goraczke?', pt: 'Voce tem febre?',
        ro: 'Aveti febra?', ru: 'У вас есть температура?', sk: 'Mate horucku?', es: 'Tiene fiebre?',
        sv: 'Har du feber?', tr: 'Atesiniz var mi?', uk: 'У вас є температура?', vi: 'Ban co bi sot khong?',
      },
      {
        english: 'How long have you had this symptom?',
        ar: 'منذ متى وأنت تعاني من هذا العَرَض؟', bg: 'Kolko vreme imate tozi simptom?', yue: '呢個症狀持續幾耐了？', hr: 'Koliko dugo imate ovaj simptom?',
        cs: 'Jak dlouho mate tento priznak?', da: 'Hvor laenge har du haft dette symptom?', nl: 'Hoe lang heeft u dit symptoom al?', fi: 'Kuinka kauan sinulla on ollut tama oire?',
        fr: 'Depuis combien de temps avez-vous ce symptome?', de: 'Wie lange haben Sie dieses Symptom schon?', el: 'Poso kairo echete auto to symptoma?', hi: 'यह लक्षण आपको कितने समय से है?',
        hu: 'Mióta van ez a tunete?', it: 'Da quanto tempo ha questo sintomo?', ko: '이 증상이 얼마나 됐나요?', zh: '这个症状持续多久了？',
        no: 'Hvor lenge har du hatt dette symptomet?', fa: 'این علامت چه مدت است که دارید؟', pl: 'Jak dlugo ma pan/pani ten objaw?', pt: 'Ha quanto tempo voce tem esse sintoma?',
        ro: 'De cat timp aveti acest simptom?', ru: 'Как давно у вас этот симптом?', sk: 'Ako dlho mate tento priznak?', es: 'Cuanto tiempo lleva con este sintoma?',
        sv: 'Hur lange har du haft det har symptomet?', tr: 'Bu belirti ne zamandan beri var?', uk: 'Як давно у вас цей симптом?', vi: 'Ban co trieu chung nay bao lau roi?',
      },
    ],
  },
  {
    category: 'History',
    phrases: [
      {
        english: 'Do you have any allergies?',
        ar: 'هل لديك أي حساسية؟', bg: 'Imate li niakakvi alergii?', yue: '你有冇過敏？', hr: 'Imate li alergije?',
        cs: 'Mate nejake alergie?', da: 'Har du nogen allergier?', nl: 'Heeft u allergieën?', fi: 'Onko sinulla allergioita?',
        fr: 'Avez-vous des allergies?', de: 'Haben Sie Allergien?', el: 'Echete allergies?', hi: 'क्या आपको कोई एलर्जी है?',
        hu: 'Van barmilyen allergiaja?', it: 'Ha allergie?', ko: '알레르기가 있으세요?', zh: '您有过敏症吗？',
        no: 'Har du noen allergier?', fa: 'آیا آلرژی دارید؟', pl: 'Czy ma pan/pani jakies alergie?', pt: 'Voce tem alguma alergia?',
        ro: 'Aveti alergii?', ru: 'Есть ли у вас аллергия?', sk: 'Mate nejake alergie?', es: 'Tiene alguna alergia?',
        sv: 'Har du nagra allergier?', tr: 'Alerjiniz var mi?', uk: 'Чи є у вас алергія?', vi: 'Ban co bi di ung gi khong?',
      },
      {
        english: 'What medications are you currently taking?',
        ar: 'ما الأدوية التي تتناولها حالياً؟', bg: 'Kakvi lekarstva vzemate v momenta?', yue: '你而家食緊咩藥？', hr: 'Koje lijekove trenutno uzimate?',
        cs: 'Jake leky momentalne uzivate?', da: 'Hvilke mediciner tager du i ojeblikket?', nl: 'Welke medicijnen gebruikt u momenteel?', fi: 'Mita laakkeita kaytat talla hetkella?',
        fr: 'Quels medicaments prenez-vous actuellement?', de: 'Welche Medikamente nehmen Sie derzeit?', el: 'Poia farmaka pairnete tora?', hi: 'आप अभी कौन सी दवाएं ले रहे हैं?',
        hu: 'Milyen gyogyszereket szed jelenleg?', it: 'Quali farmaci sta attualmente prendendo?', ko: '현재 복용 중인 약이 있으세요?', zh: '您目前在服用哪些药物？',
        no: 'Hvilke medisiner tar du for oyeblikket?', fa: 'در حال حاضر چه داروهایی مصرف می‌کنید؟', pl: 'Jakie leki pan/pani przyjmuje?', pt: 'Quais medicamentos voce esta tomando?',
        ro: 'Ce medicamente luati in prezent?', ru: 'Какие лекарства вы принимаете?', sk: 'Ake lieky momentalne uzivate?', es: 'Que medicamentos esta tomando actualmente?',
        sv: 'Vilka mediciner tar du for narvarande?', tr: 'Su anda hangi ilaclari kullaniyorsunuz?', uk: 'Які ліки ви зараз приймаєте?', vi: 'Ban dang dung thuoc gi?',
      },
      {
        english: 'Do you have any chronic conditions?',
        ar: 'هل لديك أي أمراض مزمنة؟', bg: 'Imate li hronichni zabolyavaniya?', yue: '你有冇慢性病？', hr: 'Imate li kronicna stanja?',
        cs: 'Mate nejake chronicke stavy?', da: 'Har du kroniske sygdomme?', nl: 'Heeft u chronische aandoeningen?', fi: 'Onko sinulla kroonisia sairauksia?',
        fr: 'Avez-vous des maladies chroniques?', de: 'Haben Sie chronische Erkrankungen?', el: 'Echete chronies pathiseis?', hi: 'क्या आपको कोई पुरानी बीमारी है?',
        hu: 'Van kronikaus allapota?', it: 'Ha condizioni croniche?', ko: '만성 질환이 있으세요?', zh: '您有慢性疾病吗？',
        no: 'Har du kroniske tilstander?', fa: 'آیا بیماری مزمنی دارید؟', pl: 'Czy ma pan/pani choroby przewlekle?', pt: 'Voce tem alguma condicao cronica?',
        ro: 'Aveti afectiuni cronice?', ru: 'Есть ли у вас хронические заболевания?', sk: 'Mate nejake chronicke stavy?', es: 'Tiene alguna enfermedad cronica?',
        sv: 'Har du nagra kroniska tillstand?', tr: 'Kronik bir hastaligiz var mi?', uk: 'Чи є у вас хронічні захворювання?', vi: 'Ban co benh man tinh nao khong?',
      },
    ],
  },
  {
    category: 'Consent',
    phrases: [
      {
        english: 'I need to examine you.',
        ar: 'أحتاج إلى فحصك.', bg: 'Tryabva da vi pregleda.', yue: '我需要為你進行檢查。', hr: 'Trebam vas pregledati.',
        cs: 'Potrebuji vas vysetrit.', da: 'Jeg er nodt til at undersoge dig.', nl: 'Ik moet u onderzoeken.', fi: 'Minun taytyy tutkia sinut.',
        fr: 'Je dois vous examiner.', de: 'Ich muss Sie untersuchen.', el: 'Prepei na sas exetaso.', hi: 'मुझे आपकी जांच करनी है।',
        hu: 'Meg kell vizsgalnom ont.', it: 'Devo visitarla.', ko: '진찰을 해야 합니다.', zh: '我需要给您做检查。',
        no: 'Jeg ma undersoke deg.', fa: 'باید شما را معاینه کنم.', pl: 'Musz pana/pania zbadac.', pt: 'Preciso examina-lo/a.',
        ro: 'Trebuie sa va examinez.', ru: 'Мне нужно вас осмотреть.', sk: 'Musim vas vysetrit.', es: 'Necesito examinarlo/a.',
        sv: 'Jag behover undersoka dig.', tr: 'Sizi muayene etmem gerekiyor.', uk: 'Мені потрібно вас оглянути.', vi: 'Toi can kham cho ban.',
      },
      {
        english: 'I am going to give you medication.',
        ar: 'سأعطيك دواءً.', bg: 'Shte vi dam lekarstvo.', yue: '我將會為你用藥。', hr: 'Dat cu vam lijek.',
        cs: 'Dam vam lek.', da: 'Jeg vil give dig medicin.', nl: 'Ik ga u medicatie geven.', fi: 'Annan sinulle laaketta.',
        fr: 'Je vais vous administrer un medicament.', de: 'Ich werde Ihnen ein Medikament geben.', el: 'Tha sas doso farmako.', hi: 'मैं आपको दवा दूंगा।',
        hu: 'Gyogyszert fogok adni onnek.', it: 'Le daro un farmaco.', ko: '약을 드릴 것입니다.', zh: '我要给您用药。',
        no: 'Jeg skal gi deg medisin.', fa: 'می‌خواهم به شما دارو بدهم.', pl: 'Dam panu/pani lek.', pt: 'Vou lhe dar medicamento.',
        ro: 'Va voi da medicatie.', ru: 'Я дам вам лекарство.', sk: 'Dam vam liek.', es: 'Le voy a dar medicamento.',
        sv: 'Jag kommer ge dig medicin.', tr: 'Size ilac verecegim.', uk: 'Я дам вам ліки.', vi: 'Toi se cho ban dung thuoc.',
      },
      {
        english: 'Do you understand?',
        ar: 'هل تفهم؟', bg: 'Razbirate li?', yue: '你明白嗎？', hr: 'Razumijete li?',
        cs: 'Rozumite?', da: 'Forstar du?', nl: 'Begrijpt u het?', fi: 'Ymmarratkö?',
        fr: 'Comprenez-vous?', de: 'Verstehen Sie?', el: 'Katalavainete?', hi: 'क्या आप समझे?',
        hu: 'Erti?', it: 'Capisce?', ko: '이해하셨나요?', zh: '您明白吗？',
        no: 'Forstar du?', fa: 'آیا متوجه شدید؟', pl: 'Czy rozumie pan/pani?', pt: 'Voce entende?',
        ro: 'Intelegeti?', ru: 'Вы понимаете?', sk: 'Rozumiete?', es: 'Entiende?',
        sv: 'Forstar du?', tr: 'Anliyor musunuz?', uk: 'Ви розумієте?', vi: 'Ban co hieu khong?',
      },
      {
        english: 'Please sign here.',
        ar: 'من فضلك وقّع هنا.', bg: 'Molia podpishete tuk.', yue: '請喺呢度簽名。', hr: 'Molimo potpishite ovdje.',
        cs: 'Prosim podepiste zde.', da: 'Venligst skriv under her.', nl: 'Gelieve hier te tekenen.', fi: 'Ole hyva ja allekirjoita tahan.',
        fr: 'Veuillez signer ici.', de: 'Bitte hier unterschreiben.', el: 'Parakalo ypografste edo.', hi: 'कृपया यहाँ हस्ताक्षर करें।',
        hu: 'Kerem irjon ala itt.', it: 'Firmi qui per favore.', ko: '여기에 서명해 주세요.', zh: '请在这里签名。',
        no: 'Vennligst signer her.', fa: 'لطفاً اینجا امضا کنید.', pl: 'Prosze podpisac tutaj.', pt: 'Por favor assine aqui.',
        ro: 'Va rugam sa semnati aici.', ru: 'Пожалуйста, подпишите здесь.', sk: 'Prosim podpiste tu.', es: 'Por favor firme aqui.',
        sv: 'Var vanlig och skriv under har.', tr: 'Lutfen buraya imzalayin.', uk: 'Будь ласка, підпишіть тут.', vi: 'Vui long ky vao day.',
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
  { key: 'bp',   labelEn: 'Blood Pressure', unit: 'mmHg', placeholder: 'e.g. 120/80',
    labels: { ar: 'ضغط الدم', bg: 'Krvno nalyagane', yue: '血壓', hr: 'Krvni tlak', cs: 'Krevni tlak', da: 'Blodtryk', nl: 'Bloeddruk', fi: 'Verenpaine', fr: 'Pression arterielle', de: 'Blutdruck', el: 'Piesi', hi: 'रक्तचाप', hu: 'Vernyomas', it: 'Pressione sanguigna', ko: '혈압', zh: '血压', no: 'Blodtrykk', fa: 'فشار خون', pl: 'Cisnienie krwi', pt: 'Pressao arterial', ro: 'Tensiune arteriala', ru: 'Давление', sk: 'Krvny tlak', es: 'Presion arterial', sv: 'Blodtryck', tr: 'Tansiyon', uk: 'Тиск', vi: 'Huyet ap' } },
  { key: 'hr',   labelEn: 'Heart Rate',     unit: 'bpm',  placeholder: 'e.g. 72',
    labels: { ar: 'معدل ضربات القلب', bg: 'Sardechna chestota', yue: '心率', hr: 'Puls', cs: 'Tep', da: 'Puls', nl: 'Hartslag', fi: 'Syke', fr: 'Frequence cardiaque', de: 'Herzfrequenz', el: 'Kardiakos rythmis', hi: 'हृदय गति', hu: 'Szivritmus', it: 'Frequenza cardiaca', ko: '심박수', zh: '心率', no: 'Puls', fa: 'ضربان قلب', pl: 'Tetno', pt: 'Frequencia cardiaca', ro: 'Ritm cardiac', ru: 'Пульс', sk: 'Tep', es: 'Frecuencia cardiaca', sv: 'Hjartfrekvens', tr: 'Nabiz', uk: 'Пульс', vi: 'Nhip tim' } },
  { key: 'temp', labelEn: 'Temperature',    unit: '',     placeholder: 'e.g. 98.6F',
    labels: { ar: 'درجة الحرارة', bg: 'Temperatura', yue: '體溫', hr: 'Temperatura', cs: 'Teplota', da: 'Temperatur', nl: 'Temperatuur', fi: 'Lampotila', fr: 'Temperature', de: 'Temperatur', el: 'Thermokrasia', hi: 'तापमान', hu: 'Homerseklet', it: 'Temperatura', ko: '체온', zh: '体温', no: 'Temperatur', fa: 'دما', pl: 'Temperatura', pt: 'Temperatura', ro: 'Temperatura', ru: 'Температура', sk: 'Teplota', es: 'Temperatura', sv: 'Temperatur', tr: 'Ates', uk: 'Температура', vi: 'Nhiet do' } },
  { key: 'o2',   labelEn: 'Oxygen Level',   unit: '%',    placeholder: 'e.g. 98',
    labels: { ar: 'مستوى الأكسجين', bg: 'Nivo na kislorod', yue: '血氧水平', hr: 'Razina kisika', cs: 'Hladina kysliku', da: 'Iltmaetning', nl: 'Zuurstofgehalte', fi: 'Happisaturaatio', fr: "Niveau d'oxygene", de: 'Sauerstoffgehalt', el: 'Epipedo oxygonoy', hi: 'ऑक्सीजन स्तर', hu: 'Oxigenszint', it: 'Livello di ossigeno', ko: '산소 포화도', zh: '血氧水平', no: 'Oksygenniva', fa: 'سطح اکسیژن', pl: 'Poziom tlenu', pt: 'Nivel de oxigenio', ro: 'Nivel de oxigen', ru: 'Кислород', sk: 'Hladina kyslika', es: 'Nivel de oxigeno', sv: 'Syreniva', tr: 'Oksijen Seviyesi', uk: 'Кисень', vi: 'Nong do oxy' } },
];

const DISCHARGE_CATEGORIES = [
  { key: 'diet',        label: 'Diet',         icon: '🥗', placeholder: 'e.g. Soft foods only for 3 days' },
  { key: 'medications', label: 'Medications',  icon: '💊', placeholder: 'e.g. Ibuprofen 400mg twice daily' },
  { key: 'activity',    label: 'Activity',     icon: '🚶', placeholder: 'e.g. No heavy lifting for 2 weeks' },
  { key: 'followup',    label: 'Follow-up',    icon: '📅', placeholder: 'e.g. Return in 7 days for wound check' },
  { key: 'warnings',    label: 'Warning Signs',icon: '⚠️', placeholder: 'e.g. Return if fever above 101F' },
];

const WALKTHROUGH_SLIDES = [
  { icon: '🌐', title: 'Welcome to Verba', body: 'Verba is a real-time voice translation app for clinical care. This guide will walk you through all of its features.', hint: null },
  { icon: '📱', title: 'Two-sided layout', body: 'The screen is split in two. The top half faces you — the provider. The bottom half faces the patient (rotated 180°). Hold the phone between you, or each use your own device.', hint: null },
  { icon: '🎙', title: 'Hold to Speak', body: 'Press and hold your button to record. Speak naturally — Verba transcribes, translates, and reads the response aloud in the other language automatically.', hint: 'Release the button when you finish speaking.' },
  { icon: '⚙', title: 'Language & Specialty', body: 'Tap the gear icon to open Settings. Choose the patient language, your provider language, and your clinical specialty. Both sides can now be any language.', hint: 'You can also change your provider language directly in the center divider.' },
  { icon: '💬', title: 'Quick Phrases', body: 'Access 16 pre-translated clinical phrases across Pain, Assessment, History, and Consent categories. These work fully offline — no internet needed.', hint: 'Settings → Quick Phrases' },
  { icon: '😣', title: 'Pain Scale', body: 'Show the patient an 11-point visual pain scale. They tap their level and it is spoken aloud to you in your language.', hint: 'Settings → Pain Scale' },
  { icon: '📊', title: 'Vital Signs', body: 'Enter readings for blood pressure, heart rate, temperature, and oxygen level. Tap "Show Patient" to display them large and read them aloud in the patient language.', hint: 'Settings → Vital Signs' },
  { icon: '👋', title: 'Patient Intro', body: 'Opens a full-screen welcome message in the patient language, read aloud automatically. Use it at the start of a visit to orient the patient to the app.', hint: 'Settings → Patient Intro' },
  { icon: '💊', title: 'Medication Instructions', body: 'Type or dictate individual medication instructions. Each is translated and shown to the patient in large text, read aloud in sequence.', hint: 'Settings → Medication Instructions' },
  { icon: '📋', title: 'Discharge Instructions', body: 'Add discharge notes across five categories: Diet, Medications, Activity, Follow-up, and Warning Signs. All are shown to the patient organized by category.', hint: 'Settings → Discharge Instructions' },
  { icon: '👨‍👩‍👧', title: 'Caregiver Mode', body: 'Adds a third purple button for a family member or caregiver. You can set whether the caregiver speaks the provider language or the patient language.', hint: 'Settings → Caregiver Mode (toggle)' },
  { icon: '📡', title: 'Two-Device Mode', body: 'Each person holds their own phone. The provider generates a session code — the patient enters it to join. Both devices stay in sync in real time.', hint: 'Settings → Two-Device Mode' },
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
  const [selectedLang, setSelectedLang] = useState(LANGUAGES.find(l => l.code === 'es'));
  const [selectedProviderLang, setSelectedProviderLang] = useState(PROVIDER_LANGUAGES[0]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(SPECIALTIES[0]);
  const [showPhrases, setShowPhrases] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const [translatingPhrase, setTranslatingPhrase] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState({});
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPatientIntroPrompt, setShowPatientIntroPrompt] = useState(false);
  const [isSpeakingOnboarding, setIsSpeakingOnboarding] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryCopyConfirmed, setSummaryCopyConfirmed] = useState(false);
  const [caregiverMode, setCaregiverMode] = useState(false);
  const [caregiverSpeaksProvider, setCaregiverSpeaksProvider] = useState(true);
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
  const [splashReady, setSplashReady] = useState(false);
  const [showVitalSigns, setShowVitalSigns] = useState(false);
  const [showVitalPatient, setShowVitalPatient] = useState(false);
  const [vitalValues, setVitalValues] = useState({ bp: '', hr: '', temp: '', o2: '' });
  const [vitalSpeaking, setVitalSpeaking] = useState(false);
  const [panicAlert, setPanicAlert] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [showDischargePatient, setShowDischargePatient] = useState(false);
  const [dischargeCategory, setDischargeCategory] = useState(0);
  const [dischargeItems, setDischargeItems] = useState({ diet: [], medications: [], activity: [], followup: [], warnings: [] });
  const [dischargeInputText, setDischargeInputText] = useState('');
  const [dischargeInputLoading, setDischargeInputLoading] = useState(false);
  const [dischargeSpeaking, setDischargeSpeaking] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(null);
  const [showProviderLangConfirm, setShowProviderLangConfirm] = useState(false);
  const [pendingProviderLang, setPendingProviderLang] = useState(null);

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
    const t = setTimeout(() => setSplashReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setTwoDeviceJoinCode(joinCode.toUpperCase());
      setShowTwoDeviceSetup(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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
    return () => { if (ablyRef.current) ablyRef.current.close(); };
  }, []);

  const disconnectAbly = useCallback(() => {
    if (ablyChannelRef.current) { ablyChannelRef.current.unsubscribe(); ablyChannelRef.current = null; }
    if (ablyRef.current) { ablyRef.current.close(); ablyRef.current = null; }
    setTwoDeviceConnected(false);
    setTwoDeviceMode(false);
    setTwoDeviceRole(null);
    setTwoDeviceCode('');
    setTwoDeviceStatus('');
  }, []);

  const connectAbly = useCallback((code, role) => {
    if (ablyRef.current) { ablyRef.current.close(); ablyRef.current = null; ablyChannelRef.current = null; }
    const client = new Ably.Realtime({ key: ABLY_API_KEY });
    ablyRef.current = client;
    client.connection.on('connected', () => { setTwoDeviceStatus('Connected'); setTwoDeviceConnected(true); });
    client.connection.on('disconnected', () => { setTwoDeviceStatus('Disconnected'); setTwoDeviceConnected(false); });
    client.connection.on('failed', () => { setTwoDeviceStatus('Connection failed'); setTwoDeviceConnected(false); });
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
      const speakLang = role === 'provider' ? selectedProviderLang.voice : selectedLang.voice;
      const utterance = new SpeechSynthesisUtterance(speakText);
      utterance.lang = speakLang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    });
    channel.subscribe('end-session', () => { disconnectAbly(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLang, selectedProviderLang, disconnectAbly]);

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
    if (ablyChannelRef.current) ablyChannelRef.current.publish('end-session', {});
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
    if (showOnboarding) { setTimeout(() => speakOnboarding(), 400); }
    else { window.speechSynthesis.cancel(); setIsSpeakingOnboarding(false); }
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
    if (showMedPatient && medInstructions.length > 0) { setTimeout(() => speakMedInstructions(medInstructions), 400); }
    else if (!showMedPatient) { window.speechSynthesis.cancel(); setMedIsSpeaking(false); }
  }, [showMedPatient, speakMedInstructions, medInstructions]);

  const getSupportedMimeType = () => {
    const types = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const type of types) { if (MediaRecorder.isTypeSupported(type)) return type; }
    return '';
  };

  const buildSystemPrompt = (sourceLang, targetLang) => {
    const base = `You are a certified medical interpreter specializing in clinical communication.

Your rules:
- Translate from ${sourceLang} to ${targetLang}
- Use formal clinical register appropriate for a hospital or clinic setting
- Preserve all medical terminology, anatomical terms, medication names, and dosages exactly
- Preserve numbers, measurements, and units exactly
- Do not add explanations, clarifications, or commentary
- Do not soften or rephrase symptoms -- translate them as stated
- If a term has no direct equivalent, use the closest clinical term in the target language
- Return only the translated text, nothing else`;
    if (selectedSpecialty.prompt) return `${base}\n\nSpecialty context:\n${selectedSpecialty.prompt}`;
    return base;
  };

  const getSideLanguages = (side) => {
    const isProviderSide = side === 'provider' || (side === 'caregiver' && caregiverSpeaksProvider);
    if (isProviderSide) {
      return {
        sourceLang: selectedProviderLang.label,
        targetLang: selectedLang.label,
        targetVoice: selectedLang.voice,
        whisperLang: selectedProviderLang.whisper,
      };
    }
    return {
      sourceLang: selectedLang.label,
      targetLang: selectedProviderLang.label,
      targetVoice: selectedProviderLang.voice,
      whisperLang: selectedLang.whisper,
    };
  };

  const translateMedInstruction = async (text) => {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: `You are a certified medical interpreter. Translate the following medication instruction from ${selectedProviderLang.label} to ${selectedLang.label}. Use clear plain language. Preserve medication names, dosages, and timing exactly. Return only the translated text, nothing else.` },
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
          formData.append('language', selectedProviderLang.whisper);
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
      return `${speakerLabel}: ${m.original}\n-> (translated): ${m.translated}`;
    }).join('\n\n');
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: `You are a clinical documentation assistant. Given a bilingual clinical conversation transcript, generate a concise session summary in ${selectedProviderLang.label} for the healthcare provider.\n\nStructure with these sections if relevant:\n- Chief Complaint\n- Key Symptoms\n- Instructions Given\n- Follow-up Needed\n\nWrite in clear clinical language. Be brief. Return only the summary, no preamble.` },
            { role: 'user', content: `Specialty: ${selectedSpecialty.label}\nLanguages: ${selectedProviderLang.label} / ${selectedLang.label}\n\nTranscript:\n${transcriptLines}` },
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
      (viewSide === 'provider' && message.side === 'caregiver' && caregiverSpeaksProvider) ||
      (viewSide === 'patient' && message.side === 'caregiver' && !caregiverSpeaksProvider);
    const shownText = isSent ? message.original : (message.translated ?? '...');
    if (!shownText || shownText === '...') return;
    const { sourceLang, targetLang } = getSideLanguages(message.side);
    const shownLang = isSent ? sourceLang : targetLang;
    const backLang = shownLang === selectedProviderLang.label ? selectedLang.label : selectedProviderLang.label;
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
      setStatus('Microphone access denied. Please allow microphone in settings.');
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
      formData.append('response_format', 'verbose_json');
      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: formData,
      });
      if (!whisperRes.ok) { setStatus('Transcription failed. Please try again.'); return; }
      const whisperData = await whisperRes.json();
      const originalText = whisperData.text?.trim();
      if (!originalText) { setStatus('No speech detected. Hold longer and speak clearly.'); return; }
      const segments = whisperData.segments || [];
      let lowConfidence = false;
      if (segments.length > 0) {
        const avgNoSpeech = segments.reduce((sum, s) => sum + (s.no_speech_prob || 0), 0) / segments.length;
        const avgLogProb = segments.reduce((sum, s) => sum + (s.avg_logprob || 0), 0) / segments.length;
        lowConfidence = avgLogProb < -1.0 || avgNoSpeech > 0.5;
      }
      const messageId = Date.now();
      setMessages((prev) => [...prev, { id: messageId, side, original: originalText, translated: null, backTranslations: {}, dismissed: false, lowConfidence }]);
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
        ablyChannelRef.current.publish('translation', { fromRole: twoDeviceRole, messageId, side, original: originalText, translated: translatedText });
      }
      if (!twoDeviceMode) {
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = targetVoice; utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      } else {
        const speakText = twoDeviceRole === 'provider' ? translatedText : originalText;
        const speakLang = twoDeviceRole === 'provider' ? selectedLang.voice : selectedProviderLang.voice;
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
        body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: buildSystemPrompt(selectedProviderLang.label, selectedLang.label) }, { role: 'user', content: phrase.english }] }),
      });
      const translatedText = (await translateRes.json()).choices?.[0]?.message?.content?.trim();
      if (!translatedText) return;
      const messageId = Date.now();
      setMessages((prev) => [...prev, { id: messageId, side: 'provider', original: phrase.english, translated: translatedText, backTranslations: {}, dismissed: false }]);
      if (twoDeviceMode && ablyChannelRef.current && twoDeviceConnected) {
        ablyChannelRef.current.publish('translation', { fromRole: 'provider', messageId, side: 'provider', original: phrase.english, translated: translatedText });
      }
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = selectedLang.voice; utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      setShowPhrases(false);
    } catch (err) { console.error('Phrase translation error:', err); }
    finally { setTranslatingPhrase(null); }
  };

  const handlePanicButton = () => {
    setPanicAlert(true);
  };

  const handlePanicDismiss = () => { setPanicAlert(false); if (navigator.vibrate) navigator.vibrate(50); };

  const handleDischargeAdd = async () => {
    const text = dischargeInputText.trim();
    if (!text) return;
    const catKey = DISCHARGE_CATEGORIES[dischargeCategory].key;
    setDischargeInputLoading(true);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: `You are a certified medical interpreter. Translate the following discharge instruction from ${selectedProviderLang.label} to ${selectedLang.label}. Use clear plain language. Preserve medication names, dosages, timing, and measurements exactly. Return only the translated text, nothing else.` },
            { role: 'user', content: text },
          ],
        }),
      });
      const data = await res.json();
      const translated = data.choices?.[0]?.message?.content?.trim();
      if (translated) { setDischargeItems(prev => ({ ...prev, [catKey]: [...prev[catKey], { english: text, translated }] })); setDischargeInputText(''); }
    } catch (err) { console.error('Discharge translation error:', err); }
    finally { setDischargeInputLoading(false); }
  };

  const handleDischargeRemove = (catKey, index) => {
    setDischargeItems(prev => ({ ...prev, [catKey]: prev[catKey].filter((_, i) => i !== index) }));
  };

  const allDischargeItems = DISCHARGE_CATEGORIES.flatMap(cat => dischargeItems[cat.key].map(item => ({ ...item, cat })));

  const speakDischarge = (items) => {
    window.speechSynthesis.cancel();
    if (!items || items.length === 0) return;
    setDischargeSpeaking(true);
    let index = 0;
    const speakNext = () => {
      if (index >= items.length) { setDischargeSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(items[index].translated);
      u.lang = selectedLang.voice; u.rate = 0.85;
      u.onend = () => { index++; speakNext(); };
      u.onerror = () => setDischargeSpeaking(false);
      window.speechSynthesis.speak(u);
    };
    speakNext();
  };

  const handlePainLevelTap = (n) => {
    const spoken = `The patient reports a pain level of ${n} out of 10.`;
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = selectedProviderLang.voice;
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
      utterances.push({ text: `${v.labelEn}: ${val}${unit}`, lang: selectedProviderLang.voice });
    });
    let index = 0;
    const speakNext = () => {
      if (index >= utterances.length) { setVitalSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(utterances[index].text);
      u.lang = utterances[index].lang; u.rate = 0.85;
      u.onend = () => { index++; speakNext(); };
      u.onerror = () => setVitalSpeaking(false);
      window.speechSynthesis.speak(u);
    };
    speakNext();
  };

  const buildTranscript = () => {
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const lines = ['Verba Session Transcript', `Date: ${date} at ${time}`, `Languages: ${selectedProviderLang.label} / ${selectedLang.label}`, `Specialty: ${selectedSpecialty.label}`];
    if (caregiverMode) lines.push(`Caregiver mode: on`);
    if (twoDeviceMode) lines.push(`Two-device mode: on (session code: ${twoDeviceCode})`);
    if (sessionStartTime) lines.push(`Session duration: ${sessionElapsed}`);
    lines.push('', '---', '');
    const body = messages.filter((m) => m.translated).map((m) => {
      const speakerLabel = m.side === 'provider' ? 'Provider' : m.side === 'caregiver' ? 'Caregiver' : 'Patient';
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
    if (lang) { setSelectedLang(lang); clearSession(); setShowPatientIntroPrompt(true); }
  };

  const handleSpecialtyChange = (e) => {
    const specialty = SPECIALTIES.find(s => s.code === e.target.value);
    if (specialty) { setSelectedSpecialty(specialty); clearSession(); }
  };

  const handleProviderLangChange = (code) => {
    const lang = PROVIDER_LANGUAGES.find(l => l.code === code);
    if (!lang || lang.code === selectedProviderLang.code) return;
    if (messages.length > 0) {
      setPendingProviderLang(lang);
      setShowProviderLangConfirm(true);
    } else {
      setSelectedProviderLang(lang);
    }
  };

  const confirmProviderLangChange = () => {
    if (pendingProviderLang) {
      setSelectedProviderLang(pendingProviderLang);
      clearSession();
      setPendingProviderLang(null);
    }
    setShowProviderLangConfirm(false);
  };

  const handleBeginSession = () => {
    const utterance = new SpeechSynthesisUtterance(' ');
    utterance.volume = 0;
    window.speechSynthesis.speak(utterance);
    setAudioUnlocked(true);
  };

  const patientLabel = PATIENT_LABELS[selectedLang.code];
  const patientBtn = PATIENT_BUTTONS[selectedLang.code];
  const onboarding = PATIENT_ONBOARDING[selectedLang.code];

  const renderMessages = (viewSide, ref) => (
    <div className="messages" ref={ref}>
      {messages.length === 0 && (
        <div className="messages-empty">
          <span className="messages-empty-icon">🎙</span>
          <span className="messages-empty-text">Hold the button to start</span>
        </div>
      )}
      {messages.map((m) => {
        const key = `${m.id}-${viewSide}`;
        const isSent =
          m.side === viewSide ||
          (viewSide === 'provider' && m.side === 'caregiver' && caregiverSpeaksProvider) ||
          (viewSide === 'patient' && m.side === 'caregiver' && !caregiverSpeaksProvider);
        const shownText = isSent ? m.original : (m.translated ?? null);
        const backText = expandedMessages[key];
        const isExpanded = !!backText;
        const isPending = !m.translated && !isSent;
        return (
          <div
            key={m.id}
            className={`message ${isSent ? 'sent' : 'received'} ${isExpanded ? 'expanded' : ''} ${m.side === 'caregiver' ? 'caregiver-message' : ''} ${m.dismissed ? 'dismissed' : ''} message-enter`}
            onClick={() => !m.dismissed && m.translated && handleBubbleTap(m, viewSide)}
            onTouchStart={(e) => handleSwipeStart(e, m.id)}
            onTouchEnd={(e) => handleSwipeEnd(e, m.id)}
          >
            {m.side === 'caregiver' && <span className="caregiver-tag">Caregiver</span>}
            {m.dismissed && <span className="dismissed-tag">Dismissed</span>}
            {m.lowConfidence && isSent && !m.dismissed && (
              <span className="confidence-warning">Low confidence -- verify</span>
            )}
            {isPending ? (
              <span className="typing-indicator"><span /><span /><span /></span>
            ) : (
              <span className="original">{shownText}</span>
            )}
            {isExpanded && !m.dismissed && <span className="back-translation">{backText === 'loading' ? 'Verifying...' : `-> ${backText}`}</span>}
          </div>
        );
      })}
    </div>
  );

  const renderWalkthrough = () => {
    const isLastSlide = walkthroughStep === WALKTHROUGH_SLIDES.length - 1;
    const slide = WALKTHROUGH_SLIDES[walkthroughStep];
    const progress = ((walkthroughStep + 1) / WALKTHROUGH_SLIDES.length) * 100;
    return (
      <div className="walkthrough-overlay">
        <div className="walkthrough-card">
          <div className="walkthrough-progress-bar">
            <div className="walkthrough-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <button className="walkthrough-skip" onClick={handleBeginSession}>Skip</button>
          <div className="walkthrough-icon">{slide.icon}</div>
          <h2 className="walkthrough-title">{slide.title}</h2>
          <p className="walkthrough-body">{slide.body}</p>
          {slide.hint && <p className="walkthrough-hint">{slide.hint}</p>}
          <div className="walkthrough-dots">
            {WALKTHROUGH_SLIDES.map((_, i) => (
              <span key={i} className={`walkthrough-dot ${i === walkthroughStep ? 'active' : i < walkthroughStep ? 'done' : ''}`} />
            ))}
          </div>
          <div className="walkthrough-actions">
            {walkthroughStep > 0 && (
              <button className="walkthrough-back" onClick={() => setWalkthroughStep(s => s - 1)}>Back</button>
            )}
            {isLastSlide ? (
              <button className="walkthrough-begin" onClick={handleBeginSession}>Begin Session</button>
            ) : (
              <button className="walkthrough-next" onClick={() => setWalkthroughStep(s => s + 1)}>Next</button>
            )}
          </div>
        </div>
      </div>
    );
  };

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
              <button className="splash-btn" onClick={handleBeginSession}>Begin Session</button>
            </div>
          </div>
        )}
        <div className="two-device-bar">
          <span className="two-device-code">{twoDeviceConnected ? '🟢' : '🔴'} {twoDeviceCode}</span>
          <span className="two-device-role">{isProvider ? selectedProviderLang.label : selectedLang.label}</span>
          <button className="two-device-end" onClick={handleEndTwoDeviceSession}>End</button>
        </div>
        <div className={`side ${isProvider ? 'provider' : 'patient'} two-device-full ${activeSide && isListening ? 'active' : ''}`} style={{ flex: 1, transform: 'none' }}>
          <div className="side-label">
            {isProvider ? (
              <>
                <span className="side-label-role">Provider</span>
                <span className="side-label-sep">·</span>
                <span className="side-label-lang">{selectedProviderLang.label}</span>
                {selectedSpecialty.code !== 'general' && <span className="specialty-badge">{selectedSpecialty.label}</span>}
              </>
            ) : patientLabel}
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

  return (
    <div className="app">

      {!audioUnlocked && walkthroughStep === null && (
        <div className="splash-overlay">
          <div className={`splash-content ${splashReady ? 'splash-ready' : ''}`}>
            <div className="splash-logo">
              <span className="splash-logo-icon">🌐</span>
              <h1 className="splash-logo-name">Verba</h1>
            </div>
            <p className="splash-tagline">Real-time voice translation<br />for clinical care</p>
            <div className="splash-langs">
              {['ES','DE','FR','IT','PT','PL','NL','RU','AR','ZH','HI','KO','VI','TR','FA','UK','粵','EL','SV','DA','NO','FI','RO','HR','CS','SK','BG','HU'].map((lang, i) => (
                <span key={lang} className="splash-lang-badge" style={{ animationDelay: `${i * 50}ms` }}>{lang}</span>
              ))}
            </div>
            <button className="splash-btn" onClick={() => setWalkthroughStep(0)}>Get Started</button>
            <button className="splash-skip-guide" onClick={handleBeginSession}>Skip guide and begin</button>
            <p className="splash-privacy">Conversations are private and never stored</p>
          </div>
        </div>
      )}

      {!audioUnlocked && walkthroughStep !== null && renderWalkthrough()}

      {showProviderLangConfirm && (
        <div className="phrases-overlay" onClick={() => setShowProviderLangConfirm(false)}>
          <div className="phrases-panel export-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Change Provider Language?</span>
              <button className="phrases-close" onClick={() => { setShowProviderLangConfirm(false); setPendingProviderLang(null); }}>✕</button>
            </div>
            <p className="export-desc">Changing the provider language will clear the current session. This cannot be undone.</p>
            <button className="export-action-btn" onClick={confirmProviderLangChange}>Continue and clear session</button>
            <button className="export-action-btn share" onClick={() => { setShowProviderLangConfirm(false); setPendingProviderLang(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {offlineActive && (
        <div className="offline-banner" onClick={() => setShowPhrases(true)} style={{ cursor: 'pointer' }}>
          {isOffline ? 'No connection -- ' : 'Offline mode -- '}
          Voice unavailable. <span style={{ textDecoration: 'underline' }}>Open Quick Phrases</span>
          {!isOffline && (
            <button className="offline-banner-dismiss" onClick={(e) => { e.stopPropagation(); setOfflineManual(false); }}>Go online</button>
          )}
        </div>
      )}

      <div className={`side provider ${activeSide === 'provider' && isListening ? 'active' : ''}`}>
        <div className="side-label">
          <span className="side-label-role">Provider</span>
          <span className="side-label-sep">·</span>
          <span className="side-label-lang">{selectedProviderLang.label}</span>
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
        <div className="divider-center">
          {status && <span className="status">{status}</span>}
          {sessionStartTime && !status && <span className="session-timer">{sessionElapsed}</span>}
        </div>
        <div className="divider-actions">
          <select
            className="divider-lang-select"
            value={selectedProviderLang.code}
            onChange={(e) => handleProviderLangChange(e.target.value)}
            title="Provider language"
          >
            {PROVIDER_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
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
              {offlineActive ? 'Voice unavailable offline' : (activeSide === 'caregiver' && isListening ? 'Listening...' : 'Caregiver -- Hold to Speak')}
            </button>
            <div className="caregiver-lang-toggle">
              <span className="caregiver-lang-label">Caregiver speaks</span>
              <button className={`caregiver-lang-btn ${caregiverSpeaksProvider ? 'active' : ''}`} onClick={() => setCaregiverSpeaksProvider(true)}>{selectedProviderLang.label}</button>
              <button className={`caregiver-lang-btn ${!caregiverSpeaksProvider ? 'active' : ''}`} onClick={() => setCaregiverSpeaksProvider(false)}>{selectedLang.label}</button>
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
        <div className="side-label">
          <span className="side-label-role">Patient</span>
          <span className="side-label-sep">·</span>
          <span className="side-label-lang">{selectedLang.label}</span>
        </div>
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

      {showPatientIntroPrompt && (
        <div className="phrases-overlay" onClick={() => setShowPatientIntroPrompt(false)}>
          <div className="panic-box" onClick={(e) => e.stopPropagation()}>
            <div className="panic-icon">👋</div>
            <p className="panic-title">Show Patient Introduction?</p>
            <p className="panic-sub">Display a welcome message to your patient in {selectedLang.label}.</p>
            <button className="panic-dismiss" style={{ background: '#2E5FAC', color: '#fff', marginBottom: 8 }} onClick={() => { setShowPatientIntroPrompt(false); setShowOnboarding(true); }}>Show Introduction</button>
            <button className="panic-dismiss" onClick={() => setShowPatientIntroPrompt(false)}>Skip</button>
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
              <span className="settings-label">Provider language</span>
              <select className="settings-select" value={selectedProviderLang.code} onChange={(e) => handleProviderLangChange(e.target.value)}>
                {PROVIDER_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
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
            <p className="settings-section-label">Clinical Tools</p>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowPhrases(true); }}>Quick Phrases</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowPainScale(true); }}>Pain Scale</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowVitalSigns(true); }}>Vital Signs</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowOnboarding(true); }}>Patient Intro</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowMedInstructions(true); }}>Medication Instructions</button>
            <button className="settings-action-btn" onClick={() => { setShowSettings(false); setShowDischarge(true); }}>Discharge Instructions</button>
            <div className="settings-divider" />
            <p className="settings-section-label">Connection</p>
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
            <p className="two-device-section-label">Provider -- Start a session</p>
            <button className="export-action-btn" onClick={handleStartTwoDeviceAsProvider}>Generate Session Code</button>
            <div className="settings-divider" />
            <p className="two-device-section-label">Patient -- Join a session</p>
            <div className="med-input-row">
              <input className="med-input" type="text" placeholder="Enter code e.g. HAWK-4291" value={twoDeviceJoinCode} onChange={(e) => setTwoDeviceJoinCode(e.target.value.toUpperCase())} maxLength={9} />
              <button className="med-input-add" onClick={handleJoinTwoDeviceAsPatient} disabled={!twoDeviceJoinCode.trim()}>Join</button>
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
                <button key={cat.category} className={`phrases-tab ${activeCategory === i ? 'active' : ''}`} onClick={() => setActiveCategory(i)}>{cat.category}</button>
              ))}
            </div>
            <div className="phrases-list">
              {PHRASE_CATEGORIES[activeCategory].phrases.map((phrase) => (
                <button key={phrase.english} className={`phrase-item ${translatingPhrase === phrase.english ? 'loading' : ''}`} onClick={() => handlePhraseTap(phrase)} disabled={translatingPhrase !== null}>
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
        <div className="phrases-overlay patient-side-overlay" onClick={() => setShowPainScale(false)}>
          <div className="pain-scale-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Pain Scale</span>
              <button className="phrases-close" onClick={() => setShowPainScale(false)}>✕</button>
            </div>
            <p className="pain-scale-instruction">Ask the patient to tap their pain level.</p>
            <div className="pain-scale-grid-top">
              {PAIN_LEVELS.slice(0, 3).map(({ n, face, label, color }) => (
                <button key={n} className="pain-btn" style={{ '--pain-color': color }} onClick={() => handlePainLevelTap(n)}>
                  <span className="pain-face">{face}</span>
                  <span className="pain-number" style={{ color }}>{n}</span>
                  <span className="pain-label">{label}</span>
                </button>
              ))}
            </div>
            <div className="pain-scale-grid-bottom">
              {PAIN_LEVELS.slice(3).map(({ n, face, label, color }) => (
                <button key={n} className="pain-btn" style={{ '--pain-color': color }} onClick={() => handlePainLevelTap(n)}>
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
                  <input className="vitals-input" type="text" placeholder={v.placeholder} value={vitalValues[v.key]} onChange={(e) => setVitalValues(prev => ({ ...prev, [v.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <button className="export-action-btn" onClick={handleShowVitalPatient} disabled={!VITAL_SIGNS.some(v => vitalValues[v.key].trim())}>Show Patient →</button>
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
                <span className="vitals-patient-value">{vitalValues[v.key].trim()}{v.unit ? ` ${v.unit}` : ''}</span>
              </div>
            ))}
          </div>
          <div className="med-patient-actions">
            <button className="med-patient-repeat" onClick={() => speakVitals(VITAL_SIGNS.filter(v => vitalValues[v.key].trim()))} disabled={vitalSpeaking}>
              {vitalSpeaking ? '🔊 Reading...' : '🔊 Repeat'}
            </button>
            <button className="med-patient-done" onClick={() => { setShowVitalPatient(false); setShowVitalSigns(true); window.speechSynthesis.cancel(); }}>Back</button>
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
              <input className="med-input" type="text" placeholder="Type an instruction..." value={medInputText} onChange={(e) => setMedInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleMedAddText(); }} disabled={medInputLoading || medIsRecording} />
              <button className="med-input-add" onClick={handleMedAddText} disabled={medInputLoading || medIsRecording || !medInputText.trim()}>{medInputLoading ? '...' : 'Add'}</button>
              <button className={`med-mic-btn ${medIsRecording ? 'recording' : ''}`} onMouseDown={handleMedStartRecording} onMouseUp={handleMedStopRecording} onTouchStart={(e) => { e.preventDefault(); handleMedStartRecording(); }} onTouchEnd={(e) => { e.preventDefault(); handleMedStopRecording(); }} disabled={medInputLoading}>
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
              <button className="export-action-btn" onClick={() => { setShowMedInstructions(false); setShowMedPatient(true); }}>Show Patient →</button>
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
            <button className="med-patient-repeat" onClick={() => speakMedInstructions(medInstructions)} disabled={medIsSpeaking}>{medIsSpeaking ? '🔊 Reading...' : '🔊 Repeat'}</button>
            <button className="med-patient-done" onClick={() => { setShowMedPatient(false); setShowMedInstructions(true); }}>Back</button>
            <button className="med-patient-close" onClick={() => { setShowMedPatient(false); window.speechSynthesis.cancel(); }}>Done</button>
          </div>
        </div>
      )}

      {showDischarge && (
        <div className="phrases-overlay" onClick={() => setShowDischarge(false)}>
          <div className="phrases-panel discharge-panel" onClick={(e) => e.stopPropagation()}>
            <div className="phrases-header">
              <span className="phrases-title">Discharge Instructions</span>
              <button className="phrases-close" onClick={() => setShowDischarge(false)}>✕</button>
            </div>
            <div className="phrases-tabs">
              {DISCHARGE_CATEGORIES.map((cat, i) => (
                <button key={cat.key} className={`phrases-tab ${dischargeCategory === i ? 'active' : ''}`} onClick={() => { setDischargeCategory(i); setDischargeInputText(''); }}>
                  {cat.icon} {cat.label}
                  {dischargeItems[cat.key].length > 0 && <span className="discharge-tab-count">{dischargeItems[cat.key].length}</span>}
                </button>
              ))}
            </div>
            <div className="med-input-row">
              <input className="med-input" type="text" placeholder={DISCHARGE_CATEGORIES[dischargeCategory].placeholder} value={dischargeInputText} onChange={(e) => setDischargeInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleDischargeAdd(); }} disabled={dischargeInputLoading} />
              <button className="med-input-add" onClick={handleDischargeAdd} disabled={dischargeInputLoading || !dischargeInputText.trim()}>{dischargeInputLoading ? '...' : 'Add'}</button>
            </div>
            {dischargeItems[DISCHARGE_CATEGORIES[dischargeCategory].key].length > 0 && (
              <div className="med-list">
                {dischargeItems[DISCHARGE_CATEGORIES[dischargeCategory].key].map((item, i) => (
                  <div key={i} className="med-item">
                    <div className="med-item-content">
                      <span className="med-item-english">{item.english}</span>
                      <span className="med-item-translated">{item.translated}</span>
                    </div>
                    <button className="med-item-remove" onClick={() => handleDischargeRemove(DISCHARGE_CATEGORIES[dischargeCategory].key, i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            {allDischargeItems.length > 0 && (
              <button className="export-action-btn" onClick={() => { setShowDischarge(false); setShowDischargePatient(true); setTimeout(() => speakDischarge(allDischargeItems), 400); }}>Show Patient →</button>
            )}
          </div>
        </div>
      )}

      {showDischargePatient && (
        <div className="med-patient-overlay">
          <div className="med-patient-header">
            <span className="med-patient-title">📋 {selectedLang.label}</span>
          </div>
          <div className="med-patient-list">
            {DISCHARGE_CATEGORIES.filter(cat => dischargeItems[cat.key].length > 0).map(cat => (
              <div key={cat.key}>
                <div className="discharge-patient-category">
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
                {dischargeItems[cat.key].map((item, i) => (
                  <div key={i} className="med-patient-item discharge-patient-item">
                    <span className="med-patient-text">{item.translated}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="med-patient-actions">
            <button className="med-patient-repeat" onClick={() => speakDischarge(allDischargeItems)} disabled={dischargeSpeaking}>{dischargeSpeaking ? '🔊 Reading...' : '🔊 Repeat'}</button>
            <button className="med-patient-done" onClick={() => { setShowDischargePatient(false); setShowDischarge(true); window.speechSynthesis.cancel(); }}>Back</button>
            <button className="med-patient-close" onClick={() => { setShowDischargePatient(false); window.speechSynthesis.cancel(); setDischargeItems({ diet: [], medications: [], activity: [], followup: [], warnings: [] }); }}>Done</button>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [activeSide, setActiveSide] = useState(null);
  const [status, setStatus] = useState('');
  const transcriptRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

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

      // Request data every 250ms for iOS compatibility
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
      formData.append('language', side === 'provider' ? 'en' : 'es');

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
      console.log('Whisper response:', whisperData);

      const originalText = whisperData.text?.trim();
      if (!originalText) {
        setStatus('No speech detected. Hold longer and speak clearly.');
        return;
      }

      const sourceLang = side === 'provider' ? 'English' : 'Spanish';
      const targetLang = side === 'provider' ? 'Spanish' : 'English';

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
              content: `You are a medical interpreter. Translate the following from ${sourceLang} to ${targetLang}. Preserve medical terminology accurately. Return only the translation, nothing else.`,
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

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          side,
          original: originalText,
          translated: translatedText,
        },
      ]);

      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = side === 'provider' ? 'es-ES' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

      setStatus('');

    } catch (err) {
      console.error('Process error:', err);
      setStatus('Something went wrong. Please try again.');
    }
  };

  const clearSession = () => {
    setMessages([]);
    setStatus('');
  };

  return (
    <div className="app">

      {/* Provider side (top) */}
      <div className={`side provider ${activeSide === 'provider' && isListening ? 'active' : ''}`}>
        <div className="side-label">Healthcare Provider — English</div>
        <div className="messages" ref={transcriptRef}>
          {messages
            .filter((m) => m.side === 'provider')
            .map((m) => (
              <div key={m.id} className="message">
                <span className="original">{m.original}</span>
                <span className="translated">→ {m.translated}</span>
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
        {status ? <span className="status">{status}</span> : null}
        {messages.length > 0 && (
          <button className="clear-btn" onClick={clearSession}>Clear session</button>
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
          {activeSide === 'patient' && isListening ? 'Escuchando...' : 'Mantén para hablar'}
        </button>
        <div className="messages patient-messages">
          {messages
            .filter((m) => m.side === 'patient')
            .map((m) => (
              <div key={m.id} className="message">
                <span className="original">{m.original}</span>
                <span className="translated">→ {m.translated}</span>
              </div>
            ))}
        </div>
        <div className="side-label">Paciente — Español</div>
      </div>

    </div>
  );
}

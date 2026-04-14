import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

export default function App() {
  const [messages, setMessages] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [activeSide, setActiveSide] = useState(null); // 'provider' or 'patient'
  const [status, setStatus] = useState('');
  const transcriptRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  const startListening = async (side) => {
    if (isListening) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      setActiveSide(side);
      setStatus('Listening...');
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setStatus('Translating...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob, side);
      };

      mediaRecorder.start();
    } catch (err) {
      setStatus('Microphone access denied.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
      setActiveSide(null);
    }
  };

  const processAudio = async (audioBlob, side) => {
    try {
      // Step 1: Transcribe with Whisper
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: formData,
      });

      const whisperData = await whisperRes.json();
      const originalText = whisperData.text?.trim();
      if (!originalText) {
        setStatus('No speech detected. Try again.');
        return;
      }

      // Step 2: Translate with Claude via OpenAI-compatible prompt
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
              content: `You are a medical interpreter. Translate the following from ${sourceLang} to ${targetLang}. 
              Preserve medical terminology accurately. Return only the translation, nothing else.`,
            },
            { role: 'user', content: originalText },
          ],
        }),
      });

      const translateData = await translateRes.json();
      const translatedText = translateData.choices?.[0]?.message?.content?.trim();

      if (!translatedText) {
        setStatus('Translation failed. Try again.');
        return;
      }

      // Step 3: Add to transcript
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          side,
          original: originalText,
          translated: translatedText,
        },
      ]);

      // Step 4: Speak the translation aloud
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = side === 'provider' ? 'es-ES' : 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);

      setStatus('');
    } catch (err) {
      console.error(err);
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
        <div className="messages" ref={null}>
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

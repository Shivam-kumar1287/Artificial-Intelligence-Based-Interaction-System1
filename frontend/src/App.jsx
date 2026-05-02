import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Send, Mic, MicOff, Volume2, Settings, User, Bot, Sparkles, Hand, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io('http://localhost:5000');

function App() {
  const [messages, setMessages] = useState([
    { text: "Hello! I am your AI assistant. I can understand text and voice. How can I help you today?", sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [volume, setVolume] = useState(1);
  const [spokenRange, setSpokenRange] = useState({ start: 0, length: 0 });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Speech Recognition Setup
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setInputText(finalTranscript);
          handleSendMessage(finalTranscript, 'voice');
        } else if (interimTranscript) {
          setInputText(interimTranscript);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          console.warn('Speech Recognition: No speech detected.');
        } else if (event.error === 'network') {
          console.error('Speech Recognition: Network Error. Attempting auto-retry...');
          // Auto-retry once for network errors
          setTimeout(() => {
            if (isListeningRef.current) {
              try { recognition.start(); } catch (e) { }
            }
          }, 1000);
        } else {
          console.error('Speech Recognition Error:', event.error);
        }

        if (event.error !== 'network') {
          setIsListening(false);
        }

        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please enable it in browser settings.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const isSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);

      // Auto-speak if global toggle is ON OR if the last user message was VOICE
      const lastMessage = messagesRef.current[messagesRef.current.length - 1];
      if (isSpeakingRef.current || (lastMessage && lastMessage.modality === 'voice')) {
        speak(data.text);
      }
    });

    socket.on('error', (data) => {
      setMessages(prev => [...prev, {
        text: `Error: ${data.message || 'Something went wrong. Please check your API limits.'}`,
        sender: 'ai',
        isError: true
      }]);
    });

    return () => {
      socket.off('receive_message');
      socket.off('error');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (text = inputText, modality = 'text') => {
    if (!text.trim()) return;

    const newMessage = { text, sender: 'user', timestamp: new Date(), modality };
    setMessages(prev => [...prev, newMessage]);
    socket.emit('send_message', { text, modality });
    setInputText('');
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please try Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const getBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      return voices.find(v => v.name.includes('Google US English') || v.lang === 'en-US') || voices[0];
    };

    const voice = getBestVoice();
    if (voice) {
      utterance.voice = voice;
    } else {
      // If voices aren't loaded yet, wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        utterance.voice = getBestVoice();
      };
    }

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => {
      setIsAiSpeaking(false);
      setSpokenRange({ start: 0, length: 0 });
    };
    utterance.onerror = () => {
      setIsAiSpeaking(false);
      setSpokenRange({ start: 0, length: 0 });
    };

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setSpokenRange({ start: event.charIndex, length: event.charLength });
      }
    };

    utterance.volume = volume;

    window.speechSynthesis.speak(utterance);
  };

  const renderTextWithHighlight = (text, isAi, isLast) => {
    if (!isAi || !isAiSpeaking || !isLast || spokenRange.length === 0) return text;

    const before = text.substring(0, spokenRange.start);
    const highlighted = text.substring(spokenRange.start, spokenRange.start + spokenRange.length);
    const after = text.substring(spokenRange.start + spokenRange.length);

    return (
      <span style={{ position: 'relative', display: 'inline', lineHeight: '2.2' }}>
        {before}
        <motion.span
          layoutId="activeWord"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: 1,
            scale: 1.1,
            backgroundColor: 'var(--primary)',
            boxShadow: '0 0 20px rgba(129, 140, 248, 0.6), 0 0 40px rgba(129, 140, 248, 0.2)'
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            display: 'inline-block',
            background: 'var(--accent-gradient)',
            borderRadius: '8px',
            padding: '4px 10px',
            color: '#fff',
            fontWeight: '800',
            margin: '0 4px',
            zIndex: 10,
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          {highlighted}
        </motion.span>
        {after}
      </span>
    );
  };

  return (
    <div className="app-container">
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 1rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/patrikaTalk.png" alt="Patrika Talk Logo" style={{ height: '48px', objectFit: 'contain' }} />
          <h1 style={{
            fontSize: '1.75rem',
            fontWeight: '800',
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            Interaction AI
          </h1>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>
          MERN
        </p>
      </header>

      <main className="glass-panel chat-window">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }}
            ></motion.div>
            <span style={{ fontWeight: '600', fontSize: '0.95rem', letterSpacing: '0.2px' }}>System Status: Online</span>
            {isSpeaking && (
              <span style={{ marginLeft: '1rem', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Volume2 size={14} /> VOICE MODE ACTIVE
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="icon-btn" title="Gesture Recognition (Coming Soon)">
              <Hand size={18} />
            </button>
            <button
              className={`icon-btn ${isSpeaking ? 'active' : ''}`}
              onClick={() => setIsSpeaking(!isSpeaking)}
              title="Toggle Voice Output"
              style={isSpeaking ? { background: 'var(--accent-gradient)', border: 'none' } : {}}
            >
              <Volume2 size={18} />
            </button>

            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100px' }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '0 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}
              >
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
              </motion.div>
            )}

            <button className="icon-btn" onClick={() => setIsDarkMode(!isDarkMode)} title="Toggle Theme">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-btn">
              <Settings size={18} />
            </button>
          </div>
        </div>

        <div className="messages-container">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={`message ${msg.sender}`}
                style={msg.isError ? {
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5'
                } : {}}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  opacity: 0.6
                }}>
                  {msg.sender === 'user' ? <User size={12} /> : <img src="/patrikaTalk.png" alt="Bot Logo" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />}
                  {msg.sender === 'user' ? 'You' : 'Interaction AI'}
                  {msg.sender === 'ai' && isAiSpeaking && idx === messages.length - 1 && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      style={{ color: 'var(--primary)', marginLeft: '4px' }}
                    >
                      <Volume2 size={12} />
                    </motion.div>
                  )}
                </div>
                <div style={{ fontSize: '1.05rem' }}>
                  {renderTextWithHighlight(msg.text, msg.sender === 'ai', idx === messages.length - 1)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <button
            className={`icon-btn ${isListening ? 'active' : ''}`}
            onClick={toggleListening}
            style={isListening ? { animation: 'pulse 1.5s infinite' } : {}}
          >
            {isListening ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <input
            type="text"
            className="input-field"
            placeholder={isListening ? "Listening with intent..." : "Describe what you need..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />

          <button className="icon-btn send" onClick={() => handleSendMessage()}>
            <Send size={20} style={{ marginRight: '4px' }} />
            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Send</span>
          </button>
        </div>
      </main>


    </div>
  );
}

export default App;

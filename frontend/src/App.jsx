import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { Send, Mic, MicOff, Volume2, Settings, User, Bot, Sparkles, Hand } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io('http://localhost:5000');

function App() {
  const [messages, setMessages] = useState([
    { text: "Hello! I am your AI assistant. I can understand text and voice. How can I help you today?", sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);

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
          handleSendMessage(finalTranscript);
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
              try { recognition.start(); } catch(e) {}
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

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, data]);
      if (isSpeakingRef.current) {
        speak(data.text);
      }
    });

    return () => socket.off('receive_message');
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (text = inputText) => {
    if (!text.trim()) return;

    const newMessage = { text, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    socket.emit('send_message', { text, modality: 'text' });
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
    if (!window.speechSynthesis) {
      console.error("Speech synthesis not supported in this browser.");
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set natural sounding voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name.includes('Google US English') || v.lang === 'en-US') || voices[0];
    if (voice) utterance.voice = voice;
    
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="app-container">
      <header style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', background: 'linear-gradient(to right, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Sparkles size={32} color="#818cf8" /> Interaction AI
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Multi-modal, Context-aware, Personalized</p>
      </header>

      <main className="glass-panel chat-window">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></div>
            <span style={{ fontWeight: '600' }}>AI System Online</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="icon-btn" title="Gesture Recognition (Coming Soon)">
              <Hand size={20} />
            </button>
            <button className={`icon-btn ${isSpeaking ? 'send' : ''}`} onClick={() => setIsSpeaking(!isSpeaking)} title="Toggle Voice Output">
              <Volume2 size={20} />
            </button>
            <button className="icon-btn">
              <Settings size={20} />
            </button>
          </div>
        </div>

        <div className="messages-container">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`message ${msg.sender}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.75rem', opacity: 0.7 }}>
                  {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                  {msg.sender === 'user' ? 'You' : 'Interaction AI'}
                </div>
                {msg.text}
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
            {isListening ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <input
            type="text"
            className="input-field"
            placeholder={isListening ? "Listening..." : "Type your message..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />

          <button className="icon-btn send" onClick={() => handleSendMessage()}>
            <Send size={24} />
          </button>
        </div>
      </main>

      <footer style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        Adaptive AI Interface &copy; 2026 | Built with MERN
      </footer>
    </div>
  );
}

export default App;

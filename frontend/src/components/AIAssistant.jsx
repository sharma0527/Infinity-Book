import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Mic, Send, X, Minimize2, Sparkles, Cpu } from 'lucide-react';
import './AIAssistant.css';

export default function AIAssistant({ forceHideOrb }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "Hello! I am Infinity AI, your intelligent copilot. How can I assist you with your ideas today?" }
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-assistant', handleOpen);
    return () => window.removeEventListener('open-ai-assistant', handleOpen);
  }, []);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMsg = { id: Date.now(), sender: 'user', text: inputMessage };
    setMessages(prev => [...prev, newMsg]);
    setInputMessage("");
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev, 
        { id: Date.now() + 1, sender: 'ai', text: "I can help you organize your thoughts, search your infinite notebook, or generate new ideas. What would you like to explore?" }
      ]);
    }, 1500);
  };

  if (!isOpen) {
    if (forceHideOrb) return null;
    return (
      <button className="ai-orb" onClick={() => setIsOpen(true)}>
        <div className="orb-core">
          <Cpu size={24} color="#fff" />
        </div>
        <div className="orb-ring ring-1"></div>
        <div className="orb-ring ring-2"></div>
      </button>
    );
  }

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-title">
          <Sparkles size={18} color="#EC4899" />
          <span>Infinity AI</span>
        </div>
        <button className="ai-header-btn" onClick={() => setIsOpen(false)}>
          <Minimize2 size={18} color="#fff" />
        </button>
      </div>

      {/* Chat Area */}
      <div className="ai-chat-area">
        {messages.map(msg => (
          <div key={msg.id} className={`ai-message-wrapper ${msg.sender}`}>
            <div className={`ai-message ${msg.sender}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="ai-message-wrapper ai">
            <div className="ai-message ai typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-input-area">
        <input 
          type="text" 
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Infinity AI..."
          className="ai-input"
        />
        <div className="ai-input-actions">
          <button className="ai-icon-btn"><Mic size={20} color="#8a8a9a" /></button>
          <button className="ai-icon-btn send" onClick={handleSendMessage}><Send size={16} color="#fff" /></button>
        </div>
      </div>
    </div>
  );
}

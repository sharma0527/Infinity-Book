import React, { useState, useEffect } from "react";
import { Send, Type, PenTool, Edit2, Highlighter, Mic } from 'lucide-react';

const FONTS = [
  'Caveat', 'Dancing Script', 'Indie Flower', 
  'Shadows Into Light', 'Pacifico', 'Amatic SC', 
  'Satisfy', 'Permanent Marker', 'Kalam', 
  'Courgette', 'Just Another Hand', 'Patrick Hand'
];

const PEN_COLORS = ['#000000', '#1F51FF', '#FF3131', '#00BF63', '#9D4EDD', '#FF914D', '#FF66C4'];
const HIGHLIGHTER_COLORS = ['#FFEA00', '#FF3131', '#000000'];

export default function ChatBar({ 
  addText, 
  mode, setMode, 
  activeTool, setActiveTool, 
  activeColor, setActiveColor,
  activeFont, setActiveFont
}) {
  const [input, setInput] = useState("");
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  const send = () => {
    if (!input.trim()) return;
    addText(input);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') send();
  }

  const handleToolSelect = (tool, e) => {
    e.preventDefault(); // Prevent taking focus away from editable if user is typing
    if (mode === 'TEXT') {
        setShowFontMenu(true);
    }
    
    setActiveTool(tool);
    if (tool === 'pencil') setActiveColor('#4a4a5a');
    else if (tool === 'highlighter') setActiveColor('#FFEA00');
    else {
        if (activeColor === '#4a4a5a' || activeColor === '#FFEA00') setActiveColor('#000000');
    }
  };

  const handleFontSelect = (font, e) => {
    e.preventDefault();
    setActiveFont(font);
    setShowFontMenu(false);
  };

  const handleModeChange = (newMode, e) => {
    e.preventDefault();
    setMode(newMode);
    if (newMode === 'TEXT') {
      setShowFontMenu(true);
      if (activeTool === 'highlighter') {
         setActiveTool('pen'); 
         setActiveColor('#000000');
      }
    } else {
      setShowFontMenu(false);
    }
  };

  const handleColorSelect = (c, e) => {
    e.preventDefault();
    setActiveColor(c);
  }

  const toggleVoice = () => {
    if (!SpeechRec) {
      alert("Voice typing is not supported in this browser. Try Chrome or Edge!");
      return;
    }
    
    if (isListening) {
      // It auto-ends when it finishes hearing or if we forcefully abort, 
      // but standard SpeechRecognition.stop() handles stopping correctly.
      setIsListening(false);
    } else {
      const rec = new SpeechRec();
      rec.continuous = false; // single chunk dictation
      rec.interimResults = false;
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      
      rec.onresult = (e) => {
         const text = e.results[0][0].transcript;
         setInput(prev => prev + (prev ? " " : "") + text);
      };
      
      rec.start();
    }
  };

  let colorsToShow = [];
  if (activeTool === 'pen') colorsToShow = PEN_COLORS;
  if (activeTool === 'highlighter') colorsToShow = HIGHLIGHTER_COLORS;

  return (
    <div style={styles.floatingContainer}>
      
      {showFontMenu && mode === 'TEXT' && (
        <div style={styles.fontPickerWrapper}>
          <span style={styles.label}>Select your Handwriting:</span>
          <div style={styles.fontGrid}>
            {FONTS.map(f => (
              <button 
                key={f}
                onMouseDown={(e) => handleFontSelect(f, e)}
                style={{
                  ...styles.fontBtn,
                  fontFamily: `"${f}", cursive`,
                  background: activeFont === f ? '#e0f0ff' : 'transparent',
                  border: activeFont === f ? '1px solid #4a90e2' : '1px solid #ddd'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={styles.subBar}>
        <div style={styles.toolGroup}>
          <button 
            onMouseDown={(e) => handleToolSelect('pen', e)} 
            style={{...styles.iconBtn, background: activeTool === 'pen' ? '#ddd' : 'transparent'}}
            title={mode === 'TEXT' ? "Pen Text" : "Pen"}
          >
            <PenTool size={16} color="#333" />
            {mode === 'TEXT' && <span style={styles.toolLabel}>Text Pen</span>}
          </button>
          
          <button 
            onMouseDown={(e) => handleToolSelect('pencil', e)} 
            style={{...styles.iconBtn, background: activeTool === 'pencil' ? '#ddd' : 'transparent'}}
            title={mode === 'TEXT' ? "Pencil Text" : "Pencil"}
          >
            <Edit2 size={16} color="#333" />
            {mode === 'TEXT' && <span style={styles.toolLabel}>Graphite Text</span>}
          </button>

          {mode === 'PEN' && (
            <button 
              onMouseDown={(e) => handleToolSelect('highlighter', e)} 
              style={{...styles.iconBtn, background: activeTool === 'highlighter' ? '#ddd' : 'transparent'}}
              title="Highlighter"
            >
              <Highlighter size={16} color="#333" />
            </button>
          )}
        </div>
        
        {colorsToShow.length > 0 && <div style={styles.divider} />}
        
        {colorsToShow.length > 0 && (
          <div style={styles.colorGroup}>
            {colorsToShow.map(c => (
              <button
                key={c}
                onMouseDown={(e) => handleColorSelect(c, e)}
                style={{
                  ...styles.colorSwatch,
                  backgroundColor: c,
                  border: activeColor === c ? '2px solid white' : '2px solid transparent',
                  boxShadow: activeColor === c ? '0 0 0 2px #333' : 'none'
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={styles.modeToggle}>
        <button 
          onMouseDown={(e) => handleModeChange('TEXT', e)}
          style={{...styles.toggleBtn, background: mode === 'TEXT' ? '#4a90e2' : 'transparent', color: mode === 'TEXT' ? 'white' : '#666' }}
        >
          <Type size={18} />
          <span style={styles.toggleText}>Text Mode</span>
        </button>
        <button 
          onMouseDown={(e) => handleModeChange('PEN', e)}
          style={{...styles.toggleBtn, background: mode === 'PEN' ? '#4a90e2' : 'transparent', color: mode === 'PEN' ? 'white' : '#666' }}
        >
          <PenTool size={18} />
          <span style={styles.toggleText}>Draw Mode</span>
        </button>
      </div>

      <div style={styles.bar}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={mode === 'TEXT' ? "Type to write on page..." : "Doodle directly with mouse/touch!"}
          style={styles.input}
          disabled={mode === 'PEN'} 
        />
        
        {/* VOICE TO TEXT TOGGLE */}
        <button 
          onClick={toggleVoice} 
          style={{
             ...styles.iconActionBtn, 
             background: isListening ? '#ffe0e0' : 'transparent',
             color: isListening ? '#e74c3c' : '#aaa'
          }} 
          disabled={mode === 'PEN'}
          title="Voice Typing"
        >
          <Mic size={20} className={isListening ? 'pulse' : ''} />
        </button>

        <button onClick={send} style={styles.btn} disabled={mode === 'PEN'}>
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  floatingContainer: {
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    zIndex: 100
  },
  fontPickerWrapper: {
    background: "rgba(255, 255, 255, 0.98)",
    padding: "15px",
    borderRadius: "16px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    width: "480px",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(0,0,0,0.05)",
    marginBottom: "5px"
  },
  fontGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    marginTop: "10px",
    maxHeight: "200px",
    overflowY: "auto",
    paddingRight: "5px"
  },
  fontBtn: {
    padding: "8px 4px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "all 0.1s",
    textShadow: "0 1px 1px rgba(0,0,0,0.05)"
  },
  label: {
    fontSize: "14px",
    color: "#444",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  subBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "8px 16px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
  },
  toolGroup: {
    display: "flex",
    gap: "8px"
  },
  colorGroup: {
    display: "flex",
    gap: "6px"
  },
  iconBtn: {
    padding: "6px 10px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "background 0.2s"
  },
  toolLabel: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#444"
  },
  divider: {
    width: "1px",
    height: "24px",
    background: "#ccc"
  },
  colorSwatch: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    cursor: "pointer",
    transition: "transform 0.1s"
  },
  modeToggle: {
    display: "flex",
    background: "rgba(255, 255, 255, 0.9)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "4px",
    boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
    border: "1px solid rgba(0,0,0,0.05)"
  },
  toggleBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "16px",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "system-ui, sans-serif",
    fontWeight: "500",
    fontSize: "14px"
  },
  bar: {
    width: "550px",
    display: "flex",
    background: "rgba(20, 20, 22, 0.8)",
    backdropFilter: "blur(15px)",
    padding: "10px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: "16px",
    outline: "none"
  },
  btn: {
    marginLeft: "10px",
    padding: "10px 15px",
    borderRadius: "10px",
    background: "#4a90e2",
    color: "white",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 0.2s"
  },
  iconActionBtn: {
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px",
    borderRadius: "10px",
    transition: "all 0.2s",
    marginRight: "5px"
  }
};

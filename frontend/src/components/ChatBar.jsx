import React, { useState, useEffect, useRef as useRefCB } from "react";
import { Send, Type, PenTool, Edit2, Highlighter, Mic, ImagePlus, Home, Settings } from 'lucide-react';
import Dock from './Dock';

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
  addImage,
  mode, setMode, 
  activeTool, setActiveTool, 
  activeColor, setActiveColor,
  activeFont, setActiveFont
}) {
  const [input, setInput] = useState("");
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const fileInputRef = useRefCB(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const insertImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (addImage) addImage(ev.target.result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) insertImageFile(file);
    e.target.value = '';
  };

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
    e.preventDefault();
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
      setIsListening(false);
    } else {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      
      rec.onresult = (e) => {
         const text = e.results[0][0].transcript;
         if (text.trim()) {
           addText(text);
         }
      };
      
      rec.start();
    }
  };

  let colorsToShow = [];
  if (activeTool === 'pen') colorsToShow = PEN_COLORS;
  if (activeTool === 'highlighter') colorsToShow = HIGHLIGHTER_COLORS;

  return (
    <div style={{
      position: "absolute",
      bottom: isMobile ? "10px" : "20px",
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: isMobile ? "6px" : "10px",
      zIndex: 100,
      width: isMobile ? "94vw" : "auto",
      boxSizing: "border-box"
    }}>
      
      {showFontMenu && mode === 'TEXT' && (
        <div style={{
          background: "rgba(255, 255, 255, 0.98)",
          padding: isMobile ? "10px" : "15px",
          borderRadius: "16px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          width: isMobile ? "92vw" : "480px",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(0,0,0,0.05)",
          marginBottom: "5px"
        }}>
          <span style={{
            fontSize: "12px",
            color: "#444",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            Select Handwriting:
          </span>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
            gap: isMobile ? "6px" : "8px",
            marginTop: "10px",
            maxHeight: "150px",
            overflowY: "auto",
            paddingRight: "5px"
          }}>
            {FONTS.map(f => (
              <button 
                key={f}
                onMouseDown={(e) => handleFontSelect(f, e)}
                style={{
                  padding: "8px 4px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: isMobile ? "14px" : "16px",
                  transition: "all 0.1s",
                  textShadow: "0 1px 1px rgba(0,0,0,0.05)",
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

      {/* SubBar (Tools & Colors) */}
      <div style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: isMobile ? "8px" : "12px",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: isMobile ? "6px 12px" : "8px 16px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        width: "100%",
        boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", gap: "6px" }}>
          <button 
            onMouseDown={(e) => handleToolSelect('pen', e)} 
            style={{
              padding: isMobile ? "5px 8px" : "6px 10px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s",
              background: activeTool === 'pen' ? '#ddd' : 'transparent'
            }}
            title={mode === 'TEXT' ? "Pen Text" : "Pen"}
          >
            <PenTool size={isMobile ? 14 : 16} color="#333" />
            {mode === 'TEXT' && <span style={{ fontSize: "11px", fontWeight: "bold", color: "#444" }}>Text Pen</span>}
          </button>
          
          <button 
            onMouseDown={(e) => handleToolSelect('pencil', e)} 
            style={{
              padding: isMobile ? "5px 8px" : "6px 10px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "background 0.2s",
              background: activeTool === 'pencil' ? '#ddd' : 'transparent'
            }}
            title={mode === 'TEXT' ? "Pencil Text" : "Pencil"}
          >
            <Edit2 size={isMobile ? 14 : 16} color="#333" />
            {mode === 'TEXT' && <span style={{ fontSize: "11px", fontWeight: "bold", color: "#444" }}>Graphite</span>}
          </button>

          {mode === 'PEN' && (
            <button 
              onMouseDown={(e) => handleToolSelect('highlighter', e)} 
              style={{
                padding: isMobile ? "5px 8px" : "6px 10px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background 0.2s",
                background: activeTool === 'highlighter' ? '#ddd' : 'transparent'
              }}
              title="Highlighter"
            >
              <Highlighter size={isMobile ? 14 : 16} color="#333" />
            </button>
          )}
        </div>
        
        {colorsToShow.length > 0 && <div style={{ width: "1px", height: "20px", background: "#ccc" }} />}
        
        {colorsToShow.length > 0 && (
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
            {colorsToShow.map(c => (
              <button
                key={c}
                onMouseDown={(e) => handleColorSelect(c, e)}
                style={{
                  width: isMobile ? "18px" : "22px",
                  height: isMobile ? "18px" : "22px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  transition: "transform 0.1s",
                  backgroundColor: c,
                  border: activeColor === c ? '2px solid white' : '2px solid transparent',
                  boxShadow: activeColor === c ? '0 0 0 2px #333' : 'none'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mode Selector */}
      <div style={{
        display: "flex",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "20px",
        padding: "4px",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        border: "1px solid rgba(0,0,0,0.05)",
        width: isMobile ? "100%" : "auto",
        justifyContent: "center",
        boxSizing: "border-box"
      }}>
        <button 
          onMouseDown={(e) => handleModeChange('TEXT', e)}
          style={{
            flex: isMobile ? 1 : 'none',
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: isMobile ? "6px 12px" : "8px 16px",
            borderRadius: "16px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "system-ui, sans-serif",
            fontWeight: "500",
            fontSize: isMobile ? "12px" : "14px",
            background: mode === 'TEXT' ? '#4a90e2' : 'transparent',
            color: mode === 'TEXT' ? 'white' : '#666'
          }}
        >
          <Type size={isMobile ? 16 : 18} />
          <span>Text Mode</span>
        </button>
        <button 
          onMouseDown={(e) => handleModeChange('PEN', e)}
          style={{
            flex: isMobile ? 1 : 'none',
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: isMobile ? "6px 12px" : "8px 16px",
            borderRadius: "16px",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            fontFamily: "system-ui, sans-serif",
            fontWeight: "500",
            fontSize: isMobile ? "12px" : "14px",
            background: mode === 'PEN' ? '#4a90e2' : 'transparent',
            color: mode === 'PEN' ? 'white' : '#666'
          }}
        >
          <PenTool size={isMobile ? 16 : 18} />
          <span>Draw Mode</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Dock */}
      <div style={{ width: "100%", overflowX: "auto", display: "flex", justifyContent: "center" }}>
        <Dock 
          items={[
            { icon: <Home size={isMobile ? 20 : 24} color="#fff" />, label: 'Home', onClick: () => window.location.href = '/' },
            { icon: <ImagePlus size={isMobile ? 20 : 24} color="#a78bfa" />, label: 'Image', onClick: () => fileInputRef.current?.click() },
            { icon: <Mic size={isMobile ? 20 : 24} color={isListening ? '#e74c3c' : '#fff'} className={isListening ? 'pulse' : ''} />, label: 'Dictation', onClick: toggleVoice },
            { icon: <Settings size={isMobile ? 20 : 24} color="#fff" />, label: 'Settings', onClick: () => alert('Settings!') },
          ]}
          panelHeight={isMobile ? 54 : 68}
          baseItemSize={isMobile ? 40 : 50}
          magnification={isMobile ? 56 : 70}
        />
      </div>
    </div>
  );
}

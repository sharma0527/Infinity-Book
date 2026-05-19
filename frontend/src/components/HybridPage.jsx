import React, { useState, useEffect } from 'react';
import EditablePage from './EditablePage';
import DrawingCanvas from './DrawingCanvas';

export default function HybridPage({ html, setHtml, strokes, setStrokes, mode, activeTool, activeColor, activeFont, isViewOnly }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageStyle = {
    position: "absolute",
    top: isMobile ? "75px" : "15%", // Adjust top offset so it sits beautifully below top bars on mobile
    left: "50%",
    transform: "translateX(-50%)",
    width: isMobile ? "92vw" : "480px",
    height: isMobile ? "68vh" : "600px",
    background: "#fdfcf7",
    boxShadow: "0 15px 35px rgba(0,0,0,0.25), inset 0 0 40px rgba(0,0,0,0.03)",
    borderRadius: "8px",
    overflow: "hidden",
    padding: isMobile ? "20px 16px" : "40px",
    boxSizing: "border-box"
  };

  return (
    <div style={pageStyle}>
      <EditablePage 
        html={html} 
        setHtml={setHtml} 
        isActiveMode={mode === 'TEXT' && !isViewOnly} 
        activeFont={activeFont}
        activeTool={activeTool}
        activeColor={activeColor}
      />
      <DrawingCanvas 
        strokes={strokes || []} 
        setStrokes={setStrokes} 
        isActiveMode={mode === 'PEN' && !isViewOnly} 
        activeTool={activeTool}
        activeColor={activeColor}
      />
    </div>
  );
}

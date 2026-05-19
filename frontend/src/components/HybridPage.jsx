import React from 'react';
import EditablePage from './EditablePage';
import DrawingCanvas from './DrawingCanvas';

export default function HybridPage({ html, setHtml, strokes, setStrokes, mode, activeTool, activeColor, activeFont, isViewOnly }) {
  return (
    <div style={styles.pageContainer}>
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

const styles = {
  pageContainer: {
    position: "absolute",
    top: "15%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "480px",
    height: "600px",
    background: "#fdfcf7",
    boxShadow: "0 15px 35px rgba(0,0,0,0.2), inset 0 0 40px rgba(0,0,0,0.03)",
    borderRadius: "2px 8px 8px 2px",
    overflow: "hidden",
    padding: "40px"
  }
};

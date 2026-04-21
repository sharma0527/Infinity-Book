import React, { useRef, useEffect } from "react";

export default function EditablePage({ html, setHtml, isActiveMode, activeFont, activeTool, activeColor }) {
  const ref = useRef();

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html || "";
    }
  }, [html]);

  const handleInput = () => {
    setHtml(ref.current.innerHTML);
  };

  // Allow inline executing of text formatting for new blocks
  useEffect(() => {
    if (!isActiveMode || !ref.current) return;
    
    const applyFormatting = () => {
      // Only apply if we actually have focus in the editor natively
      if (document.activeElement === ref.current) {
        const color = activeTool === 'pencil' ? '#7a7a8a' : activeColor;
        document.execCommand('styleWithCSS', false, true);
        document.execCommand('fontName', false, `"${activeFont}", cursive`);
        document.execCommand('foreColor', false, color);
      }
    };
    
    applyFormatting();
  }, [activeFont, activeColor, activeTool, isActiveMode]);

  return (
    <div style={styles.container}>
      <div
        ref={ref}
        contentEditable={isActiveMode}
        suppressContentEditableWarning
        onInput={handleInput}
        style={{
          ...styles.editor,
          pointerEvents: isActiveMode ? "auto" : "none"
        }}
      />
    </div>
  );
}

const styles = {
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    boxSizing: "border-box",
    overflowY: "auto"
  },
  editor: {
    outline: "none",
    whiteSpace: "pre-wrap",
    minHeight: "100%",
    // Provide a default base styling if the page is completely blank
    fontFamily: "'Caveat', cursive",
    fontSize: "24px",
    lineHeight: "1.5",
    color: "#222"
  }
};

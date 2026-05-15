import React, { useRef, useEffect, useState, useCallback } from "react";
import { Trash2, Square, Circle, RectangleHorizontal, Move } from "lucide-react";

// Shape presets
const SHAPES = [
  { id: 'square',  label: 'Square',  icon: Square,              radius: '0px'  },
  { id: 'rounded', label: 'Rounded', icon: RectangleHorizontal, radius: '12px' },
  { id: 'circle',  label: 'Circle',  icon: Circle,              radius: '50%'  },
];

// Corner handles for resize
const CORNERS = [
  { id: 'tl', cursor: 'nwse-resize', top: -6,    left: -6,  dx: -1, dy: -1 },
  { id: 'tr', cursor: 'nesw-resize', top: -6,    right: -6, dx:  1, dy: -1 },
  { id: 'bl', cursor: 'nesw-resize', bottom: -6, left: -6,  dx: -1, dy:  1 },
  { id: 'br', cursor: 'nwse-resize', bottom: -6, right: -6, dx:  1, dy:  1 },
];

export default function EditablePage({ html, setHtml, isActiveMode, activeFont, activeTool, activeColor }) {
  const editorRef    = useRef(null);
  const containerRef = useRef(null);

  const [selectedImg, setSelectedImg] = useState(null);
  const [imgBox,      setImgBox]      = useState(null);
  const [activeShape, setActiveShape] = useState('rounded');
  const [isDragging,  setIsDragging]  = useState(false);

  // All drag operations share this ref so pointermove/up closures never go stale
  const opRef = useRef(null);

  // ─── Sync HTML into DOM ───────────────────────────────────────────────────
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== html) el.innerHTML = html || "";
  }, [html]);

  // ─── Text formatting ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isActiveMode || !editorRef.current) return;
    if (document.activeElement === editorRef.current) {
      const color = activeTool === 'pencil' ? '#7a7a8a' : activeColor;
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('fontName', false, `"${activeFont}", cursive`);
      document.execCommand('foreColor', false, color);
    }
  }, [activeFont, activeColor, activeTool, isActiveMode]);

  // ─── Measure image box relative to container ──────────────────────────────
  const measureImg = useCallback((img) => {
    if (!img || !containerRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    setImgBox({
      top:    iRect.top    - cRect.top  + containerRef.current.scrollTop,
      left:   iRect.left   - cRect.left,
      width:  iRect.width,
      height: iRect.height,
    });
  }, []);

  // Re-measure on scroll/resize
  useEffect(() => {
    if (!selectedImg) return;
    const cont = containerRef.current;
    const refresh = () => measureImg(selectedImg);
    cont?.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    return () => {
      cont?.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, [selectedImg, measureImg]);

  // ─── Helper: get wrapper's current absolute position from its style ───────
  const getWrapperPos = (wrapper) => {
    const t = parseFloat(wrapper.style.top)  || 0;
    const l = parseFloat(wrapper.style.left) || 0;
    return { t, l };
  };

  // ─── Ensure wrapper is absolute-positioned within the editor ─────────────
  const makeAbsolute = (img) => {
    const wrapper = img.parentElement;
    if (!wrapper || wrapper === editorRef.current) return;
    if (wrapper.style.position === 'absolute') return; // already done

    // Snapshot current position relative to the editor div
    const eRect = editorRef.current.getBoundingClientRect();
    const wRect = wrapper.getBoundingClientRect();
    const top  = wRect.top  - eRect.top  + editorRef.current.scrollTop;
    const left = wRect.left - eRect.left;

    wrapper.style.position   = 'absolute';
    wrapper.style.top        = top  + 'px';
    wrapper.style.left       = left + 'px';
    wrapper.style.margin     = '0';
    wrapper.style.display    = 'block';
  };

  // ─── Click delegation ────────────────────────────────────────────────────
  const handleEditorClick = (e) => {
    if (opRef.current?.didMove) return; // ignore click after drag
    const img = e.target.closest('img');
    if (img) {
      e.preventDefault();
      setSelectedImg(img);
      const r = img.style.borderRadius || '12px';
      setActiveShape(r === '50%' ? 'circle' : r === '0px' ? 'square' : 'rounded');
      setTimeout(() => measureImg(img), 0);
    } else {
      setSelectedImg(null);
      setImgBox(null);
    }
  };

  // ─── Paste ───────────────────────────────────────────────────────────────
  const handleEditorPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.createElement('img');
          img.src = ev.target.result;
          img.style.cssText = 'width:240px;max-width:100%;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.15);display:block;cursor:pointer;';
          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'margin:8px 0;line-height:0;position:relative;display:inline-block;';
          wrapper.appendChild(img);
          editorRef.current.appendChild(wrapper);
          setHtml(editorRef.current.innerHTML);
        };
        reader.readAsDataURL(item.getAsFile());
        return;
      }
    }
  };

  const handleInput = () => setHtml(editorRef.current.innerHTML);

  // ─── Shape ───────────────────────────────────────────────────────────────
  const applyShape = (shape) => {
    if (!selectedImg) return;
    setActiveShape(shape.id);
    selectedImg.style.borderRadius = shape.radius;
    if (shape.id === 'circle') {
      const sz = Math.min(selectedImg.offsetWidth, selectedImg.offsetHeight);
      selectedImg.style.width     = sz + 'px';
      selectedImg.style.height    = sz + 'px';
      selectedImg.style.objectFit = 'cover';
    } else {
      selectedImg.style.height    = '';
      selectedImg.style.objectFit = '';
    }
    setHtml(editorRef.current.innerHTML);
    setTimeout(() => measureImg(selectedImg), 0);
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const deleteImage = () => {
    if (!selectedImg) return;
    const wrapper = selectedImg.parentElement;
    if (wrapper && wrapper !== editorRef.current) wrapper.remove();
    else selectedImg.remove();
    setHtml(editorRef.current.innerHTML);
    setSelectedImg(null);
    setImgBox(null);
  };

  // ─── Drag-to-MOVE ────────────────────────────────────────────────────────
  const startMove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;

    // Convert wrapper to absolute positioning first
    makeAbsolute(selectedImg);

    const wrapper  = selectedImg.parentElement;
    const { t, l } = getWrapperPos(wrapper);
    const startX   = e.clientX;
    const startY   = e.clientY;

    opRef.current = { type: 'move', startX, startY, startTop: t, startLeft: l, didMove: false };
    setIsDragging(true);

    const onMove = (ev) => {
      const op = opRef.current;
      if (!op) return;
      const dx = ev.clientX - op.startX;
      const dy = ev.clientY - op.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) op.didMove = true;

      const newTop  = op.startTop  + dy;
      const newLeft = op.startLeft + dx;
      wrapper.style.top  = newTop  + 'px';
      wrapper.style.left = newLeft + 'px';
      measureImg(selectedImg);
    };

    const onUp = () => {
      setIsDragging(false);
      setHtml(editorRef.current.innerHTML);
      // Reset didMove flag after click event fires
      setTimeout(() => { if (opRef.current) opRef.current.didMove = false; }, 50);
      opRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ─── Drag-to-RESIZE ──────────────────────────────────────────────────────
  const startResize = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImg) return;

    const startX   = e.clientX;
    const startY   = e.clientY;
    const startW   = selectedImg.offsetWidth;
    const startH   = selectedImg.offsetHeight;
    const isCircle = activeShape === 'circle';

    // Also capture wrapper position in case we need to adjust for tl/tr/bl corners
    const wrapper = selectedImg.parentElement;
    const { t: startTop, l: startLeft } = getWrapperPos(wrapper);

    opRef.current = { type: 'resize', startX, startY, startW, startH, corner, isCircle, startTop, startLeft };

    const onMove = (ev) => {
      const op = opRef.current;
      if (!op) return;
      const dx = (ev.clientX - op.startX) * op.corner.dx;
      const dy = (ev.clientY - op.startY) * op.corner.dy;
      let newW = Math.max(60, op.startW + dx);
      let newH = Math.max(60, op.startH + dy);
      if (op.isCircle) {
        const s = Math.max(60, op.startW + Math.max(dx, dy));
        newW = s; newH = s;
      }
      selectedImg.style.width  = newW + 'px';
      selectedImg.style.height = op.isCircle ? newH + 'px' : '';
      measureImg(selectedImg);
    };

    const onUp = () => {
      opRef.current = null;
      setHtml(editorRef.current.innerHTML);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} style={styles.container}>

      {/* Content editor — position:relative so absolute images are scoped inside */}
      <div
        ref={editorRef}
        contentEditable={isActiveMode}
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handleEditorPaste}
        onClick={handleEditorClick}
        style={{
          ...styles.editor,
          pointerEvents: isActiveMode ? 'auto' : 'none',
        }}
      />

      {/* ── Selection overlay ── */}
      {selectedImg && imgBox && (
        <div
          style={{
            position: 'absolute',
            top:    imgBox.top,
            left:   imgBox.left,
            width:  imgBox.width,
            height: imgBox.height,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          {/* Selection border */}
          <div style={styles.selectionBorder} />

          {/* ── Floating toolbar ── */}
          <div style={styles.toolbar}>

            {/* Move handle — drag this to reposition */}
            <div
              title="Drag to move"
              onPointerDown={startMove}
              style={{
                ...styles.toolBtn,
                cursor: isDragging ? 'grabbing' : 'grab',
                background: 'rgba(99,179,237,0.15)',
                border: '1px solid rgba(99,179,237,0.4)',
                pointerEvents: 'auto',
              }}
            >
              <Move size={14} color="#63b3ed" />
            </div>

            <div style={styles.toolbarDivider} />

            {/* Shape buttons */}
            {SHAPES.map(shape => {
              const Icon = shape.icon;
              return (
                <button
                  key={shape.id}
                  title={shape.label}
                  onPointerDown={(e) => { e.preventDefault(); applyShape(shape); }}
                  style={{
                    ...styles.toolBtn,
                    pointerEvents: 'auto',
                    background: activeShape === shape.id ? 'rgba(167,139,250,0.35)' : 'transparent',
                    border:     activeShape === shape.id ? '1px solid rgba(167,139,250,0.7)' : '1px solid transparent',
                  }}
                >
                  <Icon size={14} color={activeShape === shape.id ? '#a78bfa' : '#ccc'} />
                </button>
              );
            })}

            <div style={styles.toolbarDivider} />

            {/* Delete */}
            <button
              title="Delete image"
              onPointerDown={(e) => { e.preventDefault(); deleteImage(); }}
              style={{ ...styles.toolBtn, ...styles.deleteBtn, pointerEvents: 'auto' }}
            >
              <Trash2 size={14} color="#f87171" />
            </button>
          </div>

          {/* ── Corner resize handles ── */}
          {CORNERS.map(corner => (
            <div
              key={corner.id}
              onPointerDown={(e) => startResize(e, corner)}
              style={{
                position:  'absolute',
                width: 12, height: 12,
                background: '#a78bfa',
                border: '2px solid white',
                borderRadius: '3px',
                cursor: corner.cursor,
                pointerEvents: 'auto',
                zIndex: 60,
                top:    corner.top    !== undefined ? corner.top    : undefined,
                left:   corner.left   !== undefined ? corner.left   : undefined,
                right:  corner.right  !== undefined ? corner.right  : undefined,
                bottom: corner.bottom !== undefined ? corner.bottom : undefined,
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            />
          ))}

          {/* ── Centre drag zone (body of selection) ── */}
          <div
            onPointerDown={startMove}
            title="Drag to move"
            style={{
              position: 'absolute',
              inset: 6,
              cursor: isDragging ? 'grabbing' : 'grab',
              pointerEvents: 'auto',
              zIndex: 49,
              // transparent so image shows through
              background: 'transparent',
            }}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%', height: '100%',
    boxSizing: 'border-box',
    overflowY: 'auto',
  },
  editor: {
    outline: 'none',
    whiteSpace: 'pre-wrap',
    minHeight: '100%',
    position: 'relative',          // ← critical: scopes absolute wrappers
    fontFamily: "'Caveat', cursive",
    fontSize: '24px',
    lineHeight: '1.5',
    color: '#222',
  },
  selectionBorder: {
    position: 'absolute',
    inset: 0,
    border: '2px solid #a78bfa',
    borderRadius: 'inherit',
    pointerEvents: 'none',
    boxShadow: '0 0 0 3px rgba(167,139,250,0.2)',
  },
  toolbar: {
    position: 'absolute',
    top: -46,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(15,12,20,0.92)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '5px 8px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
    pointerEvents: 'auto',
    whiteSpace: 'nowrap',
    zIndex: 70,
  },
  toolBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28, height: 28,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: '1px solid transparent',
    background: 'transparent',
  },
  deleteBtn: {
    background: 'rgba(248,113,113,0.12)',
    border: '1px solid rgba(248,113,113,0.3)',
  },
  toolbarDivider: {
    width: 1, height: 18,
    background: 'rgba(255,255,255,0.12)',
    margin: '0 2px',
  },
};

import React, { useRef, useEffect, useState } from "react";

export default function DrawingCanvas({ strokes, setStrokes, isActiveMode, activeTool, activeColor }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";
    setCtx(context);
    
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = parent.clientWidth * dpr;
        canvas.height = parent.clientHeight * dpr;
        canvas.style.width = `${parent.clientWidth}px`;
        canvas.style.height = `${parent.clientHeight}px`;
        context.scale(dpr, dpr);
        
        redrawStrokes(context, parent.clientWidth, parent.clientHeight, strokes);
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  useEffect(() => {
     if (ctx && canvasRef.current) {
        const parent = canvasRef.current.parentElement;
        if(parent) {
             redrawStrokes(ctx, parent.clientWidth, parent.clientHeight, strokes);
        }
     }
  }, [strokes, ctx]);

  const applyToolSettings = (context, tool, color) => {
    if (tool === 'pencil') {
      context.lineWidth = 1.2;
      context.strokeStyle = '#4a4a5a'; // graphite color
      context.globalAlpha = 0.7;
      context.globalCompositeOperation = 'source-over';
    } else if (tool === 'highlighter') {
      context.lineWidth = 18;
      context.strokeStyle = color;
      context.globalAlpha = 0.4;
      context.globalCompositeOperation = 'multiply';
    } else {
      // pen
      context.lineWidth = 2.5;
      context.strokeStyle = color || '#000000';
      context.globalAlpha = 1.0;
      context.globalCompositeOperation = 'source-over';
    }
  };

  const redrawStrokes = (context, w, h, currentStrokes) => {
    context.clearRect(0, 0, w, h);
    if (!currentStrokes) return;
    
    currentStrokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;
      applyToolSettings(context, stroke.tool, stroke.color);
      
      context.beginPath();
      context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      context.stroke();
    });
  };

  const startDrawing = (e) => {
    if (!isActiveMode) return;
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (ctx) {
      applyToolSettings(ctx, activeTool, activeColor);
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
    
    setIsDrawing(true);
    setStrokes((prev) => [...prev, { tool: activeTool, color: activeColor, points: [{ x: offsetX, y: offsetY }] }]);
  };

  const draw = (e) => {
    if (!isDrawing || !isActiveMode) return;
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (ctx) {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    }
    
    setStrokes((prev) => {
      const newStrokes = [...prev];
      if (newStrokes.length > 0) {
          newStrokes[newStrokes.length - 1].points.push({ x: offsetX, y: offsetY });
      }
      return newStrokes;
    });
  };

  const stopDrawing = () => {
    if (!isActiveMode) return;
    if (ctx) ctx.closePath();
    setIsDrawing(false);
  };

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={(e) => {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            startDrawing({ nativeEvent: { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top }});
        }}
        onTouchMove={(e) => {
            const touch = e.touches[0];
            const rect = e.target.getBoundingClientRect();
            draw({ nativeEvent: { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top }});
        }}
        onTouchEnd={stopDrawing}
        style={{
           ...styles.canvas,
           pointerEvents: isActiveMode ? "auto" : "none",
           cursor: isActiveMode ? "crosshair" : "default"
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
    pointerEvents: "none"
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
    touchAction: "none"
  }
}

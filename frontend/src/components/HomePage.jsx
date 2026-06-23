import React, { useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Book, PenTool, Share2 } from 'lucide-react';
import './HomePage.css';

export default function HomePage({ onLogin }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.4 + 0.1),
        size: Math.random() * 4 + 1,
        alpha: Math.random() * 0.5 + 0.1,
        baseAlpha: Math.random() * 0.5 + 0.1
      });
    }
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 120, 255, ${p.alpha})`;
        ctx.fill();
        
        p.x += p.vx;
        p.y += p.vy;
        
        // slowly pulse opacity
        p.alpha = p.baseAlpha + Math.sin(Date.now() * 0.001 + p.size) * 0.1;
        if (p.alpha < 0) p.alpha = 0;
        
        if (p.y < 0) {
          p.y = canvas.height;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < 0 || p.x > canvas.width) {
          p.x = Math.random() * canvas.width;
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <section 
      ref={containerRef} 
      className="hero-section"
      onMouseMove={handleMouseMove}
    >
      {/* Interactive mouse light background */}
      <div className="mouse-glow" />

      {/* Fog background layer */}
      <div className="fog-layer" />

      {/* Floating particles background canvas */}
      <canvas ref={canvasRef} className="particles-canvas" />

      {/* Laser beams */}
      <div className="hero-laser-vertical" />
      <div className="hero-laser" />

      <div className="hero-content">
        <div className="hero-badge">
          <Sparkles size={14} color="#c37cff" />
          <span>Welcome to Infinity Book</span>
        </div>

        <h1 className="hero-title">
          Your Infinite
          <br />
          <span className="gradient-word">Canvas</span>
          <br />
          for Big Ideas.
        </h1>

        <p className="hero-subtitle">
          A beautifully crafted futuristic notebook for infinite journaling, AI collaboration,
          drawing, and real-time multiplayer experiences.
        </p>

        <button onClick={onLogin} className="hero-btn">
          <span>Open New Notebook</span>
          <ArrowRight size={18} />
        </button>

        {/* Feature Cards Grid */}
        <div className="hero-features">
          <div className="hero-card">
            <div className="hero-card-glow" />
            <Book size={24} color="#6ea8ff" className="hero-card-icon" />
            <h3 className="hero-card-title">3D Experience</h3>
            <p className="hero-card-text">Realistic page turning and immersive notebook physics.</p>
          </div>
          
          <div className="hero-card">
            <div className="hero-card-glow" />
            <PenTool size={24} color="#ff5fa2" className="hero-card-icon" />
            <h3 className="hero-card-title">Rich Drawing</h3>
            <p className="hero-card-text">Create ideas naturally using AI-powered drawing tools.</p>
          </div>
          
          <div className="hero-card">
            <div className="hero-card-glow" />
            <Share2 size={24} color="#10a37f" className="hero-card-icon" />
            <h3 className="hero-card-title">Multiplayer</h3>
            <p className="hero-card-text">Collaborate with teammates in real-time instantly.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
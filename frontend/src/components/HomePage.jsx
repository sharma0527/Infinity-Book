import React from 'react';
import { Sparkles, ArrowRight, Book, PenTool, Share2 } from 'lucide-react';
import LaserFlow from './LaserFlow';
import './HomePage.css';

export default function HomePage({ onLogin }) {
  return (
    <section className="hero-section">
      <LaserFlow 
        style={{ position: 'absolute', inset: 0, zIndex: 0 }} 
        horizontalBeamOffset={0.0} 
        color="#b575ff" 
        horizontalSizing={2.4}
        verticalSizing={4.8}
        falloffStart={2.5}
        fogIntensity={1.4}
        wispDensity={1.6}
        wispIntensity={12.0}
        flowStrength={0.5}
        flowSpeed={0.5}
        wispSpeed={18.0}
      />

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
          A beautifully crafted futuristic notebook for{' '}
          <span className="highlight-blue">infinite journaling</span>,{' '}
          <span className="highlight-purple">AI collaboration</span>,{' '}
          <span className="highlight-pink">drawing</span>, and{' '}
          <span className="highlight-teal">real-time multiplayer experiences</span>.
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
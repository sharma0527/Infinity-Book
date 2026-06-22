import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import LaserFlow from './LaserFlow';

export default function HomePage({ onLogin }) {
  return (
    <div style={styles.container}>
      <LaserFlow style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div style={styles.overlay}></div>
      
      <div style={styles.content}>
        <div style={styles.badge}>
          <Sparkles size={16} color="#6ea8ff" />
          <span>WELCOME TO INFINITY BOOK</span>
        </div>

        <h1 style={styles.title}>
          Your Infinite <span style={styles.highlight}>Canvas</span> for Big Ideas.
        </h1>

        <p style={styles.subtitle}>
          A beautifully crafted futuristic notebook for infinite journaling, AI collaboration, drawing, and real-time multiplayer experiences.
        </p>

        <button 
          onClick={onLogin} 
          style={styles.getStartedBtn}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 95, 162, 0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(255, 95, 162, 0.3)';
          }}
        >
          <span>Get Started</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#030305',
    fontFamily: 'Inter, sans-serif',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at center, transparent 0%, rgba(3,3,5,0.9) 100%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '750px',
    width: '100%',
    padding: '0 20px',
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '32px',
    backdropFilter: 'blur(10px)',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 'clamp(40px, 6vw, 64px)',
    fontWeight: '800',
    lineHeight: '1.15',
    marginBottom: '24px',
    letterSpacing: '-2px',
  },
  highlight: {
    background: 'linear-gradient(90deg, #73a5ff, #ff5fa2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: 'clamp(15px, 2.5vw, 18px)',
    lineHeight: '1.6',
    color: '#94a3b8',
    marginBottom: '40px',
    fontWeight: '400',
    maxWidth: '600px',
  },
  getStartedBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px 36px',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, #73a5ff, #ff5fa2)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
    letterSpacing: '1px',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(255, 95, 162, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase',
  }
};
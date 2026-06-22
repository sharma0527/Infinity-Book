import React from 'react';
import { Sparkles, ArrowRight, Book, PenTool, Share2 } from 'lucide-react';
import LaserFlow from './LaserFlow';

export default function HomePage({ onLogin }) {
  return (
    <div style={styles.container}>
      <LaserFlow 
        style={{ position: 'absolute', inset: 0, zIndex: 0 }} 
        horizontalBeamOffset={0.0} 
        color="#b575ff" 
        horizontalSizing={1.2}
        verticalSizing={3.2}
        fogIntensity={0.85}
        wispDensity={1.2}
        wispIntensity={7.0}
        flowStrength={0.4}
        flowSpeed={0.45}
        wispSpeed={15.0}
      />
      <div style={styles.overlay}></div>
      
      <div style={styles.content}>
        <div style={styles.badge}>
          <Sparkles size={16} color="#6ea8ff" />
          <span>WELCOME TO INFINITY BOOK</span>
        </div>

        <h1 style={styles.title}>
          Your Infinite <span style={styles.highlight}>Canvas</span><br />for Big Ideas.
        </h1>

        <p style={styles.subtitle}>
          A beautifully crafted futuristic notebook for infinite journaling, AI collaboration,<br />drawing, and real-time multiplayer experiences.
        </p>

        <button 
          onClick={onLogin} 
          style={styles.openNotebookBtn}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(94, 162, 255, 0.5)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(94, 162, 255, 0.3)';
          }}
        >
          <span>Open New Notebook</span>
          <ArrowRight size={18} />
        </button>

        {/* Feature Cards Grid */}
        <div style={styles.featuresContainer}>
          <div 
            style={styles.featureCard}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.45)';
            }}
          >
            <div style={styles.cardGlow}></div>
            <Book size={24} color="#6ea8ff" style={styles.featureIcon} />
            <h3 style={styles.featureTitle}>3D Experience</h3>
            <p style={styles.featureText}>Realistic page turning and immersive notebook physics.</p>
          </div>
          
          <div 
            style={styles.featureCard}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.45)';
            }}
          >
            <div style={styles.cardGlow}></div>
            <PenTool size={24} color="#ff5fa2" style={styles.featureIcon} />
            <h3 style={styles.featureTitle}>Rich Drawing</h3>
            <p style={styles.featureText}>Create ideas naturally using AI-powered drawing tools.</p>
          </div>
          
          <div 
            style={styles.featureCard}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.45)';
            }}
          >
            <div style={styles.cardGlow}></div>
            <Share2 size={24} color="#10a37f" style={styles.featureIcon} />
            <h3 style={styles.featureTitle}>Multiplayer</h3>
            <p style={styles.featureText}>Collaborate with teammates in real-time instantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    minHeight: '100vh',
    position: 'relative',
    overflowY: 'auto',
    overflowX: 'hidden',
    background: '#030305',
    fontFamily: 'Inter, sans-serif',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    boxSizing: 'border-box',
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
    maxWidth: '900px',
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
    marginBottom: '18px',
    backdropFilter: 'blur(10px)',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 'clamp(44px, 7vw, 72px)',
    fontWeight: '800',
    lineHeight: '1.1',
    marginBottom: '16px',
    letterSpacing: '-2.5px',
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
    marginBottom: '24px',
    fontWeight: '400',
    maxWidth: '650px',
  },
  openNotebookBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '16px 36px',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg, #5ea2ff, #ff5fa2)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '16px',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    boxShadow: '0 8px 30px rgba(94, 162, 255, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
    transition: 'all 0.2s ease',
  },
  featuresContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    width: '100%',
    maxWidth: '900px',
    marginTop: '36px',
    flexWrap: 'wrap',
  },
  featureCard: {
    position: 'relative',
    background: 'rgba(15, 23, 42, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '28px 24px',
    flex: '1 1 250px',
    maxWidth: '280px',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: 'default',
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.03), transparent 70%)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  featureIcon: {
    marginBottom: '16px',
    zIndex: 2,
  },
  featureTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#fff',
    marginBottom: '8px',
    letterSpacing: '0.5px',
    zIndex: 2,
  },
  featureText: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: '1.5',
    margin: 0,
    zIndex: 2,
  }
};
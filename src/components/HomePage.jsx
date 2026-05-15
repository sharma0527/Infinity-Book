import React from 'react';
import {
  BookOpen,
  PenTool,
  Share2,
  Sparkles,
  MessageCircle,
  ArrowRight
} from 'lucide-react';
import LaserFlow from './LaserFlow';

export default function HomePage({ onStart }) {
  return (
    <div style={styles.container}>

      <style>
        {`
          @keyframes gradientMesh {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes floatParticles {
            from { transform: translateY(0px); }
            to { transform: translateY(-1000px); }
          }
          @keyframes gridMove {
            0% { transform: perspective(1000px) rotateX(60deg) translateY(0); }
            100% { transform: perspective(1000px) rotateX(60deg) translateY(50px); }
          }
        `}
      </style>

      {/* LAYER 1: Animated Gradient Mesh */}
      <div style={{...styles.layer, ...styles.layerMesh}}></div>

      {/* LAYER 3: Infinite Grid */}
      <div style={{...styles.layer, ...styles.layerGrid}}></div>

      {/* LAYER 5 & 4: Ambient Fog and Mouse Glow (LaserFlow handles this natively) */}
      <div style={styles.laserBackground}>
        <LaserFlow
          color="#D9A6FF"
          horizontalBeamOffset={0.0}
          verticalBeamOffset={0.0}
          horizontalSizing={3.0}
          verticalSizing={5.0}
          wispDensity={2.5}
          wispSpeed={20}
          wispIntensity={12}
          flowSpeed={0.6}
          flowStrength={0.6}
          fogIntensity={1.8}
          fogScale={0.4}
          fogFallSpeed={0.7}
          decay={1.25}
          falloffStart={1.4}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* LAYER 2: Floating Particles */}
      <div style={{...styles.layer, ...styles.layerParticles}}></div>

      {/* DARK OVERLAY */}
      <div style={styles.overlay}></div>

      {/* HERO GLOW */}
      <div style={styles.heroGlow}></div>

      {/* MAIN CONTENT */}
      <div style={styles.content}>

        <div style={styles.badge}>
          <Sparkles size={16} color="#6ea8ff" />
          <span>WELCOME TO INFINITY BOOK</span>
        </div>

        <h1 style={styles.title}>
          Your Infinite <span style={styles.highlight}>Canvas</span>
          <br />
          for Big Ideas.
        </h1>

        <p style={styles.subtitle}>
          A beautifully crafted futuristic notebook for infinite journaling,
          AI collaboration, drawing, and real-time multiplayer experiences.
        </p>

        {/* ACTION BUTTONS */}
        <div style={styles.actions}>

          <button
            style={styles.ctaButton}
            onClick={onStart}
          >
            Open New Notebook
            <ArrowRight size={20} />
          </button>

        </div>

        {/* FEATURES */}
        <div style={styles.features}>

          <div style={styles.featureCard}>
            <BookOpen size={32} color="#4a90e2" />
            <h3>3D Experience</h3>
            <p>Realistic page turning and immersive notebook physics.</p>
          </div>

          <div style={styles.featureCard}>
            <PenTool size={32} color="#ff5fa2" />
            <h3>Rich Drawing</h3>
            <p>Create ideas naturally using AI-powered drawing tools.</p>
          </div>

          <div style={styles.featureCard}>
            <Share2 size={32} color="#57ffb1" />
            <h3>Multiplayer</h3>
            <p>Collaborate with teammates in real-time instantly.</p>
          </div>

        </div>
      </div>

      {/* GLOW BLOBS */}
      <div style={styles.blob1}></div>
      <div style={styles.blob2}></div>

    </div>
  );
}

const styles = {

  container: {
    width: '100vw',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    background: '#030305',
    fontFamily: 'Inter, sans-serif',
    color: '#fff',
  },

  laserBackground: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    zIndex: 3,
    opacity: 0.85,
    pointerEvents: 'auto', // needed for mouse glow interaction
  },

  layer: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },

  layerMesh: {
    zIndex: 1,
    background: 'linear-gradient(-45deg, #030305, #130a2a, #030305, #081525)',
    backgroundSize: '400% 400%',
    animation: 'gradientMesh 20s ease infinite',
  },

  layerGrid: {
    zIndex: 2,
    backgroundImage: `
      linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
    `,
    backgroundSize: '50px 50px',
    height: '200vh',
    bottom: '-50vh',
    transformOrigin: 'bottom center',
    animation: 'gridMove 3s linear infinite',
    opacity: 0.3,
  },

  layerParticles: {
    zIndex: 4,
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
    backgroundSize: '100px 100px',
    backgroundPosition: '0 0',
    opacity: 0.2,
    animation: 'floatParticles 100s linear infinite',
  },

  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at center, transparent 0%, rgba(3,3,5,0.8) 100%)',
    zIndex: 5,
    pointerEvents: 'none',
  },

  heroGlow: {
    position: 'absolute',
    width: '1200px',
    height: '1200px',
    background: 'radial-gradient(circle, rgba(180,120,255,0.18), transparent 70%)',
    filter: 'blur(120px)',
    top: '-300px',
    right: '-200px',
    zIndex: 6,
    pointerEvents: 'none',
  },

  content: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    maxWidth: '1200px',
    minHeight: '100vh',
    margin: '0 auto',
    padding: '0 40px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: '120px',
    alignItems: 'center',
    textAlign: 'center',
  },

  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 20px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    marginBottom: '30px',
    backdropFilter: 'blur(10px)',
    fontSize: '13px',
    letterSpacing: '1px',
    fontWeight: '600',
  },

  title: {
    fontSize: 'clamp(72px, 10vw, 140px)',
    fontWeight: '900',
    lineHeight: '0.95',
    marginBottom: '36px',
    letterSpacing: '-5px',
    maxWidth: '1400px',
  },

  highlight: {
    background: 'linear-gradient(90deg, #73a5ff, #ff5fa2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },

  subtitle: {
    maxWidth: '900px',
    fontSize: '20px',
    lineHeight: '1.7',
    color: '#b7b7c9',
    marginBottom: '50px',
    fontWeight: '300',
  },

  actions: {
    display: 'flex',
    gap: '20px',
    marginBottom: '70px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },

  ctaButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '18px 34px',
    borderRadius: '999px',
    border: 'none',
    background: 'linear-gradient(135deg,#5ea2ff,#ff5fa2)',
    color: '#fff',
    fontWeight: '700',
    fontSize: '18px',
    cursor: 'pointer',
    boxShadow: '0 10px 40px rgba(94,162,255,0.35)',
  },

  features: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  featureCard: {
    width: '280px',
    padding: '34px',
    borderRadius: '26px',
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid rgba(255,255,255,0.07)',
    backdropFilter: 'blur(18px)',
    boxShadow: `
      0 10px 30px rgba(0,0,0,0.3),
      inset 0 0 20px rgba(255,255,255,0.02)
    `,
    transform: 'translateY(0px)',
    transition: 'all 0.4s ease',
  },

  blob1: {
    position: 'absolute',
    top: '-200px',
    left: '-200px',
    width: '600px',
    height: '600px',
    background: 'rgba(80,120,255,0.18)',
    filter: 'blur(140px)',
    borderRadius: '50%',
    zIndex: 0,
  },

  blob2: {
    position: 'absolute',
    bottom: '-250px',
    right: '-250px',
    width: '700px',
    height: '700px',
    background: 'rgba(255,80,180,0.12)',
    filter: 'blur(160px)',
    borderRadius: '50%',
    zIndex: 0,
  },
};
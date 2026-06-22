import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, CornerDownLeft } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import LaserFlow from './LaserFlow';

export default function HomePage({ onLogin }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Entry (Name/Email), 2 = OTP Verification
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const res = await fetch(`${window.VITE_API_URL || 'http://localhost:5000/api'}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to login with Google');
      
      localStorage.setItem('infinity_token', data.token);
      localStorage.setItem('infinity_name', data.name);
      localStorage.setItem('infinity_email', data.email);
      if (data.picture) localStorage.setItem('infinity_picture', data.picture);
      
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email || !name) {
      setError('Please provide your name and Gmail address.');
      return;
    }
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Only Gmail addresses (@gmail.com) are supported.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${window.VITE_API_URL || 'http://localhost:5000/api'}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request OTP');

      setStep(2); // Move to OTP input step
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${window.VITE_API_URL || 'http://localhost:5000/api'}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, otp })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid verification code.');

      localStorage.setItem('infinity_token', data.token);
      localStorage.setItem('infinity_name', data.name);
      localStorage.setItem('infinity_email', data.email);
      
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <LaserFlow style={{ position: 'absolute', inset: 0, zIndex: 0 }} />
      <div style={styles.overlay}></div>
      
      <div style={styles.content}>
        <div style={styles.badge}>
          <Sparkles size={16} color="#6ea8ff" />
          <span>INFINITY AI</span>
        </div>

        <h1 style={styles.title}>
          Welcome to <span style={styles.highlight}>Infinity AI</span>
        </h1>

        <p style={styles.subtitle}>
          Your intelligent workspace for brainstorming, organizing, and creating.
        </p>

        <div style={styles.authCard}>
          {error && <div style={styles.error}>{error}</div>}
          
          {step === 1 ? (
            <>
              <div style={styles.googleWrapper}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Login Failed')}
                  theme="filled_black"
                  size="large"
                  width="100%"
                  text="continue_with"
                />
              </div>

              <div style={styles.divider}>
                <span style={styles.dividerLine}></span>
                <span style={styles.dividerText}>or continue with</span>
                <span style={styles.dividerLine}></span>
              </div>

              <form onSubmit={handleSendOtp} style={styles.form}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
                <input
                  type="email"
                  placeholder="Gmail Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
                <button type="submit" style={styles.submitBtn} disabled={loading}>
                  {loading ? 'Sending code...' : 'Send Verification Code'} <ArrowRight size={18} />
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleVerifyOtp} style={styles.form}>
              <div style={styles.otpHeader}>
                <ShieldCheck size={28} color="#10a37f" style={{ marginBottom: '8px' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Enter Verification Code</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                  We sent a code to <span style={{ color: '#fff', fontWeight: '600' }}>{email}</span>
                </p>
              </div>

              <input
                type="text"
                placeholder="6-Digit Code"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                style={{ ...styles.input, textAlign: 'center', letterSpacing: '4px', fontSize: '18px', fontWeight: 'bold' }}
                disabled={loading}
                maxLength={6}
                required
              />

              <button type="submit" style={styles.submitBtn} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Continue'} <ArrowRight size={18} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => { setStep(1); setOtp(''); setError(''); }}
                  style={styles.backBtn}
                  disabled={loading}
                >
                  <CornerDownLeft size={14} /> <span>Go Back</span>
                </button>
              </div>
            </form>
          )}
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
  heroGlow: {
    position: 'absolute',
    width: '800px',
    height: '800px',
    background: 'radial-gradient(circle, rgba(180,120,255,0.1), transparent 70%)',
    filter: 'blur(100px)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 2,
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '500px',
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
    marginBottom: '24px',
    backdropFilter: 'blur(10px)',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '1px',
  },
  title: {
    fontSize: 'clamp(40px, 8vw, 56px)',
    fontWeight: '800',
    lineHeight: '1.1',
    marginBottom: '16px',
    letterSpacing: '-2px',
  },
  highlight: {
    background: 'linear-gradient(90deg, #73a5ff, #ff5fa2)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '16px',
    lineHeight: '1.6',
    color: '#94a3b8',
    marginBottom: '40px',
    fontWeight: '400',
  },
  authCard: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '24px',
    padding: '32px',
    width: '100%',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  },
  googleWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    width: '100%',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '14px 16px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #10a37f, #3b82f6)',
    color: '#fff',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
    marginTop: '8px',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '13px',
  },
  otpHeader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '16px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'color 0.2s',
  }
};
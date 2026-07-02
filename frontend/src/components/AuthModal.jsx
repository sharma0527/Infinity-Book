import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, ArrowRight, Loader } from 'lucide-react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleAuth = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          provider: 'google',
          emailVerified: user.emailVerified,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      } else {
        await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        if (!user.emailVerified) {
          await signOut(auth);
          throw new Error("Please verify your email before logging in.");
        }
        
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
           await setDoc(userRef, {
             uid: user.uid,
             name: user.email.split('@')[0],
             email: user.email,
             photoURL: "",
             provider: 'password',
             emailVerified: true,
             createdAt: new Date().toISOString(),
             lastLogin: new Date().toISOString()
           });
        } else {
           await setDoc(userRef, { lastLogin: new Date().toISOString() }, { merge: true });
        }

        onSuccess();
        onClose();
      } else {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = result.user;
        
        await sendEmailVerification(user);
        
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: name,
          email: user.email,
          photoURL: "",
          provider: 'password',
          emailVerified: false,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });

        await signOut(auth);
        setSuccessMsg("Verification email sent. Please check your inbox.");
        setIsLogin(true); // Switch to login to wait for verification
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={styles.overlay}>
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            style={styles.backdrop}
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={styles.modal}
          >
            <button onClick={onClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </button>

            <div style={styles.header}>
              <div style={styles.iconContainer}>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', lineHeight: '20px' }}>∞</span>
              </div>
              <h2 style={styles.title}>{isLogin ? 'Infinity AI' : 'Create Account'}</h2>
              <p style={styles.subtitle}>
                {isLogin 
                  ? 'Sign in to access your infinite canvas.' 
                  : 'Join Infinity Book and start creating.'}
              </p>
            </div>

            <button 
              type="button" 
              onClick={handleGoogleAuth} 
              disabled={loading}
              style={styles.googleButton}
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google" 
                style={{ width: '18px', height: '18px' }} 
              />
              Continue with Google
            </button>

            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <span style={styles.dividerText}>OR</span>
              <div style={styles.dividerLine} />
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              {!isLogin && (
                <div style={styles.inputGroup}>
                  <User size={18} color="#94a3b8" style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.input}
                    required={!isLogin}
                  />
                </div>
              )}

              <div style={styles.inputGroup}>
                <Mail size={18} color="#94a3b8" style={styles.inputIcon} />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              {!isLogin && (
                <div style={styles.inputGroup}>
                  <Lock size={18} color="#94a3b8" style={styles.inputIcon} />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={styles.input}
                    required={!isLogin}
                  />
                </div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.error}>
                  {error}
                </motion.div>
              )}

              {successMsg && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.success}>
                  {successMsg}
                </motion.div>
              )}

              <button type="submit" disabled={loading} style={styles.submitButton}>
                {loading ? <Loader size={20} className="spin" /> : <span>{isLogin ? 'Sign In' : 'Create Account'}</span>}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div style={styles.footer}>
              <p style={styles.footerText}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  type="button" 
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccessMsg('');
                  }} 
                  style={styles.toggleButton}
                >
                  {isLogin ? 'Create Account' : 'Sign In'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.75)',
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
    background: 'rgba(18, 18, 29, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '40px 32px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    zIndex: 1,
    maxHeight: '90vh',
    overflowY: 'auto'
  },
  closeButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  iconContainer: {
    width: '56px',
    height: '56px',
    background: 'linear-gradient(135deg, #10a37f, #3b82f6)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
    boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
  },
  title: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  googleButton: {
    width: '100%',
    background: '#fff',
    color: '#1e293b',
    border: 'none',
    borderRadius: '12px',
    padding: '12px',
    fontSize: '15px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    marginBottom: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    transition: 'transform 0.1s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#94a3b8',
    padding: '0 16px',
    fontSize: '12px',
    fontWeight: '600',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
  },
  input: {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '14px 16px 14px 44px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    background: 'rgba(239, 68, 68, 0.1)',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  success: {
    color: '#10b981',
    fontSize: '13px',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    textAlign: 'center'
  },
  submitButton: {
    background: 'linear-gradient(135deg, #10a37f, #3b82f6)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    marginTop: '8px',
    boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
  footer: {
    textAlign: 'center',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  }
};

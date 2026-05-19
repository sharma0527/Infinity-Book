import React, { useState } from 'react';
import { Share2, Link as LinkIcon, Check } from 'lucide-react';

export default function ShareMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [access, setAccess] = useState('view'); // 'view' or 'edit'
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('access', access);
    
    // Fallback if clipboard API is not available or blocked
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url.toString());
    } else {
        // Just mock it
        console.log("Copied to clipboard:", url.toString());
    }
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={styles.container}>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.shareBtn}>
        <Share2 size={18} />
        <span>Share</span>
      </button>

      {isOpen && (
        <div style={styles.popover}>
          <h4 style={styles.title}>Share Document</h4>
          
          <div style={styles.accessGroup}>
            <label style={styles.radioLabel}>
              <input 
                type="radio" 
                value="view" 
                checked={access === 'view'} 
                onChange={() => setAccess('view')}
              />
              Can View
            </label>
            <label style={styles.radioLabel}>
              <input 
                type="radio" 
                value="edit" 
                checked={access === 'edit'} 
                onChange={() => setAccess('edit')}
              />
              Can Edit
            </label>
          </div>

          <button onClick={handleCopy} style={styles.copyBtn}>
            {copied ? <Check size={16} color="#00C851" /> : <LinkIcon size={16} color="#666" />}
            <span style={{ color: copied ? '#00C851' : '#333' }}>
                {copied ? 'Link Copied!' : 'Copy Access Link'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    top: '20px',
    right: '30px',
    zIndex: 200,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  shareBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#4a90e2',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(74, 144, 226, 0.4)',
    transition: 'transform 0.2s, background-color 0.2s'
  },
  popover: {
    position: 'absolute',
    top: '130%',
    right: '0',
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 15px 40px rgba(0,0,0,0.2)',
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    color: '#222',
    fontWeight: '600',
    letterSpacing: '0.5px'
  },
  accessGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '12px',
    border: '1px solid #eee'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '15px',
    color: '#444',
    cursor: 'pointer',
    fontWeight: '500'
  },
  copyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '12px',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s',
    fontSize: '14px'
  }
}

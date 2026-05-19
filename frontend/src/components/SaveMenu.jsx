import React, { useState, useEffect } from 'react';
import { Save, DownloadCloud, FileText, X } from 'lucide-react';

export default function SaveMenu({ pages, current }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDownload = (type) => {
    let dataToSave;
    let filename = "Infinity_Notebook_Backup.json";
    
    if (type === 'all') {
       dataToSave = pages;
    } else if (type === 'current') {
       dataToSave = [pages[current]];
       filename = `Infinity_Page_${current + 1}.json`;
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToSave));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", filename);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
    setIsOpen(false);
  };

  return (
    <>
      <div style={{
        position: 'absolute',
        top: isMobile ? '15px' : '20px',
        right: isMobile ? '120px' : '170px',
        zIndex: 200,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0' : '8px',
            padding: isMobile ? '10px' : '10px 20px',
            background: 'linear-gradient(135deg, #2c3e50 0%, #1a252f 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.25)',
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Save Notebook to Device"
        >
          <Save size={18} />
          {!isMobile && <span>Save to Device</span>}
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '130%',
            right: '0',
            background: 'rgba(18, 18, 29, 0.95)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
            width: '220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'shareScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{
                fontSize: '11px',
                color: '#8a8a9a',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Export Options
              </span>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#8a8a9a',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={12} />
              </button>
            </div>
            
            <button 
              onClick={() => handleDownload('all')} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                color: '#fff',
                transition: 'all 0.2s',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(74, 144, 226, 0.1)'; e.currentTarget.style.borderColor = '#4a90e2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; }}
            >
               <DownloadCloud size={16} color="#4a90e2" />
               <span>Entire Notebook</span>
            </button>
            
            <button 
              onClick={() => handleDownload('current')} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: '600',
                color: '#fff',
                transition: 'all 0.2s',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 200, 81, 0.1)'; e.currentTarget.style.borderColor = '#00C851'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; }}
            >
               <FileText size={16} color="#00C851" />
               <span>Current Page ({current + 1})</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

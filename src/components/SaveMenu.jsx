import React, { useState } from 'react';
import { Save, DownloadCloud, FileText } from 'lucide-react';

export default function SaveMenu({ pages, current }) {
  const [isOpen, setIsOpen] = useState(false);

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
    <div style={styles.container}>
      <button onClick={() => setIsOpen(!isOpen)} style={styles.saveBtn}>
        <Save size={18} />
        <span>Save to Device</span>
      </button>

      {isOpen && (
        <div style={styles.popover}>
          <h4 style={styles.title}>Export Options</h4>
          
          <button onClick={() => handleDownload('all')} style={styles.optionBtn}>
             <DownloadCloud size={16} color="#4a90e2" />
             <span>Entire Notebook</span>
          </button>
          
          <button onClick={() => handleDownload('current')} style={styles.optionBtn}>
             <FileText size={16} color="#00C851" />
             <span>Current Page ({current + 1})</span>
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
    right: '160px',
    zIndex: 200,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#2c3e50',
    color: 'white',
    border: 'none',
    borderRadius: '24px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s, background-color 0.2s'
  },
  popover: {
    position: 'absolute',
    top: '130%',
    right: '0',
    background: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(10px)',
    padding: '15px',
    borderRadius: '16px',
    boxShadow: '0 15px 40px rgba(0,0,0,0.2)',
    width: '220px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    border: '1px solid rgba(0,0,0,0.05)',
  },
  title: {
    margin: '0 0 5px 0',
    fontSize: '12px',
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: '#f8f9fa',
    border: '1px solid #eee',
    borderRadius: '10px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#333',
    transition: 'all 0.2s',
    fontSize: '14px',
    textAlign: 'left'
  }
}

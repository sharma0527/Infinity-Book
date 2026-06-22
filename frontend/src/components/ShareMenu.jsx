import React, { useState, useEffect } from 'react';
import { Share2, Link as LinkIcon, Check, Shield, UserPlus, Users, Sparkles, QrCode, X, Trash2, Clock, Eye, MessageSquare, Edit3 } from 'lucide-react';

const getImpureId = () => Date.now() + Math.random();

export default function ShareMenu({ collaborators: liveCollaborators = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState('access'); // 'access', 'users', 'ai'
  const [access, setAccess] = useState('view'); // 'view', 'comment', or 'edit'
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  
  // Custom Settings
  const [expiry, setExpiry] = useState('never'); // '1h', '24h', 'never'
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('view');
  
  // Invited/Live Collaboration Data
  const [invitedCollaborators, setInvitedCollaborators] = useState([]);

  // Derive active collaborators list dynamically to avoid state sync effect cascading renders
  const collaborators = (() => {
    if (liveCollaborators && liveCollaborators.length > 0) {
      const mappedLive = liveCollaborators.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        picture: c.picture,
        role: c.role || (c.email.includes('guest') ? 'view' : 'edit'),
        avatar: c.avatar
      }));
      return [...mappedLive, ...invitedCollaborators];
    }
    return [
      { id: 1, name: 'Sharma', email: 'sharma@gmail.com', role: 'owner', avatar: 'S' },
      { id: 2, name: 'John Doe', email: 'john@gmail.com', role: 'edit', avatar: 'J' },
      { id: 3, name: 'AI Co-Pilot', email: 'ai@infinity.book', role: 'comment', avatar: '∞' },
      ...invitedCollaborators
    ];
  })();

  const [activityLog, setActivityLog] = useState([
    { id: 1, text: 'Sharma created this collaborative notebook', time: '10m ago' },
    { id: 2, text: 'John Doe joined and started live drawing', time: '5m ago' },
    { id: 3, text: 'AI Assistant generated a summary for page 1', time: '2m ago' }
  ]);
  
  // State for AI recap generator
  const [aiRecap, setAiRecap] = useState("Run AI Collaboration suite to generate real-time recaps and task lists.");
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getShareUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('access', access);
    return url.toString();
  };

  const handleCopy = () => {
    const url = getShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    
    const name = inviteEmail.split('@')[0];
    const newId = getImpureId();
    const newCollaborator = {
      id: newId,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email: inviteEmail,
      role: inviteRole,
      avatar: name.charAt(0).toUpperCase()
    };
    
    setInvitedCollaborators([...invitedCollaborators, newCollaborator]);
    const logId = getImpureId();
    setActivityLog([
      { id: logId, text: `Invited ${inviteEmail} as ${inviteRole}`, time: 'Just now' },
      ...activityLog
    ]);
    setInviteEmail('');
  };

  const handleRemoveCollaborator = (id) => {
    const removed = collaborators.find(c => c.id === id);
    if (!removed || removed.role === 'owner') return;
    
    setInvitedCollaborators(invitedCollaborators.filter(c => c.id !== id));
    const logId = getImpureId();
    setActivityLog([
      { id: logId, text: `Revoked access for ${removed.email}`, time: 'Just now' },
      ...activityLog
    ]);
  };

  const generateAIRecap = () => {
    setIsGeneratingRecap(true);
    setAiRecap("Infinity AI is compiling active drawing canvases and notebook data...");
    setTimeout(() => {
      setAiRecap(`✨ COLLABORATIVE WORKSPACE RECAP ✨
- ✏️ Live Editors: Sharma & John Doe active on page 1.
- 🎨 Drawing Canvas: Real-time multiplayer synchronization active.
- ⚡ AI Smart Action Items:
  1. John to finish the wireframe model sketch.
  2. Sharma to verify the JWT database integration in Render.
  3. AI to compile full HTML exports upon project completion.`);
      setIsGeneratingRecap(false);
    }, 1500);
  };

  return (
    <>
      {/* Embedded CSS styling for animations and keyframes */}
      <style>{`
        .share-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(8, 8, 12, 0.85);
          backdrop-filter: blur(14px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: shareFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .share-modal-container {
          background: rgba(18, 18, 29, 0.85);
          backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 30px 70px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1), 0 0 30px rgba(115, 165, 255, 0.15);
          border-radius: 24px;
          width: 560px;
          max-width: 90vw;
          max-height: 85vh;
          overflow-y: auto;
          color: #fff;
          position: relative;
          animation: shareScaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* Mobile full screen bottom sheet */
        @media (max-width: 767px) {
          .share-modal-overlay {
            align-items: flex-end;
          }
          .share-modal-container {
            width: 100%;
            max-width: 100vw;
            border-radius: 28px 28px 0 0;
            max-height: 92vh;
            animation: shareSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1);
          }
        }

        @keyframes shareFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes shareScaleIn {
          from { transform: scale(0.9) translateY(30px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        @keyframes shareSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        /* Custom scrollbar */
        .share-modal-container::-webkit-scrollbar {
          width: 6px;
        }
        .share-modal-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .share-modal-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 3px;
        }
      `}</style>

      {/* Share Button Trigger */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '15px' : '20px',
        right: isMobile ? '70px' : '30px',
        zIndex: 200,
      }}>
        <button 
          onClick={() => setIsOpen(true)} 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '0' : '8px',
            padding: isMobile ? '10px' : '10px 20px',
            background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '24px',
            fontSize: isMobile ? '14px' : '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(74, 144, 226, 0.4)',
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: 'scale(1)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          title="Share Collaborative Workspace"
        >
          <Share2 size={18} />
          {!isMobile && <span>Share</span>}
        </button>
      </div>

      {/* Share Modal Dialog */}
      {isOpen && (
        <div className="share-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="share-modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #73a5ff 0%, #ff5fa2 100%)',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Share2 size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', letterSpacing: '0.5px' }}>Workspace Collaboration</h3>
                  <span style={{ fontSize: '12px', color: '#8a8a9a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles size={12} color="#ff5fa2" /> Real-time active collaboration
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '0 16px'
            }}>
              <button 
                onClick={() => setActiveTab('access')}
                className={`tab-btn ${activeTab === 'access' ? 'active' : ''}`}
              >
                <LinkIcon size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                <span>Links & Access</span>
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
              >
                <Users size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                <span>Collaborators</span>
              </button>
              <button 
                onClick={() => setActiveTab('ai')}
                className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              >
                <Sparkles size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
                <span>AI Co-Worker</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ padding: '24px' }}>
              
              {/* TAB 1: ACCESS & LINKS */}
              {activeTab === 'access' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Notebook Preview Mini-Card */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <h5 style={{ margin: 0, fontSize: '14px', color: '#e2e8f0', fontWeight: '600' }}>Collaborative Workspace</h5>
                      <span style={{ fontSize: '11px', color: '#8a8a9a' }}>Shared real-time canvas active</span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      background: 'rgba(16, 163, 127, 0.15)',
                      color: '#10a37f',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontWeight: '600',
                      border: '1px solid rgba(16, 163, 127, 0.2)'
                    }}>
                      AI ENABLED
                    </span>
                  </div>

                  {/* Permission Selector */}
                  <div>
                    <span style={{ fontSize: '13px', color: '#8a8a9a', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      SHARING ROLE PERMISSION
                    </span>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '8px'
                    }}>
                      {[
                        { id: 'view', title: 'View Only', icon: <Eye size={14} />, desc: 'Read notebook & summaries' },
                        { id: 'comment', title: 'Comment', icon: <MessageSquare size={14} />, desc: 'Review and suggest edits' },
                        { id: 'edit', title: 'Live Edit', icon: <Edit3 size={14} />, desc: 'Draw & sync live canvas' }
                      ].map((item) => {
                        const isSel = access === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setAccess(item.id)}
                            style={{
                              background: isSel ? 'rgba(115, 165, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                              border: isSel ? '1px solid #73a5ff' : '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '12px',
                              padding: '12px',
                              cursor: 'pointer',
                              color: '#fff',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              textAlign: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              boxShadow: isSel ? '0 0 15px rgba(115, 165, 255, 0.2)' : 'none'
                            }}
                          >
                            <div style={{ color: isSel ? '#73a5ff' : '#8a8a9a' }}>{item.icon}</div>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: isSel ? '#73a5ff' : '#e2e8f0' }}>{item.title}</span>
                            <span style={{ fontSize: '10px', color: '#8a8a9a', lineHeight: '1.2' }}>{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Share Link Generation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: '#8a8a9a', fontWeight: '600' }}>SECURE ACCESS LINK</span>
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '4px 4px 4px 12px',
                      alignItems: 'center'
                    }}>
                      <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', color: '#a0aec0' }}>
                        {getShareUrl()}
                      </div>
                      <button
                        onClick={handleCopy}
                        style={{
                          background: copied ? '#10a37f' : '#2d3748',
                          border: 'none',
                          color: '#fff',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {copied ? <Check size={14} /> : <LinkIcon size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Options (QR Code, Expiry) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: '16px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Clock size={16} color="#8a8a9a" />
                      <div>
                        <span style={{ fontSize: '12px', color: '#8a8a9a', display: 'block' }}>Expiry Limit</span>
                        <select 
                          value={expiry} 
                          onChange={(e) => setExpiry(e.target.value)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#e2e8f0',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                        >
                          <option value="never" style={{ background: '#1a1a2e' }}>Never Expire</option>
                          <option value="1h" style={{ background: '#1a1a2e' }}>Expire in 1 hour</option>
                          <option value="24h" style={{ background: '#1a1a2e' }}>Expire in 24 hours</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowQr(!showQr)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#a0aec0',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#73a5ff'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    >
                      <QrCode size={16} />
                      <span>{showQr ? 'Hide QR' : 'Show QR'}</span>
                    </button>
                  </div>

                  {/* QR Code Embed */}
                  {showQr && (
                    <div style={{
                      background: 'white',
                      padding: '16px',
                      borderRadius: '16px',
                      alignSelf: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      animation: 'shareScaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}>
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getShareUrl())}`} 
                        alt="Scan QR code to join" 
                        style={{ width: '150px', height: '150px' }}
                      />
                      <span style={{ fontSize: '11px', color: '#1a1a2e', fontWeight: '700' }}>Scan to join live!</span>
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: COLLABORATORS & INVITES */}
              {activeTab === 'users' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Invite Form */}
                  <form onSubmit={handleInvite} style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      gap: '8px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      padding: '4px 4px 4px 12px',
                      alignItems: 'center'
                    }}>
                      <UserPlus size={16} color="#8a8a9a" />
                      <input 
                        type="email"
                        placeholder="Invite collaborator by Gmail..."
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                          flex: 1
                        }}
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        style={{
                          background: '#2d3748',
                          border: 'none',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        <option value="view">Viewer</option>
                        <option value="comment">Commenter</option>
                        <option value="edit">Editor</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      style={{
                        background: '#73a5ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '0 16px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      Invite
                    </button>
                  </form>

                  {/* Collaborators List */}
                  <div>
                    <span style={{ fontSize: '13px', color: '#8a8a9a', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                      MEMBERS WITH ACCESS ({collaborators.length})
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {collaborators.map((user) => (
                        <div 
                          key={user.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.04)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: user.role === 'owner' ? '#ff5fa2' : '#4a90e2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '700',
                              fontSize: '13px',
                              overflow: 'hidden'
                            }}>
                              {user.picture ? (
                                <img src={user.picture} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                user.avatar
                              )}
                            </div>
                            <div>
                              <h6 style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', fontWeight: '600' }}>
                                {user.name}
                                {user.role === 'owner' && <span style={{ fontSize: '9px', background: 'rgba(255, 95, 162, 0.2)', color: '#ff5fa2', padding: '2px 6px', borderRadius: '8px', marginLeft: '6px' }}>Owner</span>}
                              </h6>
                              <span style={{ fontSize: '11px', color: '#8a8a9a' }}>{user.email}</span>
                            </div>
                          </div>
                          
                          {/* Role Actions */}
                          {user.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveCollaborator(user.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#a0aec0',
                                cursor: 'pointer',
                                padding: '6px',
                                borderRadius: '6px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#a0aec0'; e.currentTarget.style.background = 'transparent'; }}
                              title="Revoke member access"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity Log */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#8a8a9a', fontWeight: '600', display: 'block', marginBottom: '8px' }}>
                      RECENT ACTIVITY LOG
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activityLog.map((log) => (
                        <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#a0aec0' }}>• {log.text}</span>
                          <span style={{ color: '#636e72' }}>{log.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 3: AI CO-WORKER & RECAPS */}
              {activeTab === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Premium Recap Console */}
                  <div style={{
                    background: 'radial-gradient(circle at top left, rgba(115,165,255,0.1), rgba(255,95,162,0.05))',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} color="#ff5fa2" />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>AI Workgroup Recaps</span>
                      </div>
                      <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '8px', color: '#a0aec0' }}>v2.4</span>
                    </div>

                    <p style={{
                      fontSize: '12px',
                      color: '#a0aec0',
                      lineHeight: '1.6',
                      margin: 0,
                      background: 'rgba(0,0,0,0.3)',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {aiRecap}
                    </p>

                    <button
                      onClick={generateAIRecap}
                      disabled={isGeneratingRecap}
                      style={{
                        background: 'linear-gradient(135deg, #73a5ff 0%, #ff5fa2 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        fontWeight: '600',
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 15px rgba(255, 95, 162, 0.25)',
                        opacity: isGeneratingRecap ? 0.7 : 1
                      }}
                    >
                      <Sparkles size={14} />
                      <span>{isGeneratingRecap ? 'Analysing Workgroup...' : 'Generate AI Recap & Action Items'}</span>
                    </button>
                  </div>

                  {/* Smart Comments Suite */}
                  <div>
                    <span style={{ fontSize: '12px', color: '#8a8a9a', fontWeight: '600', display: 'block', marginBottom: '10px' }}>
                      SHARED AI COLLABORATION SUITE
                    </span>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '10px'
                    }}>
                      {[
                        { title: 'AI smart comments', desc: 'Auto-highlight context suggestions' },
                        { title: 'AI task extraction', desc: 'Harvest todo tasks from active drawings' },
                        { title: 'AI summaries', desc: 'Create real-time page summaries' },
                        { title: 'Infinity Intelligence', desc: 'Access unified team co-pilot' }
                      ].map((suite, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0' }}>✨ {suite.title}</span>
                          <span style={{ fontSize: '10px', color: '#8a8a9a', lineHeight: '1.3' }}>{suite.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  );
}

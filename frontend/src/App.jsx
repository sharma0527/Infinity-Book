import React, { useState, useEffect } from "react";
import HybridPage from "./components/HybridPage";
import ChatBar from "./components/ChatBar";
import FixedBook from "./components/FixedBook";
import ShareMenu from "./components/ShareMenu";
import SaveMenu from "./components/SaveMenu";
import FlowingMenu from "./components/FlowingMenu";
import AIAssistant from "./components/AIAssistant";
import HomePage from "./components/HomePage";
import { ChevronLeft, ChevronRight, Home, Sparkles, Menu, X as XIcon, LogOut } from "lucide-react";
import { io } from "socket.io-client";

import { API_URL } from "./config/api";

// Expose the resolved API URL dynamically to the window object so the Chatbot iframe can read it
const rawApiUrl = API_URL;
window.VITE_API_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

// Migrate old backend URLs in localStorage
const savedBackendUrl = localStorage.getItem('infinity_backend_url');
if (savedBackendUrl && savedBackendUrl.includes('infinity-book.onrender.com') && !savedBackendUrl.includes('infinity-book-1.onrender.com')) {
  localStorage.setItem('infinity_backend_url', savedBackendUrl.replace('infinity-book.onrender.com', 'infinity-book-1.onrender.com'));
}

// Extract the base socket URL dynamically from saved settings or default
const getSocketUrl = () => {
  let envUrl = API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl.slice(0, -4) : envUrl;
  }

  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:5000";
  }
  const savedBackend = localStorage.getItem('infinity_backend_url');
  if (savedBackend) {
    try {
      const url = new URL(savedBackend);
      return url.origin;
    } catch {
      // ignore
    }
  }
  return "https://infinity-book-1.onrender.com";
};

const socket = io(getSocketUrl(), { 
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

export default function App() {
  // LocalStorage initialization to persist permanently
  const getInitialPages = () => {
    const saved = localStorage.getItem('infinity_book_data');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error("Error parsing saved notebook", e); }
    }
    return [{ html: "", strokes: [] }];
  };

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('infinity_token'));
  const [pages, setPages] = useState(getInitialPages);
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('doc') ? 'notebook' : 'home';
  });
  const [collaborators, setCollaborators] = useState([]);

  const handleOpenNotebook = () => {
    const params = new URLSearchParams(window.location.search);
    let docId = params.get('doc');
    if (!docId) {
      docId = Math.random().toString(36).substring(2, 10).toUpperCase();
      window.history.pushState({}, '', `/?doc=${docId}`);
    }
    setView('notebook');
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    const params = new URLSearchParams(window.location.search);
    if (!params.get('doc')) {
      const newDocId = Math.random().toString(36).substring(2, 10).toUpperCase();
      window.history.pushState({}, '', `/?doc=${newDocId}`);
    }
    setView('notebook');
  };

  const handleLogout = () => {
    localStorage.removeItem('infinity_token');
    localStorage.removeItem('infinity_name');
    localStorage.removeItem('infinity_email');
    localStorage.removeItem('infinity_picture');
    setIsAuthenticated(false);
    setView('home');
    window.history.pushState({}, '', '/');

    const iframe = document.querySelector('iframe[title="Infinity Intelligence Chat"]');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'LOGOUT_TRIGGER' }, '*');
    }
  };

  const [mode, setMode] = useState("TEXT"); // 'TEXT' or 'PEN'
  const [activeTool, setActiveTool] = useState("pen"); // 'pen', 'pencil', 'highlighter'
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeFont, setActiveFont] = useState("Caveat");
  const [jumpPage, setJumpPage] = useState("");
  const isViewOnly = (() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('access') === 'view' || params.get('access') === 'comment';
  })();
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [orbPos, setOrbPos] = useState(null);
  const orbRef = React.useRef(null);
  const dragState = React.useRef({ isDragging: false, startX: 0, startY: 0 });
  const [isDraggingOrb, setIsDraggingOrb] = useState(false);

  const [panelPos, setPanelPos] = useState(null);
  const panelRef = React.useRef(null);
  const panelDragState = React.useRef({ isDragging: false, startX: 0, startY: 0 });
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);

  const handlePanelPointerDown = (e) => {
    panelDragState.current = { isDragging: false, startX: e.clientX, startY: e.clientY };
    const rect = panelRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const onPointerMove = (moveEv) => {
      panelDragState.current.isDragging = true;
      setIsDraggingPanel(true);
      setPanelPos({
        x: moveEv.clientX - offsetX,
        y: moveEv.clientY - offsetY
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDraggingPanel(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleOrbPointerDown = (e) => {
    dragState.current = { isDragging: false, startX: e.clientX, startY: e.clientY };
    const rect = orbRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const onPointerMove = (moveEv) => {
      if (Math.abs(moveEv.clientX - dragState.current.startX) > 5 || Math.abs(moveEv.clientY - dragState.current.startY) > 5) {
        dragState.current.isDragging = true;
        setIsDraggingOrb(true);
      }
      setOrbPos({
        x: moveEv.clientX - offsetX,
        y: moveEv.clientY - offsetY
      });
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setIsDraggingOrb(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleOrbClick = () => {
    if (!dragState.current.isDragging) {
      setAiPanelOpen(true);
      setTimeout(() => {
        const iframe = document.querySelector('iframe[title="Infinity Intelligence Chat"]');
        if (iframe && iframe.contentWindow) {
          const strippedText = (pages[current]?.html || '').replace(/<[^>]+>/g, ' ').trim();
          iframe.contentWindow.postMessage({ type: 'INJECT_CONTEXT', text: strippedText }, '*');
        }
      }, 500);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    if (view === 'notebook') {
      let docId = params.get('doc');

      // Build user metadata for live presence tracking
      const user = {
        name: localStorage.getItem('infinity_name') || 'Guest',
        email: localStorage.getItem('infinity_email') || 'guest@infinity.book',
        picture: localStorage.getItem('infinity_picture') || ''
      };

      // Stream Initiation
      socket.connect();
      socket.emit("join_document", { roomId: docId, user });

      const handleInitSync = (serverPages) => {
        // If the cloud already holds data for this session, instantly populate it to memory
        if (serverPages && serverPages.length > 0) {
          setPages(serverPages);
        }
      };

      const handleSyncPages = (latestPagesArray) => {
        setPages(latestPagesArray);
      };

      const handlePresenceChange = (activeUsers) => {
        setCollaborators(activeUsers);
      };

      socket.on("init_sync", handleInitSync);
      socket.on("sync_pages", handleSyncPages);
      socket.on("presence_change", handlePresenceChange);

      return () => {
        socket.off("init_sync", handleInitSync);
        socket.off("sync_pages", handleSyncPages);
        socket.off("presence_change", handlePresenceChange);
        socket.disconnect();
      };
    }
  }, [view]);

  // Heartbeat keep-warm effect to query /health route on Render/Railway every 5 minutes
  useEffect(() => {
    const pingServer = () => {
      const url = getSocketUrl();
      fetch(`${url}/health`).catch(() => {});
    };
    pingServer(); // initial ping
    const interval = setInterval(pingServer, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data) {
        if (event.data.type === 'CLOSE_PANEL') {
          setAiPanelOpen(false);
        } else if (event.data.type === 'LOGIN_SUCCESS') {
          setIsAuthenticated(true);
          setView('notebook');
        } else if (event.data.type === 'LOGOUT_TRIGGER') {
          handleLogout();
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Sync helper that replaces standard local setPages
  const broadcastAndSetPages = (newPages) => {
    setPages(newPages);
    if (socket.connected) {
      socket.emit('update_pages', newPages);
    }
  };

  // Save changes automatically
  useEffect(() => {
    localStorage.setItem('infinity_book_data', JSON.stringify(pages));
  }, [pages]);

  const updatePageHtml = (newHtml) => {
    const copy = [...pages];
    copy[current].html = newHtml;
    broadcastAndSetPages(copy);
  };

  const updatePageStrokes = (strokesUpdater) => {
    const copy = [...pages];
    if (typeof strokesUpdater === 'function') {
      copy[current].strokes = strokesUpdater(copy[current].strokes || []);
    } else {
      copy[current].strokes = strokesUpdater || [];
    }
    broadcastAndSetPages(copy);
  };

  const addText = (newText) => {
    // Generate a styled HTML block for the new text ensuring it keeps its specific format forever!
    const textColor = activeTool === 'pencil' ? '#7a7a8a' : activeColor;
    const fontSize = activeFont === 'Amatic SC' || activeFont === 'Caveat' || activeFont === 'Shadows Into Light' ? '28px' : '20px';
    const lineHeight = activeFont === 'Amatic SC' ? '1.2' : '1.6';

    // If it's a pencil, simulate slight transparency
    const opacity = activeTool === 'pencil' ? '0.85' : '1';

    const snippet = `<div style="font-family: '${activeFont}', cursive; color: ${textColor}; font-size: ${fontSize}; line-height: ${lineHeight}; opacity: ${opacity};">${newText}</div>`;

    const copy = [...pages];
    copy[current].html = (copy[current].html || "") + snippet;
    broadcastAndSetPages(copy);
  };

  const addImage = (dataUrl, fileName) => {
    // Wrap the image in a styled block; cursor:pointer lets EditablePage detect the click for editing
    const snippet = `<div style="margin:8px 0;line-height:0;position:relative;display:inline-block;"><img src="${dataUrl}" alt="${fileName || 'image'}" style="width:240px;max-width:100%;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.15);display:block;cursor:pointer;" /></div>`;
    const copy = [...pages];
    copy[current].html = (copy[current].html || "") + snippet;
    broadcastAndSetPages(copy);
  };


  const nextPage = () => {
    if (current >= pages.length - 1) {
      const copy = [...pages, { html: "", strokes: [] }];
      broadcastAndSetPages(copy);
    }
    setCurrent(current + 1);
  };

  const prevPage = () => {
    setCurrent(Math.max(0, current - 1));
  };

  const getPageTopic = (html) => {
    const textWithNewlines = html.replace(/<div[^>]*>/gi, '\n').replace(/<br\s*\/?>/gi, '\n');
    const cleanText = textWithNewlines.replace(/<[^>]+>/g, '').trim();
    if (!cleanText) return "New Page";
    
    // Grab strictly the first logic line
    const firstLine = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0)[0];
    if (!firstLine) return "New Page";
    
    let topic = firstLine;
    if (topic.length > 20) topic = topic.substring(0, 20) + "...";
    return topic;
  };

  const hasContent = (page) => {
    const rawText = page.html.replace(/<[^>]+>/g, '').trim();
    if (rawText.length > 0) return true;
    if (page.strokes && page.strokes.length > 0) return true;
    return false;
  };

  const menuItems = pages
    .map((page, idx) => ({ page, idx }))
    .filter(({ page }) => hasContent(page))
    .map(({ page, idx }) => ({
      text: `Pg ${idx + 1} • ${getPageTopic(page.html)} • ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      image: `https://picsum.photos/600/400?random=${idx + 1}`,
      originalIndex: idx
    }));

  if (view === 'home') {
    return <HomePage onLogin={handleOpenNotebook} />;
  }

  return (
    <div style={styles.appWrapper}>
          {/* Dynamic Sidebar Overlay on Mobile */}
          {isMobile && sidebarOpen && (
            <div 
              onClick={() => setSidebarOpen(false)}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(5px)',
                zIndex: 490,
                animation: 'shareFadeIn 0.25s ease'
              }}
            />
          )}

          {/* Floating Mobile Sidebar Trigger Menu Button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                zIndex: 150,
                background: 'rgba(18, 18, 29, 0.8)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#fff',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                transition: 'all 0.2s'
              }}
              title="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
          )}

          {/* SIDEBAR NAVIGATION using FlowingMenu */}
          <div style={isMobile ? {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "280px",
            transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            zIndex: 500,
            background: "#120F17",
            borderRight: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            boxShadow: sidebarOpen ? "0 0 35px rgba(0,0,0,0.8)" : "none"
          } : styles.sidebarWrap}>
            <div style={styles.sidebarHeader}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => window.location.href = '/'} style={{ ...styles.homeBtn, flex: 1 }} title="Return to Home Page">
                  <Home size={20} color="#fff" />
                  <span style={styles.homeText}>HOME</span>
                </button>
                {isMobile && (
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '10px'
                    }}
                  >
                    <XIcon size={16} />
                  </button>
                )}
              </div>
              <button 
                onClick={() => window.location.href = '/chatbot.ai/index.html'} 
                style={{ ...styles.homeBtn, background: 'linear-gradient(135deg,#5ea2ff,#ff5fa2)', border: 'none', justifyContent: 'center' }} 
                title="Open Infinity GPT"
              >
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', lineHeight: '20px' }}>∞</span>
                <span style={styles.homeText}>INFINITY INTELLIGENCE</span>
              </button>
            </div>
            <div style={styles.menuContainer}>
              <FlowingMenu
                items={menuItems}
                onItemClick={(idx) => {
                  setCurrent(idx);
                  if (isMobile) setSidebarOpen(false);
                }}
                speed={15}
                textColor="#ffffff"
                bgColor="#1a1a1d"
                marqueeBgColor="#4a90e2"
                marqueeTextColor="#ffffff"
                borderColor="#333333"
              />
            </div>
            <div style={styles.sidebarFooter}>
              {isAuthenticated ? (
                <button onClick={handleLogout} style={{ ...styles.homeBtn, background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', width: '100%', justifyContent: 'center' }} title="Log out">
                  <LogOut size={20} color="#ef4444" />
                  <span style={{ ...styles.homeText, color: '#ef4444' }}>LOGOUT</span>
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setAiPanelOpen(true);
                    setTimeout(() => {
                      const iframe = document.querySelector('iframe[title="Infinity Intelligence Chat"]');
                      if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({ type: 'TRIGGER_LOGIN' }, '*');
                      }
                    }, 500);
                  }} 
                  style={{ ...styles.homeBtn, background: 'linear-gradient(135deg, #10a37f, #3b82f6)', border: 'none', width: '100%', justifyContent: 'center' }} 
                  title="Sign In"
                >
                  <Sparkles size={20} color="#fff" />
                  <span style={styles.homeText}>SIGN IN</span>
                </button>
              )}
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div style={styles.mainContentWrap}>
            <SaveMenu pages={pages} current={current} />

            {/* SHARE MENU */}
            <ShareMenu collaborators={collaborators} />

            {/* 3D BOOK VISUAL (Auto-hides on mobile) */}
            <FixedBook />

            {/* EDITABLE/DRAWABLE LAYER */}
            <HybridPage
              html={pages[current].html}
              setHtml={updatePageHtml}
              strokes={pages[current].strokes}
              setStrokes={updatePageStrokes}
              mode={mode}
              activeTool={activeTool}
              activeColor={activeColor}
              activeFont={activeFont}
              isViewOnly={isViewOnly}
            />

            {/* CHAT INPUT AND MODE TOGGLE (Hidden in View Mode) */}
            {!isViewOnly && (
              <ChatBar 
                addText={addText}
                addImage={addImage}
                mode={mode} 
                setMode={setMode} 
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                activeColor={activeColor}
                setActiveColor={setActiveColor}
                activeFont={activeFont}
                setActiveFont={setActiveFont}
              />
            )}

            {/* NAVIGATION (Unlimited Pages Support) */}
            <div style={isMobile ? {
              position: "absolute",
              bottom: "165px",
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              padding: "0 16px",
              boxSizing: "border-box",
              pointerEvents: "none",
              zIndex: 90
            } : styles.navContainer}>
              <div style={isMobile ? {
                position: "absolute",
                top: "-35px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(0,0,0,0.65)",
                padding: "4px 12px",
                borderRadius: "20px",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
                pointerEvents: "auto"
              } : styles.pageIndicatorWrapper}>
                <span style={styles.pageText}>Page</span>
                <input
                  type="text"
                  value={jumpPage !== "" ? jumpPage : (current + 1)}
                  onFocus={() => setJumpPage((current + 1).toString())}
                  onBlur={() => {
                    const parsed = parseInt(jumpPage, 10);
                    if (!isNaN(parsed) && parsed > 0 && parsed <= pages.length) {
                      setCurrent(parsed - 1);
                    }
                    setJumpPage("");
                  }}
                  onChange={(e) => setJumpPage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.target.blur();
                    }
                  }}
                  style={styles.pageInput}
                  title="Type number and press Enter to jump"
                />
                <span style={styles.pageText}>of {pages.length}</span>
              </div>
              <button
                onClick={prevPage}
                style={isMobile ? {
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  transition: "all 0.2s",
                  opacity: current === 0 ? 0.3 : 1
                } : { ...styles.navBtn, opacity: current === 0 ? 0.3 : 1 }}
                disabled={current === 0}
              >
                <ChevronLeft size={isMobile ? 24 : 36} color="white" />
              </button>
              <button 
                onClick={nextPage} 
                style={isMobile ? {
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  transition: "all 0.2s"
                } : styles.navBtn}
              >
                <ChevronRight size={isMobile ? 24 : 36} color="white" />
              </button>
            </div>
          </div>

          {/* AI VOICE ORB & PANEL TRIGGER */}
          <button 
            ref={orbRef}
            onPointerDown={handleOrbPointerDown}
            onClick={handleOrbClick}
            style={isMobile ? {
              position: 'absolute',
              bottom: '225px',
              right: '16px',
              height: '40px',
              padding: '0 14px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(115,165,255,0.9), rgba(255,95,162,0.9))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 30px rgba(255, 95, 162, 0.4)',
              cursor: 'pointer',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '12px',
              transform: aiPanelOpen ? 'scale(0)' : 'scale(1)',
              pointerEvents: aiPanelOpen ? 'none' : 'auto',
            } : {
              position: 'absolute',
              ...(orbPos 
                ? { left: orbPos.x + 'px', top: orbPos.y + 'px', right: 'auto', bottom: 'auto' } 
                : { bottom: '40px', right: '40px' }),
              height: '50px',
              padding: '0 24px',
              borderRadius: '25px',
              background: 'linear-gradient(135deg, rgba(115,165,255,0.8), rgba(255,95,162,0.8))',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 8px 30px rgba(255, 95, 162, 0.3), inset 0 0 10px rgba(255,255,255,0.2)',
              cursor: isDraggingOrb ? 'grabbing' : 'pointer',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '15px',
              transition: isDraggingOrb ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              transform: aiPanelOpen ? 'scale(0)' : 'scale(1)',
              pointerEvents: aiPanelOpen ? 'none' : 'auto',
              touchAction: 'none'
            }}
            title="Ask Infinity Intelligence"
          >
            <Sparkles color="#fff" size={isMobile ? 16 : 20} />
            Ask Infinity Intelligence
          </button>

          {/* AI DRAGGABLE FLOATING PANEL */}
          {aiPanelOpen && (
            <div 
              ref={panelRef}
              style={isMobile ? {
                position: 'absolute',
                top: '10px',
                left: '10px',
                right: '10px',
                bottom: '10px',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                zIndex: 510,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              } : {
                position: 'absolute',
                top: panelPos ? panelPos.y + 'px' : Math.max(10, (orbPos ? orbPos.y : window.innerHeight - 40) - 620) + 'px',
                left: panelPos ? panelPos.x + 'px' : Math.max(10, (orbPos ? orbPos.x : window.innerWidth - 40) - 440) + 'px',
                width: '420px',
                height: '600px',
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                zIndex: 110,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: isDraggingPanel ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
              <div 
                onPointerDown={isMobile ? null : handlePanelPointerDown}
                style={{ 
                  padding: '15px 20px', 
                  borderBottom: '1px solid rgba(255,255,255,0.1)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: isMobile ? 'default' : 'grab',
                  background: 'rgba(255,255,255,0.02)',
                  touchAction: 'none'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#10a37f' }}>∞</span>
                  <span style={{ color: '#fff', fontWeight: 'bold', letterSpacing: '1px', fontSize: '14px' }}>INFINITY INTELLIGENCE</span>
                </div>
                <button 
                  onClick={() => setAiPanelOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px', padding: '5px' }}
                >
                  ✕
                </button>
              </div>
              <iframe 
                src="/chatbot.ai/index.html" 
                style={{ width: '100%', height: '100%', border: 'none', pointerEvents: isDraggingPanel ? 'none' : 'auto' }}
                title="Infinity Intelligence Chat"
              ></iframe>
            </div>
          )}
    </div>
  );
}

const styles = {
  appWrapper: {
    position: "relative",
    width: "100%",
    height: "100vh",
    background: "radial-gradient(circle at center, #2c3e50 0%, #1a1a1d 100%)",
    overflow: "hidden",
    fontFamily: "system-ui, -apple-system, sans-serif",
    display: "flex"
  },
  sidebarWrap: {
    width: "320px",
    height: "100%",
    borderRight: "1px solid rgba(255,255,255,0.1)",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    background: "#120F17"
  },
  sidebarHeader: {
    padding: "20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "stretch"
  },
  sidebarFooter: {
    padding: "20px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "stretch",
    background: "#0c0a0f"
  },
  homeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    padding: "10px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background 0.2s"
  },
  homeText: {
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    letterSpacing: "1px",
    textTransform: "uppercase"
  },
  menuContainer: {
    flex: 1,
    position: "relative"
  },
  mainContentWrap: {
    flex: 1,
    position: "relative",
    height: "100%"
  },
  navContainer: {
    position: "absolute",
    top: "50%",
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    padding: "0 50px",
    transform: "translateY(-50%)",
    boxSizing: "border-box",
    pointerEvents: "none"
  },
  navBtn: {
    background: "rgba(0,0,0,0.5)",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    pointerEvents: "auto",
    transition: "all 0.2s"
  },
  pageIndicatorWrapper: {
    position: "absolute",
    top: "-300px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(0,0,0,0.4)",
    padding: "6px 16px",
    borderRadius: "20px",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  pageText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "14px",
    letterSpacing: "1px",
    textTransform: "uppercase"
  },
  pageInput: {
    width: "40px",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid white",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    textAlign: "center",
    outline: "none"
  }
};

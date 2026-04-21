import React, { useState, useEffect } from "react";
import HybridPage from "./components/HybridPage";
import ChatBar from "./components/ChatBar";
import FixedBook from "./components/FixedBook";
import ShareMenu from "./components/ShareMenu";
import SaveMenu from "./components/SaveMenu";
import FlowingMenu from "./components/FlowingMenu";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";
import { io } from "socket.io-client";

// Global Socket definition allowing multi-tab caching dynamically against the deployment or local container
const socket = io(window.location.hostname === "localhost" ? "http://localhost:3000" : "/", { 
  autoConnect: false 
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

  const [pages, setPages] = useState(getInitialPages);
  const [current, setCurrent] = useState(0);

  const [mode, setMode] = useState("TEXT"); // 'TEXT' or 'PEN'
  const [activeTool, setActiveTool] = useState("pen"); // 'pen', 'pencil', 'highlighter'
  const [activeColor, setActiveColor] = useState("#000000");
  const [activeFont, setActiveFont] = useState("Caveat");
  const [jumpPage, setJumpPage] = useState("");
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('access') === 'view') {
      setIsViewOnly(true);
    }
    
    // Automatically define a multiplayer session room UUID if missing securely
    let docId = params.get('doc');
    if (!docId) {
      docId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('doc', docId);
      window.history.replaceState({}, '', newUrl);
    }
    setRoomId(docId);

    // Stream Initiation
    socket.connect();
    socket.emit("join_document", docId);

    const handleInitSync = (serverPages) => {
      // If the cloud already holds data for this session, instantly populate it to memory
      if (serverPages && serverPages.length > 0) {
        setPages(serverPages);
      }
    };

    const handleSyncPages = (latestPagesArray) => {
      setPages(latestPagesArray);
    };

    socket.on("init_sync", handleInitSync);
    socket.on("sync_pages", handleSyncPages);

    return () => {
      socket.off("init_sync", handleInitSync);
      socket.off("sync_pages", handleSyncPages);
      socket.disconnect();
    };
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

  return (
    <div style={styles.appWrapper}>
      {/* SIDEBAR NAVIGATION using FlowingMenu */}
      <div style={styles.sidebarWrap}>
        <div style={styles.sidebarHeader}>
          <button onClick={() => setCurrent(0)} style={styles.homeBtn} title="Return to Cover Page">
            <Home size={20} color="#fff" />
            <span style={styles.homeText}>HOME</span>
          </button>
        </div>
        <div style={styles.menuContainer}>
          <FlowingMenu
            items={menuItems}
            onItemClick={(idx) => setCurrent(idx)}
            speed={15}
            textColor="#ffffff"
            bgColor="#1a1a1d"
            marqueeBgColor="#4a90e2"
            marqueeTextColor="#ffffff"
            borderColor="#333333"
          />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={styles.mainContentWrap}>
        <SaveMenu pages={pages} current={current} />

        {/* SHARE MENU */}
        <ShareMenu />

        {/* 3D BOOK VISUAL */}
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
        <div style={styles.navContainer}>
          <div style={styles.pageIndicatorWrapper}>
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
            style={{ ...styles.navBtn, opacity: current === 0 ? 0.3 : 1 }}
            disabled={current === 0}
          >
            <ChevronLeft size={36} color="white" />
          </button>
          <button onClick={nextPage} style={styles.navBtn}>
            <ChevronRight size={36} color="white" />
          </button>
        </div>
      </div>
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
    justifyContent: "center"
  },
  homeBtn: {
    display: "flex",
    alignItems: "center",
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

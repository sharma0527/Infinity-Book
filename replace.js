const fs = require('fs');

const path = 'frontend/public/chatbot.ai/index.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Update API_URL
content = content.replace(
    `        let rawApi = parentApiUrl ||
            ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                ? 'http://localhost:5000/api'
                : (localStorage.getItem('infinity_backend_url') || 'https://infinity-book-1.onrender.com/api'));

        let API_URL = '';
        function normalizeAndSetApiUrl(url) {
            if (!url) return;
            let normalized = url.trim();
            if (normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            if (!normalized.endsWith('/api')) {
                normalized = \`\${normalized}/api\`;
            }
            API_URL = normalized;
            localStorage.setItem('infinity_backend_url', normalized);
        }

        normalizeAndSetApiUrl(rawApi);`,
    `        let API_URL = '/api';`
);

// 2. Remove socket.io tag
content = content.replace(`    <script src="./socket.io.min.js"></script>\n`, '');

// 3. Remove initChatSocket call
content = content.replace(`            // Initialize the collaborative socket connection\n            initChatSocket();`, `            // Removed socket.io initialization`);

// 4. Guest limit logic in connectWebSocket
content = content.replace(
    `        async function connectWebSocket(message) {
            receiving = true;

            // Soft Gate Check (Trigger login if user is not authenticated and tries to send chats)
            if (!authToken) {
                if (guestChatCount >= 1) {
                    openAuthModal();
                    receiving = false;
                    return;
                }
                guestChatCount++;
            }`,
    `        async function connectWebSocket(message) {
            receiving = true;

            // Enforce guest limit
            if (!authToken) {
                if (guestChatCount >= 1) {
                    openAuthModal();
                    receiving = false;
                    return;
                }
            }`
);

// 5. Remove socket emits in connectWebSocket
content = content.replace(
    `            chatHistoryDb[activeChatId].messages.push({ role: 'user', content: message });
            saveHistory();
            if (socket) {
                socket.emit('update_chat', { chatId: activeChatId, messages: chatHistoryDb[activeChatId].messages });
            }`,
    `            chatHistoryDb[activeChatId].messages.push({ role: 'user', content: message });
            saveHistory();`
);

content = content.replace(
    `                if (responseText) {
                    chatHistoryDb[activeChatId].messages.push({ role: 'ai', content: responseText });
                    saveHistory();
                    if (socket) {
                        socket.emit('update_chat', { chatId: activeChatId, messages: chatHistoryDb[activeChatId].messages });
                    }
                }`,
    `                if (responseText) {
                    chatHistoryDb[activeChatId].messages.push({ role: 'ai', content: responseText });
                    saveHistory();
                }
                
                // Track completion of the first message for guests and trigger the login modal
                if (!authToken) {
                    guestChatCount++;
                    if (guestChatCount >= 1) {
                        setTimeout(() => {
                            showError("You've used your free search. Please log in or sign up to continue.");
                            openAuthModal();
                        }, 1500);
                    }
                }`
);

// 6. Fix fetchHistory and syncHistory
content = content.replace(
    `        async function fetchHistory() {
            try {
                const response = await fetch(\`\${API_URL}/history/sync\`, {
                    headers: { 'Authorization': \`Bearer \${authToken}\` },
                    credentials: 'include'
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.history) chatHistoryDb = data.history;
                    if (data.projects) projectsDb = data.projects;
                    localStorage.setItem('infinity_ai_history', JSON.stringify(chatHistoryDb));
                    localStorage.setItem('infinity_projects', JSON.stringify(projectsDb));
                } else if (response.status === 401) {
                    logout(); // Token expired
                }
            } catch (err) {
                console.error("Failed to fetch history", err);
            }
        }`,
    `        async function fetchHistory() {
            if (!window.fbAuth || !window.fbAuth.currentUser) return;
            try {
                const uid = window.fbAuth.currentUser.uid;
                const docSnap = await window.fbGetDoc(window.fbDoc(window.fbDb, "users", uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.history) chatHistoryDb = data.history;
                    if (data.projects) projectsDb = data.projects;
                    localStorage.setItem('infinity_ai_history', JSON.stringify(chatHistoryDb));
                    localStorage.setItem('infinity_projects', JSON.stringify(projectsDb));
                    renderSidebarHistory();
                    renderProjects();
                }
            } catch (err) {
                console.error("Failed to fetch history", err);
            }
        }`
);

content = content.replace(
    `        async function syncHistory() {
            if (!authToken) return;
            try {
                await fetch(\`\${API_URL}/history/sync\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${authToken}\` },
                    credentials: 'include',
                    body: JSON.stringify({ history: chatHistoryDb, projects: projectsDb })
                });
            } catch (err) {
                console.error("Failed to sync history", err);
            }
        }`,
    `        async function syncHistory() {
            if (!authToken || !window.fbAuth || !window.fbAuth.currentUser) return;
            try {
                const uid = window.fbAuth.currentUser.uid;
                // Merge history into user document
                await window.fbSetDoc(window.fbDoc(window.fbDb, "users", uid), {
                    history: chatHistoryDb,
                    projects: projectsDb
                }, { merge: true });
            } catch (err) {
                console.error("Failed to sync history", err);
            }
        }`
);

// 7. Remove socket emit from renderWelcomeMessage
content = content.replace(
    `                    // Save to history and emit to socket
                    chatHistoryDb[activeChatId].messages.push({ role: 'ai', content: welcomeText });
                    saveHistory();

                    if (socket) {
                        socket.emit('update_chat', { chatId: activeChatId, messages: chatHistoryDb[activeChatId].messages });
                    }`,
    `                    // Save to history
                    chatHistoryDb[activeChatId].messages.push({ role: 'ai', content: welcomeText });
                    saveHistory();`
);

// 8. Remove initChatSocket block
content = content.replace(
    `        // ─── Collaborative Live Sharing & Syncing Logic ───
        let chatSharePermission = 'edit'; // default view/comment/edit
        let socket = null;

        // Initialize Socket.io connection using root server address
        function initChatSocket() {
            if (typeof io === 'undefined') {
                console.warn('Socket.io library not loaded. Real-time collaboration is disabled.');
                return;
            }
            const socketUrl = API_URL.replace('/api', '');
            try {
                socket = io(socketUrl, { transports: ['websocket', 'polling'] });
                
                socket.on('connect', () => {
                    console.log('Connected to collaboration socket server.');
                    if (activeChatId) {
                        socket.emit('join_chat', activeChatId);
                    }
                });

                socket.on('init_chat_sync', (messages) => {
                    syncCollaborativeMessages(messages);
                });

                socket.on('sync_chat', (messages) => {
                    syncCollaborativeMessages(messages);
                });

                socket.on('disconnect', () => {
                    console.log('Collaboration socket disconnected.');
                });
            } catch (err) {
                console.error('Failed to initialize Socket.io client:', err);
            }
        }`,
    `        // ─── Collaborative Live Sharing & Syncing Logic ───
        let chatSharePermission = 'edit'; // default view/comment/edit`
);

// 9. Remove loadChat and startNewChat socket overrides
content = content.replace(
    `        // Trigger Socket sync whenever activeChatId changes
        const originalLoadChat = loadChat;
        loadChat = function(chatId) {
            originalLoadChat(chatId);
            if (socket) {
                socket.emit('join_chat', chatId);
            }
        };

        const originalStartNewChat = startNewChat;
        startNewChat = function(keepProject = false) {
            originalStartNewChat(keepProject);
            if (socket && activeChatId) {
                socket.emit('join_chat', activeChatId);
            }
        };`,
    ``
);

fs.writeFileSync(path, content);
console.log("Done");

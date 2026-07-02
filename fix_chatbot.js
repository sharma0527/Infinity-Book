const fs = require('fs');
let content = fs.readFileSync('frontend/public/chatbot.ai/index.html', 'utf8');

// 1. Add onAuthStateChanged
const authInitCode = `
        // Setup Firebase Auth State Listener
        window.fbOnAuthStateChanged(window.fbAuth, (user) => {
            if (user) {
                // User is signed in
                userEmail = user.email;
                userName = user.displayName || user.email.split('@')[0];
                authToken = user.accessToken; // legacy compat
                
                // Fetch history from Firestore
                fetchHistory();
                updateAuthUI();
                renderProjects();
                renderSidebarHistory();
            } else {
                // User is signed out
                userEmail = null;
                userName = null;
                authToken = null;
                chatHistoryDb = {};
                projectsDb = [];
                activeProject = null;
                updateAuthUI();
            }
        });
`;
content = content.replace('let guestChatCount = 0;', authInitCode + '\n        let guestChatCount = 0;');

// 2. Fix Auth Functions
content = content.replace(/async function handleSignupSubmit\(\) \{[\s\S]*?async function handleLoginSubmit\(\) \{/, 
`async function handleSignupSubmit() {
            const errorDiv = document.getElementById('auth-error');
            const successDiv = document.getElementById('auth-success');
            errorDiv.classList.add('hidden');
            successDiv.classList.add('hidden');

            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;

            if (!name || !email || !password || !confirmPassword) return showError('All fields are required.');
            if (password !== confirmPassword) return showError('Passwords do not match.');
            if (password.length < 6) return showError('Password must be at least 6 characters.');

            showSuccess('Creating account...');

            try {
                const userCredential = await window.fbCreateUserWithEmailAndPassword(window.fbAuth, email, password);
                // Try to set display name
                try {
                   const { updateProfile } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
                   await updateProfile(userCredential.user, { displayName: name });
                } catch(e) {}
                
                showSuccess('Account created! Logging in...');
                setTimeout(() => {
                    closeModal('auth-modal');
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'LOGIN_SUCCESS' }, '*');
                    }
                }, 1500);
            } catch (err) {
                showError(err.message || 'Failed to create account.');
            }
        }

        async function handleLoginSubmit() {`);

content = content.replace(/async function handleLoginSubmit\(\) \{[\s\S]*?async function handleGoogleLogin\(\) \{/, 
`async function handleLoginSubmit() {
            const errorDiv = document.getElementById('auth-error');
            const successDiv = document.getElementById('auth-success');
            errorDiv.classList.add('hidden');
            successDiv.classList.add('hidden');

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            if (!email || !password) return showError('Email and password are required.');
            
            showSuccess('Logging in...');

            try {
                await window.fbSignInWithEmailAndPassword(window.fbAuth, email, password);
                showSuccess('Login successful!');
                setTimeout(() => {
                    closeModal('auth-modal');
                    if (window.parent && window.parent !== window) {
                        window.parent.postMessage({ type: 'LOGIN_SUCCESS' }, '*');
                    }
                }, 1000);
            } catch (err) {
                showError('Invalid email or password.');
            }
        }

        async function handleGoogleLogin() {`);

content = content.replace(/async function handleGoogleLogin\(\) \{[\s\S]*?async function handleForgotPasswordSubmit\(\) \{/, 
`async function handleGoogleLogin() {
            try {
                await window.fbSignInWithPopup(window.fbAuth, window.fbGoogleProvider);
                closeModal('auth-modal');
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ type: 'LOGIN_SUCCESS' }, '*');
                }
            } catch (err) {
                console.error("Google login error:", err);
            }
        }

        async function handleForgotPasswordSubmit() {`);


// 3. Fix syncHistory check
content = content.replace('if (!authToken || !window.fbAuth || !window.fbAuth.currentUser) return;', 'if (!window.fbAuth || !window.fbAuth.currentUser) return;');

fs.writeFileSync('frontend/public/chatbot.ai/index.html', content);
console.log('Done!');

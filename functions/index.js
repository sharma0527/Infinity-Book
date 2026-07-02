const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Set CORS for all functions
setGlobalOptions({ cors: true, maxInstances: 10 });

function streamMockResponse(res, messages) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const answer = `Hello! I am Infinity AI, your intelligent copilot. I am here to help you brainstorm and organize your book. You can:\n- Write and sketch collaboratively in real-time.\n- Manage multiple pages using the navigation arrows.\n- Export your work at any time.\n\nWhat would you like to build or discuss next?`;
    
    const words = answer.split(' ');
    let wordIndex = 0;
    
    const interval = setInterval(() => {
        if (wordIndex < words.length) {
            const chunk = words[wordIndex] + (wordIndex === words.length - 1 ? '' : ' ');
            const data = {
                choices: [
                    { delta: { content: chunk } }
                ]
            };
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            wordIndex++;
        } else {
            res.write('data: [DONE]\n\n');
            res.end();
            clearInterval(interval);
        }
    }, 50);
}

async function streamFromProvider(res, messages, provider) {
    const isGroq = provider === 'groq';
    const apiKey = isGroq ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
    const endpoint = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions';
    const model = isGroq ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct:free';

    if (!apiKey) {
        throw new Error(`No API key configured for ${provider}`);
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    if (!isGroq) {
        headers['HTTP-Referer'] = 'https://infinity-book.pages.dev';
        headers['X-Title'] = 'Infinity Book';
    }

    console.log(`[${provider.toUpperCase()}] Attempting streaming chat completion using model ${model}...`);
    // Note: Node 18+ has built-in fetch
    const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            stream: true
        })
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`${provider.toUpperCase()} HTTP error ${response.status}: ${errorText}`);
    }

    if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
    }

    let fullResponseText = "";
    
    // Process stream using async iterator
    for await (const chunk of response.body) {
        res.write(chunk);
        
        const chunkStr = chunk.toString();
        const lines = chunkStr.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const parsed = JSON.parse(line.substring(6));
                    if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                        fullResponseText += parsed.choices[0].delta.content;
                    }
                } catch (e) {
                    // Ignore partial chunk parse errors
                }
            }
        }
    }
    
    res.end();
    return fullResponseText;
}

exports.streamChat = onRequest({
    secrets: ["OPENROUTER_API_KEY", "GROQ_API_KEY"],
    timeoutSeconds: 120,
    cors: [
        "https://infinity-book.pages.dev",
        "https://infinity-book-seven.vercel.app",
        "http://localhost:5173"
    ]
}, async (req, res) => {

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    let { messages, chatId, userId } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages array." });
    }

    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && lastUserMsg.role === 'user' && chatId && userId) {
        try {
            await db.collection("chats").add({
                userId,
                chatId,
                role: 'user',
                message: lastUserMsg.content,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error("DB Save Error:", err);
        }
    }

    const systemPrompt = `You are Infinity AI, an advanced AI assistant specialized in education, programming, research, productivity, writing, and problem solving.\n\nProvide accurate, detailed, well-structured answers.\n\nWhen explaining concepts:\n* Start with a simple explanation.\n* Then provide technical details.\n* Give examples whenever useful.\n\nFor coding questions:\n* Provide complete working code.\n* Explain important parts.\n* Suggest best practices.\n\nFor career and learning questions:\n* Give practical step-by-step guidance.\n\nAlways prioritize correctness, clarity, and usefulness.`;

    if (messages.length === 0 || messages[0].role !== 'system') {
        messages = [{ role: 'system', content: systemPrompt }, ...messages];
    }

    let fullResponseText = "";
    let success = false;

    // 1. Try OpenRouter First
    if (process.env.OPENROUTER_API_KEY) {
        try {
            fullResponseText = await streamFromProvider(res, messages, 'openrouter');
            success = true;
        } catch (err) {
            console.error(`[OpenRouter] Failover trigger:`, err.message);
        }
    }

    // 2. Try Groq Second
    if (!success && process.env.GROQ_API_KEY) {
        try {
            fullResponseText = await streamFromProvider(res, messages, 'groq');
            success = true;
        } catch (err) {
            console.error(`[Groq] Failover trigger:`, err.message);
        }
    }

    // 3. Fallback to Local Mock
    if (!success) {
        console.warn(`[Failover] Both providers failed or keys missing. Streaming local mock.`);
        const mockAnswer = `Hello! I am Infinity AI, your intelligent copilot. I am here to help you brainstorm and organize your book. You can:\n- Write and sketch collaboratively in real-time.\n- Manage multiple pages using the navigation arrows.\n- Export your work at any time.\n\nWhat would you like to build or discuss next?`;
        if (chatId && userId) {
            db.collection("chats").add({ 
                userId, 
                chatId, 
                role: 'assistant', 
                message: mockAnswer,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            }).catch(console.error);
        }
        return streamMockResponse(res, messages);
    }

    // Save successful AI response to DB
    if (chatId && userId && fullResponseText) {
        try {
            await db.collection("chats").add({
                userId,
                chatId,
                role: 'assistant',
                message: fullResponseText,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            console.error("Failed to save assistant msg:", err);
        }
    }
});

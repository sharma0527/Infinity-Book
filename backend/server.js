require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();
const allowedOrigins = [
  "https://8e780c41.infinity-book.pages.dev",
  "https://infinity-book.pages.dev",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl, mobile apps)
      if (!origin) return callback(null, true);

      // Allow all origins for the dynamic Cloudflare Pages preview URLs to work seamlessly
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization"
    ]
  })
);

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://8e780c41.infinity-book.pages.dev', 'http://localhost:5173', 'http://localhost:3000', '*'],
    methods: ["GET", "POST", "OPTIONS"]
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('✅ MongoDB Connected');
}).catch((err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on("connected", () => {
  console.log("✅ MongoDB Reconnected");
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠ MongoDB Disconnected");
});

mongoose.connection.on("error", (err) => {
  console.log("❌ MongoDB Error:", err);
});

// Cache memory for real-time document sync. 
// Note: When server reboots, active ephemeral cache restarts!
const Book = require('./models/Book');
const roomData = new Map();
const activeRooms = new Map(); // roomId -> Map(socketId -> userObj)

io.on('connection', (socket) => {
  console.log('User joined server stream:', socket.id);

  socket.on('join_document', async (data) => {
    let roomId, user;
    if (data && typeof data === 'object') {
      roomId = data.roomId;
      user = data.user;
    } else {
      roomId = data;
    }

    if (!roomId) return;

    socket.join(roomId);
    socket.roomId = roomId;

    // Presence tracking
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Map());
    }
    const roomUsers = activeRooms.get(roomId);
    
    const userProfile = {
      id: socket.id,
      name: user?.name || 'Guest',
      email: user?.email || 'guest@infinity.book',
      picture: user?.picture || '',
      avatar: (user?.name || 'G').charAt(0).toUpperCase()
    };
    roomUsers.set(socket.id, userProfile);
    
    console.log(`Client ${socket.id} (${userProfile.name}) manifested Document ${roomId}`);

    // Broadcast updated presence list
    io.to(roomId).emit('presence_change', Array.from(roomUsers.values()));

    // Push the active collaborative state back to the newly joined member instantly
    if (roomData.has(roomId)) {
      socket.emit('init_sync', roomData.get(roomId));
    } else {
      try {
        const book = await Book.findById(roomId);
        if (book && book.content && book.content.length > 0) {
          roomData.set(roomId, book.content);
          socket.emit('init_sync', book.content);
        } else {
          const initialPages = [{ html: "", strokes: [] }];
          roomData.set(roomId, initialPages);
          socket.emit('init_sync', initialPages);
        }
      } catch (err) {
        console.error("Error loading book on join:", err);
        const initialPages = [{ html: "", strokes: [] }];
        socket.emit('init_sync', initialPages);
      }
    }
  });

  socket.on('update_pages', async (latestPagesArray) => {
    if (socket.roomId) {
      // Overwrite ephemeral document storage so late joiners don't miss data
      roomData.set(socket.roomId, latestPagesArray);

      // Blast changes directly to all other collaborators in the room
      socket.to(socket.roomId).emit('sync_pages', latestPagesArray);

      // Asynchronously persist the changes to MongoDB
      try {
        await Book.findOneAndUpdate(
          { _id: socket.roomId },
          { content: latestPagesArray },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error("Error autosaving book content to DB:", err);
      }
    }
  });

  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    socket.chatId = chatId;
    console.log(`Client ${socket.id} entered collaborative AI Chat ${chatId}`);

    if (roomData.has(chatId)) {
      socket.emit('init_chat_sync', roomData.get(chatId));
    }
  });

  socket.on('update_chat', ({ chatId, messages }) => {
    if (chatId) {
      roomData.set(chatId, messages);
      socket.to(chatId).emit('sync_chat', messages);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from stream:', socket.id);
    if (socket.roomId && activeRooms.has(socket.roomId)) {
      const roomUsers = activeRooms.get(socket.roomId);
      roomUsers.delete(socket.id);
      if (roomUsers.size === 0) {
        activeRooms.delete(socket.roomId);
      } else {
        io.to(socket.roomId).emit('presence_change', Array.from(roomUsers.values()));
      }
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// Health Route for keep-warm pings
app.get('/health', (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

const Chat = require('./models/Chat');

// Local Intelligent Fallback Engine when no OpenRouter API keys are configured or all keys fail
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
          {
            delta: {
              content: chunk
            }
          }
        ]
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      wordIndex++;
    } else {
      res.write('data: [DONE]\n\n');
      res.end();
      clearInterval(interval);
    }
  }, 50); // 50ms per word is perfect, speedy and feels very premium!
}


// Streaming Chat Endpoint with Grok API Failover Pool and Local Mock Fallback
app.post('/api/chat', async (req, res) => {
  let { messages, chatId, userId } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array." });
  }

  // Save the latest user message to DB
  const lastUserMsg = messages[messages.length - 1];
  if (lastUserMsg && lastUserMsg.role === 'user' && chatId && userId) {
      try {
          await Chat.create({
              userId,
              chatId,
              role: 'user',
              message: lastUserMsg.content
          });
      } catch (err) {
          console.error("DB Save Error:", err);
      }
  }

  // Inject the required Infinity AI System Persona if not already present
  const systemPrompt = `You are Infinity AI, an advanced AI assistant specialized in education, programming, research, productivity, writing, and problem solving.

Provide accurate, detailed, well-structured answers.

When explaining concepts:
* Start with a simple explanation.
* Then provide technical details.
* Give examples whenever useful.

For coding questions:
* Provide complete working code.
* Explain important parts.
* Suggest best practices.

For career and learning questions:
* Give practical step-by-step guidance.

Always prioritize correctness, clarity, and usefulness.`;

  if (messages.length === 0 || messages[0].role !== 'system') {
    messages = [{ role: 'system', content: systemPrompt }, ...messages];
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log("OpenRouter Active:", !!apiKey);

  if (!apiKey) {
    console.warn(`[OpenRouter] No API key configured in OPENROUTER_API_KEY. Streaming local mock fallback response.`);
    // Save mock assistant message
    const mockAnswer = `Hello! I am Infinity AI, your intelligent copilot. I am here to help you brainstorm and organize your book. You can:\n- Write and sketch collaboratively in real-time.\n- Manage multiple pages using the navigation arrows.\n- Export your work at any time.\n\nWhat would you like to build or discuss next?`;
    if (chatId && userId) {
        Chat.create({ userId, chatId, role: 'assistant', message: mockAnswer }).catch(console.error);
    }
    return streamMockResponse(res, messages);
  }

  try {
    console.log(`[OpenRouter] Attempting streaming chat completion...`);
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://infinity-book.pages.dev',
        'X-Title': 'Infinity Book'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: messages,
        temperature: 0.7,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`HTTP error ${response.status}: ${errorText}`);
    }

    // Configure SSE response headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;
    let fullResponseText = "";

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        res.write(value);
        // Try to parse SSE format to extract content for DB
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');
        for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                    const parsed = JSON.parse(line.substring(6));
                    if (parsed.choices && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                        fullResponseText += parsed.choices[0].delta.content;
                    }
                } catch (e) {
                    // Ignore parse errors on partial chunks
                }
            }
        }
      }
    }

    res.end();
    
    // Save AI response to DB
    if (chatId && userId && fullResponseText) {
        Chat.create({
            userId,
            chatId,
            role: 'assistant',
            message: fullResponseText
        }).catch(err => console.error("Failed to save assistant msg:", err));
    }

    console.log(`[OpenRouter] Stream completed successfully.`);
    return; // Success!

  } catch (err) {
    console.error(`[OpenRouter] Request failed:`, err.message);
    // If headers are already sent, we failed in the middle of streaming, so we must stop.
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted mid-transmission.", details: err.message })}\n\n`);
      res.end();
      return;
    }

    // If it fails before sending headers, fallback to mock response
    console.warn(`[OpenRouter] Request failed before streaming. Falling back to local mock response.`);
    const mockAnswer = `Hello! I am Infinity AI, your intelligent copilot. I am here to help you brainstorm and organize your book. You can:\n- Write and sketch collaboratively in real-time.\n- Manage multiple pages using the navigation arrows.\n- Export your work at any time.\n\nWhat would you like to build or discuss next?`;
    if (chatId && userId) {
        Chat.create({ userId, chatId, role: 'assistant', message: mockAnswer }).catch(console.error);
    }
    return streamMockResponse(res, messages);
  }
});

// Serve static files from the React frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Test Route for deployment verification
app.get('/test', (req, res) => {
  res.json({
    success: true,
    message: "Backend working correctly"
  });
});

// Fallback Route for Single Page Application
app.get('*any', (req, res) => {
  const indexPath = path.join(__dirname, '../frontend/dist/index.html');
  require('fs').stat(indexPath, (err) => {
    if (err) {
      return res.status(200).send("Backend is running. API endpoints are available.");
    }
    res.sendFile(indexPath);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error(err);
  }
});

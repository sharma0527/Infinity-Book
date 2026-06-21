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

app.options("*", cors());
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
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Cache memory for real-time document sync. 
// Note: When server reboots, active ephemeral cache restarts!
const roomData = new Map();

io.on('connection', (socket) => {
  console.log('User joined server stream:', socket.id);

  socket.on('join_document', (roomId) => {
    socket.join(roomId);
    socket.roomId = roomId;
    console.log(`Client ${socket.id} manifested Document ${roomId}`);

    // Push the active collaborative state back to the newly joined member instantly
    if (roomData.has(roomId)) {
      socket.emit('init_sync', roomData.get(roomId));
    }
  });

  socket.on('update_pages', (latestPagesArray) => {
    if (socket.roomId) {
      // Overwrite ephemeral document storage so late joiners don't miss data
      roomData.set(socket.roomId, latestPagesArray);
      
      // Blast changes directly to all other collaborators in the room
      socket.to(socket.roomId).emit('sync_pages', latestPagesArray);
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
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// Local Intelligent Fallback Engine when no Grok API keys are configured or all keys fail
function streamMockResponse(res, messages) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const lastUserMsg = messages[messages.length - 1]?.content || "";
  let answer = "";

  if (/draw|sketch|pencil|highlighter|pen/i.test(lastUserMsg)) {
    answer = `I see you are interested in sketching or drawing! I am running in local backup mode (since the Grok API keys are not active), but I can guide you:
1. Click on the **Pen**, **Pencil**, or **Highlighter** tool in the bottom menu bar to sketch.
2. Select your drawing color using the color circle picker.
3. If you want to add text alongside your sketches, just type in the input bar and press Enter!`;
  } else if (/share|collaborate|invite|room|friend/i.test(lastUserMsg)) {
    answer = `Collaboration is one of the best features of the Infinity Book! 
To collaborate with friends:
1. Click the **"Share Workspace"** button in the top right.
2. Copy the secure live link and send it to your friends.
3. When they open it, their inputs and drawings will sync instantly on your page in real-time using WebSockets!`;
  } else if (/save|export|pdf|download/i.test(lastUserMsg)) {
    answer = `You can easily preserve your work! 
1. Use the **Save Menu** in the upper part of the sidebar or workspace area.
2. You can download your current page as an image or export the entire book as a JSON backup so you can load it back later on any machine.`;
  } else {
    answer = `Hello! I am Infinity AI, your intelligent copilot. 

*Note: I am currently running in a zero-key local fallback engine since no active Grok API keys are configured in the environment variables.*

Even in backup mode, I am here to help you brainstorm and organize your book. You can:
- **Write and sketch** collaboratively in real-time.
- **Manage multiple pages** using the navigation arrows.
- **Export your work** at any time.

What would you like to build or discuss next?`;
  }

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
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array." });
  }

  const apiKeys = [
    process.env.GROK_API_KEY_1,
    process.env.GROK_API_KEY_2
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    console.warn(`[Grok Failover] No API keys configured. Streaming local mock fallback response.`);
    return streamMockResponse(res, messages);
  }

  let lastError = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    try {
      console.log(`[Grok Failover] Attempting streaming chat completion with key index ${i + 1}/${apiKeys.length}...`);
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'grok-2-1212',
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
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          res.write(value);
        }
      }

      res.end();
      console.log(`[Grok Failover] Stream completed successfully with key index ${i + 1}.`);
      return; // Success!

    } catch (err) {
      console.error(`[Grok Failover] Key index ${i + 1} failed:`, err.message);
      lastError = err;
      // If headers are already sent, we failed in the middle of streaming, so we must stop.
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Stream interrupted mid-transmission.", details: err.message })}\n\n`);
        res.end();
        return;
      }
    }
  }

  // If all keys failed before starting the response stream, stream local fallback instead of returning 500 error!
  console.warn(`[Grok Failover] All configured keys failed. Streaming local mock fallback response.`);
  return streamMockResponse(res, messages);
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
server.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));

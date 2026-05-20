require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
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

// Streaming Chat Endpoint with Grok API Failover Pool
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
    return res.status(500).json({ error: "No Grok API keys configured on the server." });
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

  // If all keys failed before starting the response stream
  return res.status(500).json({
    error: "All configured Grok API keys failed to respond.",
    details: lastError?.message
  });
});

// Root Route
app.get('/', (req, res) => {
    res.send('Infinity AI Backend Server is running successfully!');
});

// Test Route for deployment verification
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: "Backend working correctly"
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));

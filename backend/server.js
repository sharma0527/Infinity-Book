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
  } else if (/what is ai|about infinity/i.test(lastUserMsg)) {
    answer = `Hello! I am Infinity AI, your intelligent copilot.

*Note: I am currently running in a zero-key local fallback engine since no active Grok API keys are configured in the environment variables.*

Even in backup mode, I am here to help you brainstorm and organize your book. You can:
- Write and sketch collaboratively in real-time.
- Manage multiple pages using the navigation arrows.
- Export your work at any time.

# What is Artificial Intelligence (AI)?
Artificial Intelligence (AI) is a branch of computer science that enables machines to perform tasks that normally require human intelligence.
AI systems can learn from data, recognize patterns, understand language, solve problems, make decisions, and generate content.

Examples of AI include:
• Virtual assistants and chatbots
• Language translation systems
• Recommendation engines
• Image and speech recognition
• Autonomous systems
• AI-powered writing and coding assistants

Infinity AI uses advanced artificial intelligence to help users learn, create, research, write, and solve problems more effectively.

What would you like to build or discuss next?`;
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
  let { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array." });
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

  const apiKey = process.env.GROK_API_KEY;
  console.log("Grok Active:", !!apiKey);

  if (!apiKey) {
    console.warn(`[Grok] No API key configured in GROK_API_KEY. Streaming local mock fallback response.`);
    return streamMockResponse(res, messages);
  }

  try {
    console.log(`[Grok] Attempting streaming chat completion...`);
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
    console.log(`[Grok] Stream completed successfully.`);
    return; // Success!

  } catch (err) {
    console.error(`[Grok] Request failed:`, err.message);
    // If headers are already sent, we failed in the middle of streaming, so we must stop.
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted mid-transmission.", details: err.message })}\n\n`);
      res.end();
      return;
    }
    
    // If it fails before sending headers, fallback to mock response
    console.warn(`[Grok] Request failed before streaming. Falling back to local mock response.`);
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
server.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));

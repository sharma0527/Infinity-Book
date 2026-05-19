require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const historyRoutes = require('./routes/history');

const app = express();
app.use(cors());
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

  socket.on('disconnect', () => {
    console.log('Client disconnected from stream:', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/history', historyRoutes);

// Root Route
app.get('/', (req, res) => {
    res.send('Infinity AI Backend Server is running successfully!');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));

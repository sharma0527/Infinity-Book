import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Infinity MultiPlayer Daemon operational on PORT ${PORT}`);
});

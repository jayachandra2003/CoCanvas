import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/types';
import { connectDatabase, isDatabaseConnected } from './config/db';
import { setupSocketHandlers } from './socket/socketHandler';
import { generateRoomCode } from './utils/idGenerator';
import { RoomManager } from './rooms/RoomManager';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// CORS configuration
app.use(
  cors({
    origin: CLIENT_URL === '*' ? '*' : [CLIENT_URL, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app.use(express.json());

// Initialize Socket.IO with WebSockets and polling fallback
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: CLIENT_URL === '*' ? '*' : [CLIENT_URL, 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 10000,
  transports: ['websocket', 'polling'],
});

// Setup real-time handlers
setupSocketHandlers(io);

// REST API Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: isDatabaseConnected() ? 'connected' : 'in-memory-fallback',
    uptime: process.uptime(),
  });
});

app.get('/api/generate-room-code', (req, res) => {
  const code = generateRoomCode();
  res.json({ roomCode: code });
});

app.get('/api/rooms/:roomId', async (req, res) => {
  const { roomId } = req.params;
  try {
    const roomManager = RoomManager.getInstance();
    const room = await roomManager.getOrCreateRoom(roomId);
    res.json({
      room: roomManager.getRoomState(room),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve room details' });
  }
});

// Start Server
async function startServer() {
  await connectDatabase();

  server.listen(PORT, () => {
    console.log(`🚀 CollabDraw Backend Server running on port ${PORT}`);
    console.log(`📡 Socket.IO initialized. Allowed origin: ${CLIENT_URL}`);
  });
}

startServer();

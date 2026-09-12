const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10MB
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// In-memory Rooms Store: roomId -> { elements: Map<id, element>, users: Map<socketId, userState> }
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      elements: new Map(),
      users: new Map(),
      messages: [],
      hostSessionId: null,
      hostDisconnectTimeout: null,
      mode: 'friendly' // 'friendly' (all can draw) | 'host' (presentation mode, only host can draw)
    });
  }
  return rooms.get(roomId);
}

function canUserModifyCanvas(room, userSessionId) {
  if (!room) return false;
  if (!room.mode || room.mode === 'friendly') return true;
  // In host mode, only host can draw
  return room.hostSessionId && room.hostSessionId === userSessionId;
}

io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUser = null;

  // 5. Join Room
  socket.on('room:join', ({ roomId, user }) => {
    if (!roomId) return;
    
    // Leave previous room if any
    if (currentRoomId && currentRoomId !== roomId) {
      socket.leave(currentRoomId);
      const prevRoom = rooms.get(currentRoomId);
      if (prevRoom) {
        prevRoom.users.delete(socket.id);
        socket.to(currentRoomId).emit('user:left', { socketId: socket.id });
      }
    }

    currentRoomId = roomId;
    const userSessionId = (user && user.sessionId) ? user.sessionId : socket.id;

    currentUser = {
      id: socket.id,
      sessionId: userSessionId,
      name: (user && (user.name || user.username)) ? (user.name || user.username) : 'Anonymous',
      avatar: (user && user.avatar) ? user.avatar : '🦊',
      color: (user && user.color) ? user.color : '#FF6B4A',
      cursor: { x: 0, y: 0 },
      chatText: ''
    };

    socket.join(roomId);
    const room = getOrCreateRoom(roomId);

    // If there was a pending host disconnect timeout and the host reconnected, cancel it!
    if (room.hostSessionId === userSessionId) {
      if (room.hostDisconnectTimeout) {
        clearTimeout(room.hostDisconnectTimeout);
        room.hostDisconnectTimeout = null;
      }
    } else if (!room.hostSessionId) {
      // First person to create/join the room becomes host
      room.hostSessionId = userSessionId;
    }

    room.users.set(socket.id, currentUser);

    const elementsArray = Array.from(room.elements.values());
    const usersArray = Array.from(room.users.values());
    
    socket.emit('room:init', {
      roomId,
      elements: elementsArray,
      users: usersArray,
      messages: room.messages || [],
      selfId: socket.id,
      selfSessionId: userSessionId,
      hostSessionId: room.hostSessionId,
      roomMode: room.mode || 'friendly'
    });

    socket.to(roomId).emit('user:joined', currentUser);
    socket.to(roomId).emit('room:host_changed', { hostSessionId: room.hostSessionId });
  });

  // Host Mode Switcher (Friendly vs Host / Presentation Mode)
  socket.on('room:set_mode', ({ mode }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    // Only the host can toggle room mode
    if (room.hostSessionId && room.hostSessionId !== userSessionId) {
      return;
    }

    if (mode === 'friendly' || mode === 'host') {
      room.mode = mode;
      io.to(currentRoomId).emit('room:mode_changed', { mode: room.mode, hostSessionId: room.hostSessionId });
    }
  });

  // 6. Real-Time Canvas Events
  socket.on('cursor:move', (data) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    
    const user = room.users.get(socket.id);
    if (user) {
      user.cursor = { x: data.x, y: data.y };
      if (data.chatText !== undefined) user.chatText = data.chatText;
    }

    socket.to(currentRoomId).emit('cursor:update', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      chatText: data.chatText
    });
  });

  socket.on('laser:trail', (data) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('laser:trailed', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      color: data.color
    });
  });

  socket.on('element:add', (element) => {
    if (!currentRoomId || !element || !element.id) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    room.elements.set(element.id, element);
    socket.to(currentRoomId).emit('element:added', element);
  });

  socket.on('element:update', (updatedElement) => {
    if (!currentRoomId || !updatedElement || !updatedElement.id) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    if (room.elements.has(updatedElement.id)) {
      const existing = room.elements.get(updatedElement.id);
      const merged = { ...existing, ...updatedElement };
      room.elements.set(updatedElement.id, merged);
      socket.to(currentRoomId).emit('element:updated', merged);
    } else {
      room.elements.set(updatedElement.id, updatedElement);
      socket.to(currentRoomId).emit('element:updated', updatedElement);
    }
  });

  socket.on('elements:batch_update', (elements) => {
    if (!currentRoomId || !Array.isArray(elements)) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    elements.forEach((el) => {
      if (el && el.id) room.elements.set(el.id, el);
    });
    socket.to(currentRoomId).emit('elements:batch_updated', elements);
  });

  socket.on('element:delete', (elementId) => {
    if (!currentRoomId || !elementId) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    room.elements.delete(elementId);
    socket.to(currentRoomId).emit('element:deleted', elementId);
  });

  socket.on('elements:clear', () => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    room.elements.clear();
    socket.to(currentRoomId).emit('elements:cleared');
  });

  socket.on('reaction:emit', (reactionData) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('reaction:emitted', {
      socketId: socket.id,
      ...reactionData
    });
  });

  socket.on('radar:ping', (pingData) => {
    if (!currentRoomId) return;
    socket.to(currentRoomId).emit('radar:pinged', {
      socketId: socket.id,
      ...pingData
    });
  });

  // ChatSpace Real-Time Messages
  socket.on('chat:send', (data) => {
    if (!currentRoomId || !data) return;
    const room = getOrCreateRoom(currentRoomId);
    const user = room.users.get(socket.id) || currentUser || {};
    const text = (data.text || '').trim();

    if (!text) return;

    const message = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      sessionId: user.sessionId || (currentUser ? currentUser.sessionId : socket.id),
      socketId: socket.id,
      name: (user && (user.name || user.username)) ? (user.name || user.username) : 'Collaborator',
      avatar: (user && user.avatar) ? user.avatar : '🦊',
      color: (user && user.color) ? user.color : '#FF6B4A',
      text: String(text).slice(0, 800),
      timestamp: Date.now()
    };

    if (!room.messages) room.messages = [];
    room.messages.push(message);
    if (room.messages.length > 100) room.messages.shift();
    io.to(currentRoomId).emit('chat:received', message);
  });

  // Chat Clear History
  socket.on('chat:clear', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    room.messages = [];
    io.to(currentRoomId).emit('chat:cleared');
  });

  // Explicit Leave Room
  socket.on('room:leave', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const leavingUser = room.users.get(socket.id);
        const userSessionId = (leavingUser && leavingUser.sessionId) || (currentUser && currentUser.sessionId) || socket.id;
        room.users.delete(socket.id);

        socket.to(currentRoomId).emit('user:left', {
          socketId: socket.id,
          name: leavingUser ? leavingUser.name : (currentUser ? currentUser.name : 'Someone'),
          avatar: leavingUser ? leavingUser.avatar : (currentUser ? currentUser.avatar : '👤')
        });

        // If the leaving user was the host, immediately transfer host to next person
        if (room.hostSessionId === userSessionId) {
          if (room.hostDisconnectTimeout) {
            clearTimeout(room.hostDisconnectTimeout);
            room.hostDisconnectTimeout = null;
          }
          const nextUser = room.users.values().next().value;
          if (nextUser) {
            room.hostSessionId = nextUser.sessionId;
            io.to(currentRoomId).emit('room:host_changed', { hostSessionId: room.hostSessionId });
          } else {
            room.hostSessionId = null;
          }
        }
      }
      socket.leave(currentRoomId);
      currentRoomId = null;
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const leavingUser = room.users.get(socket.id);
        const userSessionId = (leavingUser && leavingUser.sessionId) || (currentUser && currentUser.sessionId) || socket.id;
        room.users.delete(socket.id);
        socket.to(currentRoomId).emit('user:left', {
          socketId: socket.id,
          name: leavingUser ? leavingUser.name : (currentUser ? currentUser.name : 'Someone'),
          avatar: leavingUser ? leavingUser.avatar : (currentUser ? currentUser.avatar : '👤')
        });

        // If the disconnected user was the host, wait 5 seconds before transferring host (in case they just refreshed)
        if (room.hostSessionId === userSessionId) {
          if (room.hostDisconnectTimeout) clearTimeout(room.hostDisconnectTimeout);
          room.hostDisconnectTimeout = setTimeout(() => {
            const nextUser = room.users.values().next().value;
            if (nextUser) {
              room.hostSessionId = nextUser.sessionId;
              io.to(currentRoomId).emit('room:host_changed', { hostSessionId: room.hostSessionId });
            } else {
              room.hostSessionId = null;
            }
          }, 5000);
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`🔥 CoCanvas Server running smoothly on http://localhost:${PORT}`);
});

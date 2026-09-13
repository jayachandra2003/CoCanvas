const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

// Load environment variables from .env file if present
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  } else {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of envLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const k = trimmed.substring(0, idx).trim();
          const v = trimmed.substring(idx + 1).trim();
          if (!process.env[k]) process.env[k] = v;
        }
      }
    }
  }
} catch (e) {
  // Ignore
}

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

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory Rooms Store: roomId -> { elements: Map<id, element>, users: Map<socketId, userState> }
const rooms = new Map();

function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    const defaultPageId = 'page_1';
    const pages = new Map();
    pages.set(defaultPageId, {
      id: defaultPageId,
      number: 1,
      name: 'Page 1',
      elements: new Map(),
      createdAt: Date.now()
    });

    rooms.set(roomId, {
      elements: new Map(),
      pages,
      activePageId: defaultPageId,
      canvasMode: 'fixed_page', // 'infinite' | 'fixed_page'
      pageWidth: 1600,
      pageHeight: 1000,
      users: new Map(),
      messages: [],
      hostSessionId: null,
      coHostSessionIds: new Set(),
      hostDisconnectTimeout: null,
      mode: 'friendly', // 'friendly' (all can draw) | 'host' (presentation mode, only hosts can draw)
      kickCounts: new Map(), // sessionId -> number of times kicked
      bannedSessionIds: new Set() // Set of banned sessionIds (kicked >= 2 times)
    });
  }
  return rooms.get(roomId);
}

function serializePages(room) {
  if (!room || !room.pages) return [];
  return Array.from(room.pages.values()).map((p) => ({
    id: p.id,
    number: p.number,
    name: p.name,
    elements: Array.from(p.elements.values()),
    createdAt: p.createdAt
  }));
}

function isUserAnyHost(room, userSessionId) {
  if (!room || !userSessionId) return false;
  return room.hostSessionId === userSessionId || (room.coHostSessionIds && room.coHostSessionIds.has(userSessionId));
}

function canUserModifyCanvas(room, userSessionId) {
  if (!room) return false;
  if (!room.mode || room.mode === 'friendly') return true;
  // In host mode, Primary Host and Co-Hosts can draw
  return isUserAnyHost(room, userSessionId);
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

    const room = getOrCreateRoom(roomId);
    const userSessionId = (user && user.sessionId) ? user.sessionId : socket.id;

    // Check if user is banned from this room (kicked 2 or more times)
    const kickCount = (room.kickCounts && room.kickCounts.get(userSessionId)) || 0;
    if ((room.bannedSessionIds && room.bannedSessionIds.has(userSessionId)) || kickCount >= 2) {
      socket.emit('room:banned', {
        roomId,
        reason: 'You cannot join this room because you were kicked 2 times by the Host.'
      });
      return;
    }

    currentRoomId = roomId;

    currentUser = {
      id: socket.id,
      sessionId: userSessionId,
      name: (user && (user.name || user.username)) ? (user.name || user.username) : 'Anonymous',
      avatar: (user && user.avatar) ? user.avatar : '🦊',
      color: (user && user.color) ? user.color : '#FF6B4A',
      activePageId: room.activePageId || 'page_1',
      cursor: { x: 0, y: 0 },
      chatText: ''
    };

    socket.join(roomId);

    // If there was a pending host disconnect timeout and the host reconnected, cancel it!
    if (room.hostSessionId === userSessionId) {
      if (room.hostDisconnectTimeout) {
        clearTimeout(room.hostDisconnectTimeout);
        room.hostDisconnectTimeout = null;
      }
    } else if (!room.hostSessionId) {
      // First person to create/join the room becomes primary host
      room.hostSessionId = userSessionId;
    }

    room.users.set(socket.id, currentUser);

    const elementsArray = Array.from(room.elements.values());
    const usersArray = Array.from(room.users.values());
    const pagesData = serializePages(room);
    
    socket.emit('room:init', {
      roomId,
      elements: elementsArray,
      pages: pagesData,
      activePageId: room.activePageId || 'page_1',
      canvasMode: room.canvasMode || 'fixed_page',
      pageWidth: room.pageWidth || 1600,
      pageHeight: room.pageHeight || 1000,
      users: usersArray,
      messages: room.messages || [],
      selfId: socket.id,
      selfSessionId: userSessionId,
      hostSessionId: room.hostSessionId,
      coHostSessionIds: Array.from(room.coHostSessionIds || []),
      roomMode: room.mode || 'friendly'
    });

    socket.to(roomId).emit('user:joined', currentUser);
    socket.to(roomId).emit('room:hosts_updated', {
      hostSessionId: room.hostSessionId,
      coHostSessionIds: Array.from(room.coHostSessionIds || [])
    });
  });

  // Host Mode Switcher (Friendly vs Host / Presentation Mode)
  socket.on('room:set_mode', ({ mode }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    // Primary Host and Co-Hosts can toggle room mode
    if (!isUserAnyHost(room, userSessionId)) {
      return;
    }

    if (mode === 'friendly' || mode === 'host') {
      room.mode = mode;
      io.to(currentRoomId).emit('room:mode_changed', {
        mode: room.mode,
        hostSessionId: room.hostSessionId,
        coHostSessionIds: Array.from(room.coHostSessionIds || [])
      });
    }
  });

  // Transfer Primary Host Ownership
  socket.on('room:transfer_host', ({ targetSessionId }) => {
    if (!currentRoomId || !targetSessionId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    // Only current Primary Host can transfer host ownership
    if (room.hostSessionId !== userSessionId) return;

    let targetUser = null;
    for (const u of room.users.values()) {
      if (u.sessionId === targetSessionId) {
        targetUser = u;
        break;
      }
    }
    if (!targetUser) return;

    const previousHostSessionId = room.hostSessionId;
    room.hostSessionId = targetSessionId;
    if (room.coHostSessionIds) {
      room.coHostSessionIds.delete(targetSessionId);
    }

    io.to(currentRoomId).emit('room:hosts_updated', {
      hostSessionId: room.hostSessionId,
      coHostSessionIds: Array.from(room.coHostSessionIds || []),
      action: 'transfer',
      previousHostSessionId,
      newHostSessionId: targetSessionId,
      fromName: currentUser.name || 'Previous Host',
      toName: targetUser.name || 'New Host'
    });
  });

  // Share Host (Add/Remove Co-Host)
  socket.on('room:toggle_cohost', ({ targetSessionId, isCoHost }) => {
    if (!currentRoomId || !targetSessionId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    // Only current Primary Host can grant/revoke co-host access
    if (room.hostSessionId !== userSessionId) return;
    if (targetSessionId === room.hostSessionId) return;

    if (!room.coHostSessionIds) room.coHostSessionIds = new Set();

    let targetUser = null;
    for (const u of room.users.values()) {
      if (u.sessionId === targetSessionId) {
        targetUser = u;
        break;
      }
    }

    if (isCoHost) {
      room.coHostSessionIds.add(targetSessionId);
    } else {
      room.coHostSessionIds.delete(targetSessionId);
    }

    io.to(currentRoomId).emit('room:hosts_updated', {
      hostSessionId: room.hostSessionId,
      coHostSessionIds: Array.from(room.coHostSessionIds || []),
      action: 'cohost',
      targetSessionId,
      isCoHost: !!isCoHost,
      targetName: targetUser ? targetUser.name : 'Teammate'
    });
  });

  // Kick User from Room (Primary Host and Co-Host access)
  socket.on('room:kick_user', ({ targetSessionId, targetSocketId, name }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const requesterSessionId = (currentUser && currentUser.sessionId) || socket.id;
    const isRequesterPrimary = room.hostSessionId === requesterSessionId;
    const isRequesterCoHost = !!(room.coHostSessionIds && room.coHostSessionIds.has(requesterSessionId));

    // Only Hosts can kick participants
    if (!isRequesterPrimary && !isRequesterCoHost) {
      socket.emit('toast:error', 'You must be a Host to remove members.');
      return;
    }

    // Find the target socket and user in this room
    let targetSocket = null;
    let targetUser = null;
    let targetActualSocketId = targetSocketId;

    for (const [sId, u] of room.users.entries()) {
      if ((targetSessionId && u.sessionId === targetSessionId) || (targetSocketId && sId === targetSocketId)) {
        targetUser = u;
        targetActualSocketId = sId;
        targetSocket = io.sockets.sockets.get(sId);
        break;
      }
    }

    if (!targetUser) return;

    // Protection: Cannot kick self or Primary Host
    if (targetUser.sessionId === room.hostSessionId) {
      socket.emit('toast:error', 'Cannot remove the Primary Host.');
      return;
    }

    // Protection: Co-hosts cannot kick other Co-hosts
    if (!isRequesterPrimary && room.coHostSessionIds && room.coHostSessionIds.has(targetUser.sessionId)) {
      socket.emit('toast:error', 'Co-Hosts cannot remove other Co-Hosts.');
      return;
    }

    // Update kick count for target user
    if (!room.kickCounts) room.kickCounts = new Map();
    if (!room.bannedSessionIds) room.bannedSessionIds = new Set();

    const previousKicks = room.kickCounts.get(targetUser.sessionId) || 0;
    const newKickCount = previousKicks + 1;
    room.kickCounts.set(targetUser.sessionId, newKickCount);

    const isBanned = newKickCount >= 2;
    if (isBanned) {
      room.bannedSessionIds.add(targetUser.sessionId);
    }

    // Remove target from room
    room.users.delete(targetActualSocketId);
    if (room.coHostSessionIds) {
      room.coHostSessionIds.delete(targetUser.sessionId);
    }

    const kickedUserName = targetUser.name || name || 'Member';
    const hostName = currentUser ? (currentUser.name || 'Host') : 'Host';

    // Notify kicked client
    if (targetSocket) {
      targetSocket.emit('room:kicked', {
        reason: isBanned
          ? `You have been kicked 2 times and are permanently banned from room ${currentRoomId}.`
          : `You were removed from room ${currentRoomId} by ${hostName}. (Warning 1/2: If kicked again, you will be permanently banned from this room).`,
        by: hostName,
        isBanned,
        kickCount: newKickCount
      });
      targetSocket.leave(currentRoomId);
    }

    // Broadcast user departure to remaining room members
    io.to(currentRoomId).emit('user:left', {
      socketId: targetActualSocketId,
      name: kickedUserName,
      avatar: targetUser.avatar || '👤'
    });

    io.to(currentRoomId).emit('room:user_kicked_broadcast', {
      name: kickedUserName,
      byName: hostName
    });

    // Also push updated host list if needed
    io.to(currentRoomId).emit('room:hosts_updated', {
      hostSessionId: room.hostSessionId,
      coHostSessionIds: Array.from(room.coHostSessionIds || [])
    });
  });

  // 6. Real-Time Canvas Events
  socket.on('cursor:move', (data) => {
    if (!currentRoomId || !data) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.users.has(socket.id)) return;
    
    const user = room.users.get(socket.id);
    if (user) {
      user.cursor = { x: data.x, y: data.y };
      if (data.pageId) user.activePageId = data.pageId;
      if (data.canvasMode) user.canvasMode = data.canvasMode;
      if (data.chatText !== undefined) user.chatText = data.chatText;
    }

    socket.to(currentRoomId).emit('cursor:update', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      pageId: data.pageId || (user && user.activePageId) || 'page_1',
      canvasMode: data.canvasMode || (user && user.canvasMode),
      chatText: data.chatText
    });
  });

  socket.on('laser:trail', (data) => {
    if (!currentRoomId || !data) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.users.has(socket.id)) return;
    socket.to(currentRoomId).emit('laser:trailed', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      pageId: data.pageId,
      color: data.color
    });
  });

  // Live in-progress drawing streaming
  socket.on('draw:live', (data) => {
    if (!currentRoomId || !data) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.users.has(socket.id)) return;
    socket.to(currentRoomId).emit('draw:lived', {
      socketId: socket.id,
      ...data
    });
  });

  socket.on('draw:live_end', (data) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || !room.users.has(socket.id)) return;
    socket.to(currentRoomId).emit('draw:lived_end', {
      socketId: socket.id,
      ...(data || {})
    });
  });

  // Canvas Mode Switcher ('fixed_page' vs 'infinite')
  socket.on('canvas:set_mode', ({ mode }) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (!room) return;
    if (mode !== 'fixed_page' && mode !== 'infinite') return;

    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    const isHost = isUserAnyHost(room, userSessionId);
    const isHostMode = room.mode === 'host';

    // In Host Mode, only Host can change the canvas layout for all participants
    if (isHostMode && isHost) {
      room.canvasMode = mode;
      io.to(currentRoomId).emit('canvas:mode_changed', {
        canvasMode: room.canvasMode,
        byHost: true,
        hostName: (currentUser && currentUser.name) || 'Host'
      });
    } else if (!isHostMode) {
      // In Friendly Mode, canvas layout mode is an independent personal preference!
      // Do not broadcast to other users in the room.
      const user = room.users.get(socket.id);
      if (user) {
        user.canvasMode = mode;
      }
    }
  });

  // Page Management: Create Page
  socket.on('page:create', (data = {}) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (!room) return;
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    const isHost = isUserAnyHost(room, userSessionId);
    const isHostMode = room.mode === 'host';

    const pageCount = room.pages ? room.pages.size : 0;
    const nextNumber = pageCount + 1;
    const newPageId = 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newPage = {
      id: newPageId,
      number: nextNumber,
      name: data.name || `Page ${nextNumber}`,
      elements: new Map(),
      createdAt: Date.now()
    };

    if (!room.pages) room.pages = new Map();
    room.pages.set(newPageId, newPage);

    if (isHostMode && isHost) {
      room.activePageId = newPageId;
    }

    io.to(currentRoomId).emit('page:created', {
      page: {
        id: newPage.id,
        number: newPage.number,
        name: newPage.name,
        elements: [],
        createdAt: newPage.createdAt
      },
      activePageId: newPageId,
      pages: serializePages(room),
      creatorSocketId: socket.id,
      byHost: isHost && isHostMode
    });
  });

  // Page Management: Switch Active Page
  socket.on('page:switch', ({ pageId }) => {
    if (!currentRoomId || !pageId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (!room || !room.pages) return;

    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    const isHost = isUserAnyHost(room, userSessionId);
    const isHostMode = room.mode === 'host';

    // In Host Mode, only Hosts can switch the presentation page for all spectators
    if (isHostMode && isHost) {
      if (room.pages.has(pageId)) {
        room.activePageId = pageId;
        io.to(currentRoomId).emit('page:switched', {
          activePageId: pageId,
          byHost: true,
          hostName: (currentUser && currentUser.name) || 'Host'
        });
      }
    } else if (!isHostMode) {
      // In Friendly Mode, page switching is completely independent per user!
      // Each collaborator can work on their own page without forcing others to move.
      const user = room.users.get(socket.id);
      if (user && room.pages.has(pageId)) {
        user.activePageId = pageId;
        socket.to(currentRoomId).emit('user:page_changed', {
          socketId: socket.id,
          activePageId: pageId
        });
      }
    }
  });

  // Page Management: Delete Page
  socket.on('page:delete', ({ pageId }) => {
    if (!currentRoomId || !pageId) return;
    const room = getOrCreateRoom(currentRoomId);
    if (!room || !room.pages || room.pages.size <= 1) return;
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    // Delete elements belonging to this page
    for (const [elId, el] of room.elements.entries()) {
      if (el.pageId === pageId) {
        room.elements.delete(elId);
      }
    }

    room.pages.delete(pageId);

    // Re-number remaining pages
    let num = 1;
    let fallbackActiveId = null;
    for (const p of room.pages.values()) {
      p.number = num++;
      if (!fallbackActiveId) fallbackActiveId = p.id;
    }

    if (room.activePageId === pageId) {
      room.activePageId = fallbackActiveId;
    }

    io.to(currentRoomId).emit('page:deleted', {
      deletedPageId: pageId,
      activePageId: room.activePageId,
      pages: serializePages(room)
    });
  });

  socket.on('element:add', (element) => {
    if (!currentRoomId || !element || !element.id) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    if (!element.pageId) {
      element.pageId = (element.canvasMode === 'infinite') ? 'playground' : (room.activePageId || 'page_1');
    }

    room.elements.set(element.id, element);
    if (room.pages && room.pages.has(element.pageId)) {
      room.pages.get(element.pageId).elements.set(element.id, element);
    }

    socket.to(currentRoomId).emit('element:added', element);
  });

  socket.on('element:update', (updatedElement) => {
    if (!currentRoomId || !updatedElement || !updatedElement.id) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    let merged;
    if (room.elements.has(updatedElement.id)) {
      const existing = room.elements.get(updatedElement.id);
      merged = { ...existing, ...updatedElement };
      room.elements.set(updatedElement.id, merged);
    } else {
      merged = updatedElement;
      room.elements.set(updatedElement.id, merged);
    }

    if (merged.pageId && room.pages && room.pages.has(merged.pageId)) {
      room.pages.get(merged.pageId).elements.set(merged.id, merged);
    }

    socket.to(currentRoomId).emit('element:updated', merged);
  });

  socket.on('elements:batch_update', (elements) => {
    if (!currentRoomId || !Array.isArray(elements)) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    elements.forEach((el) => {
      if (el && el.id) {
        if (!el.pageId) el.pageId = (el.canvasMode === 'infinite') ? 'playground' : (room.activePageId || 'page_1');
        room.elements.set(el.id, el);
        if (room.pages && room.pages.has(el.pageId)) {
          room.pages.get(el.pageId).elements.set(el.id, el);
        }
      }
    });
    socket.to(currentRoomId).emit('elements:batch_updated', elements);
  });

  socket.on('element:delete', (elementId) => {
    if (!currentRoomId || !elementId) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    const el = room.elements.get(elementId);
    if (el && el.pageId && room.pages && room.pages.has(el.pageId)) {
      room.pages.get(el.pageId).elements.delete(elementId);
    }
    room.elements.delete(elementId);
    socket.to(currentRoomId).emit('element:deleted', elementId);
  });

  socket.on('elements:clear', (data = {}) => {
    if (!currentRoomId) return;
    const room = getOrCreateRoom(currentRoomId);
    const userSessionId = (currentUser && currentUser.sessionId) || socket.id;
    if (!canUserModifyCanvas(room, userSessionId)) return;

    const targetPageId = data.pageId || (room.canvasMode === 'fixed_page' ? room.activePageId : 'playground');

    if (targetPageId === 'playground') {
      for (const [elId, el] of room.elements.entries()) {
        if (el.pageId === 'playground' || el.canvasMode === 'infinite') {
          room.elements.delete(elId);
        }
      }
      socket.to(currentRoomId).emit('elements:cleared', { pageId: 'playground' });
    } else if (targetPageId && room.pages && room.pages.has(targetPageId)) {
      room.pages.get(targetPageId).elements.clear();
      for (const [elId, el] of room.elements.entries()) {
        if (el.pageId === targetPageId && el.canvasMode !== 'infinite') {
          room.elements.delete(elId);
        }
      }
      socket.to(currentRoomId).emit('elements:cleared', { pageId: targetPageId });
    } else {
      room.elements.clear();
      if (room.pages) {
        for (const p of room.pages.values()) {
          p.elements.clear();
        }
      }
      socket.to(currentRoomId).emit('elements:cleared', {});
    }
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

  function handoverHost(room, rId) {
    if (room.hostDisconnectTimeout) {
      clearTimeout(room.hostDisconnectTimeout);
      room.hostDisconnectTimeout = null;
    }
    let nextHost = null;
    // 1. Try to promote an online Co-Host first
    if (room.coHostSessionIds && room.coHostSessionIds.size > 0) {
      for (const u of room.users.values()) {
        if (room.coHostSessionIds.has(u.sessionId)) {
          nextHost = u;
          room.coHostSessionIds.delete(u.sessionId);
          break;
        }
      }
    }
    // 2. Otherwise promote next available user in room
    if (!nextHost) {
      nextHost = room.users.values().next().value;
    }

    if (nextHost) {
      room.hostSessionId = nextHost.sessionId;
      io.to(rId).emit('room:hosts_updated', {
        hostSessionId: room.hostSessionId,
        coHostSessionIds: Array.from(room.coHostSessionIds || []),
        action: 'auto_handover',
        newHostSessionId: room.hostSessionId,
        toName: nextHost.name || 'New Host'
      });
    } else {
      room.hostSessionId = null;
    }
  }

  // Explicit Leave Room
  socket.on('room:leave', () => {
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        const leavingUser = room.users.get(socket.id);
        const userSessionId = (leavingUser && leavingUser.sessionId) || (currentUser && currentUser.sessionId) || socket.id;
        room.users.delete(socket.id);
        if (room.coHostSessionIds) {
          room.coHostSessionIds.delete(userSessionId);
        }

        socket.to(currentRoomId).emit('user:left', {
          socketId: socket.id,
          name: leavingUser ? leavingUser.name : (currentUser ? currentUser.name : 'Someone'),
          avatar: leavingUser ? leavingUser.avatar : (currentUser ? currentUser.avatar : '👤')
        });

        // If the leaving user was the host, immediately transfer host
        if (room.hostSessionId === userSessionId) {
          handoverHost(room, currentRoomId);
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
            handoverHost(room, currentRoomId);
          }, 5000);
        }
      }
    }
  });
});

// Feedback & Bug Report Direct Email Delivery
const DEFAULT_RESEND_KEY = Buffer.from('cmVfWmZLZ21MdUFfSmttN3hxd0NybUZEa0ROeVpBTGpYNFdr', 'base64').toString('utf8');
const RESEND_API_KEY = process.env.RESEND_API_KEY || DEFAULT_RESEND_KEY;
const FEEDBACK_EMAIL = 'cocanvascontact@gmail.com';
const feedbackList = [];

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function sendResendFeedbackEmail(feedbackEntry, attachedImageBase64) {
  const isGeneral = feedbackEntry.type === 'general';
  const ratingStars = feedbackEntry.rating ? '⭐'.repeat(feedbackEntry.rating) : '5 / 5 Stars';
  const hasValidEmail = isValidEmail(feedbackEntry.email);

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 22px 24px; text-align: left;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; color: #ffffff;">🎨 CoCanvas Feedback Notification</h2>
        <span style="display: inline-block; background: ${isGeneral ? '#f59e0b' : '#ef4444'}; color: #ffffff; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.5px;">
          ${isGeneral ? '💬 General Feedback' : '🐛 Bug & Issue Report'}
        </span>
      </div>

      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 700; width: 130px; font-size: 13px; text-transform: uppercase;">From User:</td>
            <td style="padding: 8px 0; color: #0f172a; font-weight: 800; font-size: 15px;">${feedbackEntry.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 700; font-size: 13px; text-transform: uppercase;">User Email:</td>
            <td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${hasValidEmail ? `<a href="mailto:${feedbackEntry.email}" style="color: #2563eb; font-weight: 600; text-decoration: none;">${feedbackEntry.email}</a>` : '<span style="color: #94a3b8; font-style: italic;">Not provided</span>'}</td>
          </tr>
          ${isGeneral ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 700; font-size: 13px; text-transform: uppercase;">Star Rating:</td>
            <td style="padding: 8px 0; color: #b45309; font-weight: 800; font-size: 16px;">${ratingStars} (${feedbackEntry.rating} / 5)</td>
          </tr>` : `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 700; font-size: 13px; text-transform: uppercase;">Bug Summary:</td>
            <td style="padding: 8px 0; color: #dc2626; font-weight: 800; font-size: 15px;">${feedbackEntry.subject}</td>
          </tr>`}
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-weight: 700; font-size: 13px; text-transform: uppercase;">Received At:</td>
            <td style="padding: 8px 0; color: #475569; font-size: 13px;">${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid ${isGeneral ? '#f59e0b' : '#ef4444'}; border-radius: 6px; padding: 16px; margin: 16px 0;">
          <h4 style="margin: 0 0 8px 0; color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px;">
            ${isGeneral ? 'Feedback / Description:' : 'Issue Details & Steps to Reproduce:'}
          </h4>
          <p style="margin: 0; color: #0f172a; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${feedbackEntry.message}</p>
        </div>

        ${attachedImageBase64 ? `
        <div style="margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <h4 style="margin: 0 0 10px 0; color: #334155; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px;">Attached Screenshot:</h4>
          <img src="${attachedImageBase64}" alt="Attached Screenshot" style="max-width: 100%; border-radius: 8px; border: 1.5px solid #cbd5e1;" />
        </div>` : ''}
      </div>

      <div style="background-color: #f1f5f9; padding: 14px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
        <span style="font-size: 12px; color: #64748b; font-weight: 600;">CoCanvas Real-Time Whiteboard &bull; Built by Jaya Chandra Vennam</span>
      </div>
    </div>
  `;

  // 1. Dispatch via Resend API to cocanvascontact@gmail.com
  if (RESEND_API_KEY) {
    try {
      const resendPayload = {
        from: 'CoCanvas Feedback <onboarding@resend.dev>',
        to: [FEEDBACK_EMAIL],
        subject: `[CoCanvas ${feedbackEntry.type.toUpperCase()}] ${feedbackEntry.subject} - from ${feedbackEntry.name}`,
        html: htmlContent
      };

      if (hasValidEmail) {
        resendPayload.reply_to = feedbackEntry.email;
      }

      if (attachedImageBase64 && typeof attachedImageBase64 === 'string' && attachedImageBase64.includes('base64,')) {
        const rawBase64 = attachedImageBase64.split('base64,')[1];
        resendPayload.attachments = [
          {
            filename: 'screenshot.png',
            content: rawBase64
          }
        ];
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendPayload)
      });
      const resData = await res.json();
      if (res.ok) {
        console.log(`🚀 [Resend] Email delivered to ${FEEDBACK_EMAIL}! Email ID:`, resData.id);
      } else {
        console.warn('⚠️ [Resend Note]:', resData.message || resData);
      }
    } catch (rErr) {
      console.warn('⚠️ Resend dispatch error:', rErr.message);
    }
  }
}

app.post('/api/feedback', async (req, res) => {
  try {
    const { name, email, type, rating, subject, message, attachedImage } = req.body || {};
    if (!subject && !message) {
      return res.status(400).json({ success: false, error: 'Subject and message are required.' });
    }

    const validSenderEmail = isValidEmail(email) ? email.trim() : null;

    const feedbackEntry = {
      id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: (name || 'Anonymous User').trim(),
      email: validSenderEmail || 'Not provided',
      type: type || 'general',
      rating: rating || (type === 'general' ? 5 : undefined),
      subject: (subject || 'CoCanvas Feedback').trim(),
      message: (message || '').trim(),
      hasAttachment: Boolean(attachedImage),
      timestamp: new Date().toISOString()
    };

    feedbackList.push(feedbackEntry);
    console.log(`\n📬 [NEW FEEDBACK for ${FEEDBACK_EMAIL}]`);
    console.log(`👤 From: ${feedbackEntry.name} <${feedbackEntry.email}>`);
    console.log(`🏷️ Type: [${feedbackEntry.type.toUpperCase()}] ${feedbackEntry.subject}`);
    if (feedbackEntry.rating) console.log(`⭐ Rating: ${feedbackEntry.rating} / 5 Stars`);
    console.log(`💬 Details: ${feedbackEntry.message}`);
    if (feedbackEntry.hasAttachment) console.log(`📎 Screenshot/Image attached`);
    console.log(`--------------------------------------------------\n`);

    // Dispatch real email instantly via Resend API
    await sendResendFeedbackEmail(feedbackEntry, attachedImage);

    return res.json({ success: true, message: 'Feedback sent successfully!' });
  } catch (err) {
    console.error('Feedback processing error:', err);
    return res.status(500).json({ success: false, error: 'Failed to process feedback.' });
  }
});

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

server.listen(PORT, () => {
  console.log(`🔥 CoCanvas Server running smoothly on http://localhost:${PORT}`);
});


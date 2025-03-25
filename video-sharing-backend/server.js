const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 1800000,
  pingInterval: 25000,
});

/**
 * Actually join the user (mark them approved, call socket.join, emit "joinApproved").
 */
function doJoin(roomId, sock) {
  sock.data.isApproved = true;
  sock.data.roomId = roomId;
  sock.join(roomId);

  console.log(`[DEBUG] ${sock.username} joined room: ${roomId}`);
  sock.to(roomId).emit('roomMessage', {
    username: sock.username,
    message: 'has joined the room'
  });
  sock.emit('joinApproved');
}

/**
 * Count how many *approved* sockets are in a given room
 */
function countApprovedUsersInRoom(roomId, io) {
  const members = io.sockets.adapter.rooms.get(roomId) || new Set();
  let approvedCount = 0;
  for (const sockId of members) {
    const s = io.sockets.sockets.get(sockId);
    if (s && s.data.isApproved) {
      approvedCount++;
    }
  }
  return approvedCount;
}

// For "seek-then-sync" states: 
// syncStates[roomId] = { finalTime, ackSet: Set<socketIds> }
const syncStates = {};

io.on('connection', (socket) => {
  console.log('[DEBUG] New client connected:', socket.id);

  // Default placeholder
  socket.username = `user-${socket.id.slice(0, 3)}`;
  socket.data.isApproved = false;

  // The client can update their name
  socket.on('updateUsername', ({ username }) => {
    socket.username = username;
    console.log(`[DEBUG] Updated username: ${socket.id} -> ${username}`);
  });

  // ============== JOIN ROOM (ACCEPT/DENY) ==============
  socket.on('joinRoom', (roomId) => {
    socket.data.requestedRoom = roomId;
    const approvedCount = countApprovedUsersInRoom(roomId, io);
    if (approvedCount === 0) {
      doJoin(roomId, socket);
    } else {
      console.log(`[DEBUG] Broadcasting joinRequest for ${socket.username} to room ${roomId}`);
      const members = io.sockets.adapter.rooms.get(roomId) || [];
      for (const sockId of members) {
        const s = io.sockets.sockets.get(sockId);
        if (s && s.data.isApproved) {
          s.emit('joinRequest', {
            newUserId: socket.id,
            newUsername: socket.username
          });
        }
      }
    }
  });

  socket.on('approveJoin', ({ newUserId }) => {
    const newSock = io.sockets.sockets.get(newUserId);
    if (!newSock) return;
    if (newSock.data.isApproved) return;
    const { requestedRoom } = newSock.data;
    if (!requestedRoom) return;
    doJoin(requestedRoom, newSock);
  });

  socket.on('denyJoin', ({ newUserId }) => {
    const newSock = io.sockets.sockets.get(newUserId);
    if (!newSock) return;
    if (newSock.data.isApproved) return;
    newSock.emit('joinDenied');
  });

  // ============== CHAT ==============
  socket.on('chatMessage', ({ roomId, message }) => {
    io.to(roomId).emit('roomMessage', { username: socket.username, message });
  });

  // ============== VIDEO SYNC (Play/Pause) ==============
  // We simply broadcast these events to everyone else in the room
  socket.on('video:play', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:play', { currentTime });
  });

  socket.on('video:pause', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:pause', { currentTime });
  });

  // ============== SEEK-THEN-SYNC ==============
  socket.on('video:seek', ({ roomId, currentTime }) => {
    console.log(`[DEBUG] video:seek => room=${roomId}, finalTime=${currentTime}`);
    const members = io.sockets.adapter.rooms.get(roomId) || new Set();
    const ackSet = new Set(members);

    syncStates[roomId] = { finalTime: currentTime, ackSet };
    // broadcast "video:seekAll"
    socket.to(roomId).emit('video:seekAll', { currentTime });
  });

  socket.on('video:seekAck', ({ roomId }) => {
    const state = syncStates[roomId];
    if (!state) return;
    console.log(`[DEBUG] video:seekAck from ${socket.id} in room=${roomId}`);
    state.ackSet.delete(socket.id);
    if (state.ackSet.size === 0) {
      console.log('[DEBUG] All acked => video:seekResume');
      io.in(roomId).emit('video:seekResume');
      delete syncStates[roomId];
    }
  });

  // ============== DISCONNECT ==============
  socket.on('disconnect', (reason) => {
    console.log(`[DEBUG] Client disconnected: ${socket.id}, reason=${reason}`);
    const roomId = socket.data.roomId;
    if (roomId && syncStates[roomId]) {
      syncStates[roomId].ackSet.delete(socket.id);
      if (syncStates[roomId].ackSet.size === 0) {
        io.in(roomId).emit('video:seekResume');
        delete syncStates[roomId];
      }
    }
    if (socket.data.isApproved) {
      socket.to(roomId).emit('roomMessage', {
        username: socket.username,
        message: 'has left the room'
      });
    }
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log('[DEBUG] video-sharing-backend is running on http://localhost:' + PORT);
});
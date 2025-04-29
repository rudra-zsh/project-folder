/* 
  video-sharing-full/server.js
  ---------------------------------
  Node + Socket.IO server. 
  Run: node server.js
*/

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

// Basic express setup
const app = express();
app.use(cors({ origin: "*" }));

const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 1800000,
  pingInterval: 25000,
});

// Helper to see if a room is empty
function isRoomEmpty(roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  return !room || room.size === 0;
}

io.on('connection', (socket) => {
  console.log('[SERVER] New client:', socket.id);

  // Default username
  socket.username = `user-${socket.id.slice(0,5)}`;

  /* 
    Join Flow:
    1) requestJoin
    2) If empty => auto-approve
    3) Otherwise => existing user(s) see "joinRequest"
    4) "joinRequestResponse" => if approved => "joinResult" => then user calls joinRoom
  */
  socket.on('requestJoin', ({ roomId, username }) => {
    socket.username = username.trim() || socket.username;
    console.log(`[SERVER] ${socket.username} requests to join room ${roomId}`);

    if (isRoomEmpty(roomId)) {
      // If empty => auto-join
      socket.join(roomId);
      socket.data.roomId = roomId;
      console.log(`[SERVER] ${socket.username} auto-joined empty room ${roomId}`);

      socket.emit('joinResult', { approved: true, roomId });
    } else {
      // Non-empty => ask existing participants
      socket.data.requestedRoomId = roomId;
      socket.to(roomId).emit('joinRequest', {
        socketId: socket.id,
        username: socket.username,
        roomId,
      });
    }
  });

  socket.on('joinRequestResponse', ({ approved, requesterId, roomId }) => {
    if (approved) {
      io.to(requesterId).emit('joinResult', { approved: true, roomId });
    } else {
      io.to(requesterId).emit('joinResult', { approved: false });
    }
  });

  // Once a user is approved, they call 'joinRoom'
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`[SERVER] ${socket.username} joined room ${roomId}`);

    socket.to(roomId).emit('roomMessage', {
      username: socket.username,
      message: 'has joined the room',
    });
  });

  // Chat
  socket.on('chatMessage', ({ roomId, message, username }) => {
    io.to(roomId).emit('roomMessage', { username, message });
  });

  // Synchronized Video
  socket.on('video:play', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:play', { currentTime });
  });
  socket.on('video:pause', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:pause', { currentTime });
  });
  socket.on('video:seek', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:seek', { currentTime });
  });

  // WebRTC Signaling
  socket.on('webrtcOffer', ({ toSocketId, offer }) => {
    io.to(toSocketId).emit('webrtcOffer', { fromSocketId: socket.id, offer });
  });
  socket.on('webrtcAnswer', ({ toSocketId, answer }) => {
    io.to(toSocketId).emit('webrtcAnswer', { fromSocketId: socket.id, answer });
  });
  socket.on('webrtcIceCandidate', ({ toSocketId, candidate }) => {
    io.to(toSocketId).emit('webrtcIceCandidate', {
      fromSocketId: socket.id,
      candidate,
    });
  });

  // On disconnect
  socket.on('disconnect', (reason) => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('roomMessage', {
        username: socket.username,
        message: 'has left the room',
      });
    }
    console.log('[SERVER] Disconnected:', socket.id, 'Reason:', reason);
  });
});

server.listen(4000, () => {
  console.log('[SERVER] Running on http://localhost:4000');
});

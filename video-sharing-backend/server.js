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

  console.log(`[DEBUG] ${sock.username} is now allowed and joined: ${roomId}`);

  // Notify existing members
  sock.to(roomId).emit('roomMessage', {
    username: sock.username,
    message: 'has joined the room'
  });

  // Tell the new user they are approved
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

io.on('connection', (socket) => {
  console.log('[DEBUG] New client connected:', socket.id);

  // Default placeholder name
  socket.username = `user-${socket.id.slice(0, 3)}`;
  socket.data.isApproved = false; // remains false until doJoin is called

  // The client can update their name
  socket.on('updateUsername', ({ username }) => {
    socket.username = username;
    console.log(`[DEBUG] Updated username: ${socket.id} -> ${username}`);
  });

  /**
   * Attempt to join a room => see how many are "approved."
   *  - If zero => auto-approve
   *  - If >=1 => broadcast "joinRequest" to all *approved* members
   */
  socket.on('joinRoom', (roomId) => {
    socket.data.requestedRoom = roomId;

    const approvedCount = countApprovedUsersInRoom(roomId, io);
    if (approvedCount === 0) {
      // No approved user => auto-approve
      doJoin(roomId, socket);
    } else {
      console.log(`[DEBUG] Broadcasting joinRequest for ${socket.username} to room ${roomId}`);
      // Broadcast only to approved members
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

  /**
   * If an existing user approves => doJoin
   * If user was already approved or denied, ignore it
   */
  socket.on('approveJoin', ({ newUserId }) => {
    const newSock = io.sockets.sockets.get(newUserId);
    if (!newSock) return;

    // If they're already approved or left, ignore
    if (newSock.data.isApproved) {
      console.log(`[DEBUG] approveJoin ignored; user already approved.`);
      return;
    }
    const { requestedRoom } = newSock.data;
    if (!requestedRoom) {
      console.log(`[DEBUG] approveJoin ignored; no requestedRoom.`);
      return;
    }

    doJoin(requestedRoom, newSock);
  });

  /**
   * If an existing user denies => send "joinDenied."
   * If user was approved or left, ignore
   */
  socket.on('denyJoin', ({ newUserId }) => {
    const newSock = io.sockets.sockets.get(newUserId);
    if (!newSock) return;
    if (newSock.data.isApproved) {
      console.log(`[DEBUG] denyJoin ignored; user is already approved.`);
      return;
    }
    // They remain connected, but never joined. Let them handle on client side
    newSock.emit('joinDenied');
  });

  // Chat
  socket.on('chatMessage', ({ roomId, message }) => {
    io.to(roomId).emit('roomMessage', { username: socket.username, message });
  });

  // Video Sync
  socket.on('video:play', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:play', { currentTime });
  });
  socket.on('video:pause', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:pause', { currentTime });
  });
  socket.on('video:seek', ({ roomId, currentTime }) => {
    socket.to(roomId).emit('video:seek', { currentTime });
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[DEBUG] Client disconnected: ${socket.id} Reason: ${reason}`);
    if (socket.data.roomId && socket.data.isApproved) {
      socket.to(socket.data.roomId).emit('roomMessage', {
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

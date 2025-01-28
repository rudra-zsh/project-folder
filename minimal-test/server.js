const express = require('express');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Note: Setting a very long (or infinite) ping timeout can help test
// if environment forcibly closes the connection. Let's set to 30m:
const io = new Server(server, {
  pingTimeout: 1800000, // 30 minutes
  pingInterval: 25000,  // 25 seconds
});

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('[DEBUG] A client connected:', socket.id);

  socket.on('test-event', (data) => {
    console.log('[DEBUG] Received "test-event" from client:', data);
    socket.emit('test-response', 'Hello from server');
  });

  socket.on('disconnect', (reason) => {
    console.log('[DEBUG] Client disconnected:', socket.id, 'Reason:', reason);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log('[DEBUG] Minimal Socket.IO Test server running on http://localhost:' + PORT);
});

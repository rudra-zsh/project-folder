#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "[INFO] Starting setup script for Video Sharing + Chat project..."

##################################
# 1. Minimal Socket.IO Test
##################################
echo "[INFO] Setting up 'minimal-test'..."

# Remove any existing folder named "minimal-test" (optional safety measure)
rm -rf minimal-test

# Create directory structure
mkdir -p minimal-test/public

# Create package.json
cat << 'EOF' > minimal-test/package.json
{
  "name": "minimal-socketio-test",
  "version": "1.0.0",
  "description": "Minimal Socket.IO test project to check environment.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.6.1"
  }
}
EOF

# Create server.js
cat << 'EOF' > minimal-test/server.js
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
EOF

# Create public/test.html
cat << 'EOF' > minimal-test/public/test.html
<!DOCTYPE html>
<html>
  <head>
    <title>Minimal Socket.IO Test</title>
  </head>
  <body>
    <h1>Minimal Socket.IO Test Page</h1>
    <p id="status">Connecting...</p>

    <!-- Load Socket.IO client -->
    <script src="/socket.io/socket.io.js"></script>
    <script>
      // Force the "websocket" transport to detect if environment blocks them
      const socket = io({
        transports: ['websocket'],
        timeout: 30000 // 30 seconds for connection attempt
      });

      socket.on('connect', () => {
        console.log('[DEBUG] Connected to server:', socket.id);
        document.getElementById('status').textContent = 'Connected via websocket!';
        socket.emit('test-event', 'Hello from client');
      });

      socket.on('test-response', (message) => {
        console.log('[DEBUG] Received from server:', message);
      });

      socket.on('connect_error', (err) => {
        console.error('[DEBUG] connect_error:', err.message);
        document.getElementById('status').textContent = 'Connection Error: ' + err.message;
      });

      socket.on('disconnect', (reason) => {
        console.log('[DEBUG] Disconnected from server:', reason);
        document.getElementById('status').textContent = 'Disconnected: ' + reason;
      });
    </script>
  </body>
</html>
EOF

# Install dependencies
echo "[INFO] Installing dependencies for 'minimal-test'..."
cd minimal-test
npm install
cd ..

echo "[INFO] 'minimal-test' setup complete."
echo


##################################
# 2. Video-Sharing Backend
##################################
echo "[INFO] Setting up 'video-sharing-backend'..."

# Remove any existing folder named "video-sharing-backend" (optional safety measure)
rm -rf video-sharing-backend

mkdir -p video-sharing-backend

cat << 'EOF' > video-sharing-backend/package.json
{
  "name": "video-sharing-backend",
  "version": "1.0.0",
  "description": "Node.js + Express + Socket.IO backend for video sharing and chat",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "socket.io": "^4.6.1"
  }
}
EOF

cat << 'EOF' > video-sharing-backend/server.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors({ origin: "*" })); // Adjust origin as needed for production

const server = http.createServer(app);

const io = new Server(server, {
  pingTimeout: 1800000, // 30 minutes
  pingInterval: 25000,  // 25 seconds
});

io.on('connection', (socket) => {
  console.log('[DEBUG] New client connected:', socket.id);

  // Join a room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`[DEBUG] Socket ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit('roomMessage', `User ${socket.id} has joined the room.`);
  });

  // Handle chat messages
  socket.on('chatMessage', ({ roomId, message }) => {
    console.log(`[DEBUG] Message in room ${roomId}: ${message}`);
    io.to(roomId).emit('roomMessage', `User ${socket.id}: ${message}`);
  });

  // Disconnect
  socket.on('disconnect', (reason) => {
    console.log('[DEBUG] Client disconnected:', socket.id, 'Reason:', reason);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log('[DEBUG] video-sharing-backend is running on http://localhost:' + PORT);
});
EOF

# Install dependencies
cd video-sharing-backend
npm install
cd ..

echo "[INFO] 'video-sharing-backend' setup complete."
echo


##################################
# 3. Video-Sharing Frontend
##################################
echo "[INFO] Setting up 'video-sharing-frontend'..."

# Remove any existing folder named "video-sharing-frontend" (optional safety measure)
rm -rf video-sharing-frontend

mkdir -p video-sharing-frontend/src
mkdir -p video-sharing-frontend/src/pages
mkdir -p video-sharing-frontend/src/components

# package.json
cat << 'EOF' > video-sharing-frontend/package.json
{
  "name": "video-sharing-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.2",
    "socket.io-client": "^4.6.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.4.0"
  }
}
EOF

# vite.config.js
cat << 'EOF' > video-sharing-frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
EOF

# index.html
cat << 'EOF' > video-sharing-frontend/index.html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Video Sharing App</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

# src/main.jsx
cat << 'EOF' > video-sharing-frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
EOF

# src/App.jsx
cat << 'EOF' > video-sharing-frontend/src/App.jsx
import React from 'react';
import AppRouter from './router';

function App() {
  return (
    <div className="app-container">
      <h1>Video Sharing + Chat</h1>
      <AppRouter />
    </div>
  );
}

export default App;
EOF

# src/router.jsx
cat << 'EOF' > video-sharing-frontend/src/router.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
}

export default AppRouter;
EOF

# src/pages/Home.jsx
cat << 'EOF' > video-sharing-frontend/src/pages/Home.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomId.trim()) {
      navigate(\`/room/\${roomId}\`);
    }
  };

  return (
    <div className="page home-page">
      <div className="home-form">
        <h2>Join a Room</h2>
        <input 
          type="text" 
          placeholder="Enter Room ID" 
          value={roomId} 
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={handleJoin}>Join</button>
      </div>
    </div>
  );
}

export default Home;
EOF

# src/pages/Room.jsx
cat << 'EOF' > video-sharing-frontend/src/pages/Room.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import ChatSection from '../components/ChatSection';
import VideoPlayer from '../components/VideoPlayer';
import UserVideoFeed from '../components/UserVideoFeed';

// GLOBAL socket instance to avoid repeated unmounting/creation.
let socket = null;

function Room() {
  const { roomId } = useParams();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      console.log('[DEBUG FRONTEND] Creating global socket connection');
      socket = io('http://localhost:4000', {
        transports: ['websocket'],
        pingTimeout: 1800000,
        pingInterval: 25000,
      });
    }

    if (!isConnected) {
      socket.connect(); 
      socket.emit('joinRoom', roomId);
      setIsConnected(true);
    }

    return () => {
      // We do NOT disconnect here, to keep the socket global.
      console.log('[DEBUG FRONTEND] Room component unmounted, socket remains connected');
    };
  }, [roomId, isConnected]);

  return (
    <div className="page room-page">
      <h2>Room: {roomId}</h2>
      <div className="video-chat-container">
        <div className="video-container">
          <VideoPlayer />
          <UserVideoFeed />
        </div>
        <ChatSection socket={socket} roomId={roomId} />
      </div>
    </div>
  );
}

export default Room;
EOF

# src/components/ChatSection.jsx
cat << 'EOF' > video-sharing-frontend/src/components/ChatSection.jsx
import React, { useState, useEffect } from 'react';

function ChatSection({ socket, roomId }) {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');

  useEffect(() => {
    if (!socket) return;

    const handleRoomMessage = (msg) => {
      console.log('[DEBUG FRONTEND] Received roomMessage:', msg);
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('roomMessage', handleRoomMessage);

    return () => {
      socket.off('roomMessage', handleRoomMessage);
    };
  }, [socket]);

  const sendMessage = () => {
    if (inputMsg.trim()) {
      console.log('[DEBUG FRONTEND] Sending chatMessage:', inputMsg);
      socket.emit('chatMessage', { roomId, message: inputMsg });
      setInputMsg('');
    }
  };

  return (
    <div className="chat-section">
      <h3>Chat</h3>
      <div className="messages">
        {messages.map((m, idx) => (
          <div key={idx} className="message">
            {m}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatSection;
EOF

# src/components/VideoPlayer.jsx
cat << 'EOF' > video-sharing-frontend/src/components/VideoPlayer.jsx
import React from 'react';

function VideoPlayer() {
  return (
    <div className="video-player">
      <h3>Video Player (Placeholder)</h3>
      <p>Here you can implement your synchronized video logic.</p>
    </div>
  );
}

export default VideoPlayer;
EOF

# src/components/UserVideoFeed.jsx
cat << 'EOF' > video-sharing-frontend/src/components/UserVideoFeed.jsx
import React from 'react';

function UserVideoFeed() {
  return (
    <div className="user-video-feed">
      <h3>User Video Feed (Placeholder)</h3>
      <p>In a real app, this could display other users via WebRTC, etc.</p>
    </div>
  );
}

export default UserVideoFeed;
EOF

# src/styles.css
cat << 'EOF' > video-sharing-frontend/src/styles.css
/* Basic global styling */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}
.app-container {
  text-align: center;
  margin: 20px;
}

/* Pages */
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 20px;
}

/* Home Page */
.home-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* Room Page */
.video-chat-container {
  display: flex;
  flex-direction: row;
  gap: 20px;
  width: 80%;
  margin: 0 auto;
  margin-top: 20px;
}

.video-container {
  flex: 3;
  border: 1px solid #ccc;
  padding: 10px;
}

.chat-section {
  flex: 2;
  border: 1px solid #ccc;
  padding: 10px;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 5px;
  margin-bottom: 10px;
  height: 200px; /* set a fixed height to allow scroll */
}

.message {
  margin-bottom: 5px;
  background-color: #f8f8f8;
  padding: 5px;
  border-radius: 3px;
}

.chat-input {
  display: flex;
  gap: 10px;
}

/* Video Components */
.video-player, .user-video-feed {
  margin: 10px 0;
  border: 1px solid #ddd;
  padding: 10px;
}
EOF

# Install dependencies
cd video-sharing-frontend
echo "[INFO] Installing dependencies for 'video-sharing-frontend'..."
npm install

cd ..

echo "[INFO] 'video-sharing-frontend' setup complete."
echo "[INFO] Setup script completed successfully."
echo
echo "----------------------------------------------------------"
echo "Your project structure is now ready with three directories:"
echo "  1) minimal-test"
echo "  2) video-sharing-backend"
echo "  3) video-sharing-frontend"
echo
echo "Next steps to run everything:"
echo
echo "1) Minimal Socket.IO Test:"
echo "   cd minimal-test"
echo "   npm start"
echo "   Then open http://localhost:3000/test.html in your browser."
echo
echo "2) Backend:"
echo "   cd video-sharing-backend"
echo "   npm start"
echo "   (Runs on http://localhost:4000 by default)"
echo
echo "3) Frontend:"
echo "   cd video-sharing-frontend"
echo "   npm run dev"
echo "   (Open the link shown in the console, usually http://localhost:5173)"
echo
echo "Enjoy your real-time Video Sharing + Chat app!"
exit 0


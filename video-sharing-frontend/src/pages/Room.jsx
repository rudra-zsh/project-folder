import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import ChatSection from '../components/ChatSection';
import VideoPlayer from '../components/VideoPlayer';

// GLOBAL socket instance
let socket = null;

function Room() {
  const { roomId } = useParams();
  const [isConnected, setIsConnected] = useState(false);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  const username = location.state?.username;
  console.log('username-> ' + username);

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
      socket.emit('updateUsername', { username });
      setIsConnected(true);
    }

    // Simulate a delay before fully rendering
    const delay = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => {
      clearTimeout(delay);
      // We do NOT disconnect here, to keep the socket global.
      console.log('[DEBUG FRONTEND] Room component unmounted, socket remains connected');
    };
  }, [roomId, isConnected]);

  // Simple loading screen if needed:
  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Loading Room...</div>
      </div>
    );
  }

  return (
    <div className="page room-page">
      <h2>Room: {roomId}</h2>
      <div className="video-chat-container">
        <div className="video-container">
          <VideoPlayer socket={socket} roomId={roomId} />
        </div>
        {/* We can wrap ChatSection in a .chat-container or go directly */}
        <ChatSection socket={socket} roomId={roomId} username={username} />
      </div>
    </div>
  );
}

export default Room;

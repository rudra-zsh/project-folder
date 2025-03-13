import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import ChatSection from '../components/ChatSection';
import VideoPlayer from '../components/VideoPlayer';
import { useLocation } from 'react-router-dom';

// GLOBAL socket instance to avoid repeated unmounting/creation.
let socket = null;

function Room() {
  const { roomId } = useParams();
  const [isConnected, setIsConnected] = useState(false);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);  // Track loading state
  const username = location.state?.username;
  //printing the name 
  console.log('username->'+username);
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
      socket.emit('updateUsername',{username});
      setIsConnected(true);
    }
    // Simulate a delay before fully rendering the room
    const delay = setTimeout(() => {
      setIsLoading(false);  // Set loading to false after delay
    }, 2000);  // Delay in milliseconds (e.g., 2000ms = 2 seconds)

    return () => {
      clearTimeout(delay); // Cleanup timeout if the component is unmounted
      // We do NOT disconnect here, to keep the socket global.
      console.log('[DEBUG FRONTEND] Room component unmounted, socket remains connected');
    };
  }, [roomId, isConnected]);
  

  return (
    <div className="page room-page">
      <h2>Room: {roomId}</h2>
      <div className="video-chat-container">
        <div className="video-container">
          {/* Pass socket and roomId to enable synchronized video */}
          <VideoPlayer socket={socket} roomId={roomId} />
          
        </div>
        <ChatSection socket={socket} roomId={roomId} username={username} />
      </div>
    </div>
  );
}

export default Room;

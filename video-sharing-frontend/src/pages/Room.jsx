import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import ChatSection from '../components/ChatSection';
import WebRTCSection from '../components/WebRTCSection';
import VideoPlayer from '../components/VideoPlayer';

// Reuse or create a global socket instance
let socket = null;

function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // If a username was passed via navigation
  const username = location.state?.username;

  // We track if we've connected
  const [isConnected, setIsConnected] = useState(false);

  // Whether we're allowed in
  const [isApproved, setIsApproved] = useState(false);

  // Whether we show loading
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!socket) {
      socket = io('http://localhost:4000', {
        transports: ['websocket'],
        pingTimeout: 1800000,
        pingInterval: 25000,
      });
    }

    if (!isConnected) {
      socket.connect();
      socket.emit('updateUsername', { username });
      socket.emit('joinRoom', roomId);
      setIsConnected(true);
    }

    // On approval => show room
    const handleJoinApproved = () => {
      console.log('[DEBUG FRONTEND] joinApproved received');
      setIsApproved(true);
      setIsLoading(false);
    };
    socket.on('joinApproved', handleJoinApproved);

    // If forcibly disconnected => not used now
    const handleDisconnect = (reason) => {
      console.log('[DEBUG FRONTEND] Disconnected, reason =', reason);
      if (!isApproved) {
        // If server forcibly disconnects them for some reason, or environment
        alert('Connection closed. Returning home.');
        navigate('/');
      }
    };
    socket.on('disconnect', handleDisconnect);

    // If we are an *approved* user, we get joinRequest
    const handleJoinRequest = ({ newUserId, newUsername }) => {
      const answer = window.confirm(`${newUsername} wants to join. Allow?`);
      if (answer) {
        socket.emit('approveJoin', { newUserId });
      } else {
        socket.emit('denyJoin', { newUserId });
      }
    };
    socket.on('joinRequest', handleJoinRequest);

    // Minimal 1s loading
    const timer = setTimeout(() => {
      if (isApproved) {
        setIsLoading(false);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      socket.off('joinApproved', handleJoinApproved);
      socket.off('disconnect', handleDisconnect);
      socket.off('joinRequest', handleJoinRequest);
    };
  }, [roomId, username, isConnected, isApproved, navigate]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <div className="loading-text">Waiting for acceptance...</div>
      </div>
    );
  }

  // Show the normal UI if approved
  return (
    <div className="page room-page">
      <div className="room-header">
        <h2>{`Room: ${roomId}`}</h2>
      </div>

      <div className="main-layout">
        {/* Left side: top user-thumbnails (WebRTC) + big video below */}
        <div className="video-area">
          <div className="top-thumbnails">
            <WebRTCSection socket={socket} roomId={roomId} />
          </div>
          <div className="big-video">
            <VideoPlayer socket={socket} roomId={roomId} />
          </div>
        </div>

        {/* Right side: chat panel */}
        <div className="chat-area">
          <ChatSection socket={socket} roomId={roomId} username={username} />
        </div>
      </div>
    </div>
  );
}

export default Room;

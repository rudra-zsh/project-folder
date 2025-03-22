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

  // We track if we connected once
  const [isConnected, setIsConnected] = useState(false);

  // Whether we're actually allowed in
  const [isApproved, setIsApproved] = useState(false);

  // Whether we show a loading screen
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Create or reuse the socket
    if (!socket) {
      socket = io('http://localhost:4000', {
        transports: ['websocket'],
        pingTimeout: 1800000,
        pingInterval: 25000,
      });
    }

    // If we haven't connected yet, do so
    if (!isConnected) {
      socket.connect();

      // Provide our username
      socket.emit('updateUsername', { username });

      // Request to join => triggers "joinRequest" if the room has an approved user
      socket.emit('joinRoom', roomId);

      setIsConnected(true);
    }

    // If the server calls "joinApproved," we can see the main UI
    const handleJoinApproved = () => {
      console.log('[DEBUG FRONTEND] joinApproved received');
      setIsApproved(true);
      setIsLoading(false);
    };
    socket.on('joinApproved', handleJoinApproved);

    // If forcibly disconnected => we assume denial
    const handleDisconnect = (reason) => {
      console.log('[DEBUG FRONTEND] Disconnected, reason =', reason);
      if (!isApproved) {
        alert('Your join request was denied or the connection closed.');
        navigate('/');
      }
    };
    socket.on('disconnect', handleDisconnect);

    // If we are an existing *approved* user, the server sends "joinRequest"
    const handleJoinRequest = ({ newUserId, newUsername }) => {
      const answer = window.confirm(`${newUsername} wants to join. Allow?`);
      if (answer) {
        socket.emit('approveJoin', { newUserId });
      } else {
        socket.emit('denyJoin', { newUserId });
      }
    };
    socket.on('joinRequest', handleJoinRequest);

    // Minimal loading
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

  // Show normal UI if we're approved
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

/* working*/

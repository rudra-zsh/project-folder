import React, { useState, useEffect, useRef } from 'react';

function ChatSection({ socket, roomId ,username }) {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef(null);  // Ref for auto-scrolling
  const messagesContainerRef = useRef(null);  // Ref for manual scroll tracking

  useEffect(() => {
    if (!socket) return;

    const handleRoomMessage = (msg) => {
      console.log('[DEBUG FRONTEND] Received roomMessage:', msg);
      setMessages((prev) => [...prev, {username: msg.username ,message: msg.message}]);
    };

    socket.on('roomMessage', handleRoomMessage);

    return () => {
      socket.off('roomMessage', handleRoomMessage);
    };
  }, [socket]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if the user is already scrolled to the bottom
    const isAtBottom =
      container.scrollHeight - container.clientHeight <= container.scrollTop + 50;

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // Runs whenever messages update

  const sendMessage = () => {
    if (inputMsg.trim()) {
      console.log('[DEBUG FRONTEND] Sending chatMessage:', inputMsg);
      socket.emit('chatMessage', { roomId, message: inputMsg ,username });
      setInputMsg('');
      console.log("username:"+socket.username);
    }
  };

  // Press Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="chat-section">
      <h3>Chat</h3>
      <div ref={messagesContainerRef} className="messages">
        {messages.map((m, idx) => (
          <div key={idx} className="message">
            <strong>{m.username}:</strong> {m.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={handleKeyDown} // <-- Press Enter to send
        />
        <button className="glass-button" onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatSection;





/*
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

  // Press Enter to send
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
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
          onKeyDown={handleKeyDown} // <-- Press Enter to send
        />
        <button className='glass-button' onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatSection;
*/
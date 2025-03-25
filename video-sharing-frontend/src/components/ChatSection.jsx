import React, { useState, useEffect, useRef } from 'react';

function ChatSection({ socket, roomId, username }) {
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleRoomMessage = (msg) => {
      console.log('[DEBUG FRONTEND] Received roomMessage:', msg);
      setMessages((prev) => [
        ...prev,
        { username: msg.username, message: msg.message }
      ]);
    };

    socket.on('roomMessage', handleRoomMessage);

    return () => {
      socket.off('roomMessage', handleRoomMessage);
    };
  }, [socket]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Auto-scroll if user is near the bottom
    const isAtBottom =
      container.scrollHeight - container.clientHeight <= container.scrollTop + 50;

    if (isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message as-is (multiline allowed)
  const sendMessage = () => {
    const trimmed = inputMsg.trim();
    if (trimmed) {
      console.log('[DEBUG FRONTEND] Sending chatMessage:', trimmed);
      socket.emit('chatMessage', { roomId, message: trimmed, username });
      setInputMsg('');
    }
  };

  // Press Enter => send, Shift+Enter => new line
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-section">
      <h3>Chat</h3>

      <div ref={messagesContainerRef} className="messages">
        {messages.map((m, idx) => {
          const isOwn = m.username === username;
          return (
            <div
              key={idx}
              className={`message ${isOwn ? 'own' : 'other'}`}
              style={{ whiteSpace: 'pre-wrap' }}  // preserve newlines
            >
              {/* If it's someone else's message, show their username in bold */}
              {!isOwn && (
                <div className="message-username">
                  <strong>{m.username}</strong>
                </div>
              )}

              {/* The actual message text, possibly multiline */}
              <div className="message-text">
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <textarea
          className="chat-textarea"
          rows={2}
          placeholder="Type a message..."
          value={inputMsg}
          onChange={(e) => setInputMsg(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="glass-button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatSection;



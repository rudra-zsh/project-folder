import React, { useRef, useEffect, useState } from 'react';

function VideoPlayer({ socket, roomId }) {
  const videoRef = useRef(null);
  const lastSeekEmittedRef = useRef(0);
  const [videoSrc, setVideoSrc] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleRemotePlay = ({ currentTime }) => {
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.currentTime = currentTime;
        if (videoEl.paused) {
          videoEl.play().catch(err => console.error('play() error:', err));
        }
      }
    };

    const handleRemotePause = ({ currentTime }) => {
      const videoEl = videoRef.current;
      if (videoEl && !videoEl.paused) {
        videoEl.currentTime = currentTime;
        videoEl.pause();
      }
    };

    const handleRemoteSeek = ({ currentTime }) => {
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.currentTime = currentTime;
        lastSeekEmittedRef.current = currentTime;
      }
    };

    socket.on('video:play', handleRemotePlay);
    socket.on('video:pause', handleRemotePause);
    socket.on('video:seek', handleRemoteSeek);

    return () => {
      socket.off('video:play', handleRemotePlay);
      socket.off('video:pause', handleRemotePause);
      socket.off('video:seek', handleRemoteSeek);
    };
  }, [socket]);

  const handlePlay = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;
    socket.emit('video:play', { roomId, currentTime: videoEl.currentTime });
    videoEl.play().catch(err => console.error('local play() error:', err));
  };

  const handlePause = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;
    socket.emit('video:pause', { roomId, currentTime: videoEl.currentTime });
    videoEl.pause();
  };

  const handleSkip = (seconds) => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;
    videoEl.currentTime += seconds;
    socket.emit('video:seek', { roomId, currentTime: videoEl.currentTime });
    lastSeekEmittedRef.current = videoEl.currentTime;
  };

  const handleRestart = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;
    videoEl.currentTime = 0;
    socket.emit('video:seek', { roomId, currentTime: 0 });
    lastSeekEmittedRef.current = 0;
  };

  const handleSeeked = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;

    const newTime = videoEl.currentTime;
    const diff = Math.abs(newTime - lastSeekEmittedRef.current);
    if (diff > 0.2) {
      videoEl.pause();
      socket.emit('video:seek', { roomId, currentTime: newTime });

      setTimeout(() => {
        lastSeekEmittedRef.current = newTime;
      }, 1000);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="video-player">
      {videoSrc && (
        <video
          ref={videoRef}
          width="100%"
          controls
          onSeeked={handleSeeked}
          onPlay={handlePlay}
          onPause={handlePause}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      )}

      <div style={{ marginTop: '15px' }}>
        {/* Smaller select file button placed above */}
        <button
          className="glass-button"
          onClick={triggerFileSelect}
          style={{ marginBottom: '10px', padding: '6px 12px', fontSize: '0.8rem' }}
        >
          Select File
        </button>
        <br />

        <button className="glass-button" onClick={() => handleSkip(-10)}>
          Backward 10s
        </button>
        <button className="glass-button" onClick={handlePlay} style={{ marginLeft: '10px' }}>
          Play
        </button>
        <button className="glass-button" onClick={handlePause} style={{ marginLeft: '10px' }}>
          Pause
        </button>
        <button className="glass-button" onClick={() => handleSkip(10)} style={{ marginLeft: '10px' }}>
          Forward 10s
        </button>
        <button className="glass-button" onClick={handleRestart} style={{ marginLeft: '10px' }}>
          Restart
        </button>

        <input
          type="file"
          accept="video/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default VideoPlayer;
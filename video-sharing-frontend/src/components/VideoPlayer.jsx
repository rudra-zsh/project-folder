import React, { useRef, useEffect, useState } from 'react';

function VideoPlayer({ socket, roomId }) {
  const videoRef = useRef(null);
  const lastSeekEmittedRef = useRef(0);
  const [videoSrc, setVideoSrc] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleRemotePlay = ({ currentTime }) => {
      console.log('[DEBUG - VideoPlayer] Received video:play, time=', currentTime);
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.currentTime = currentTime;
        if (videoEl.paused) {
          videoEl.play().catch(err => console.error('[DEBUG] play() error:', err));
        }
      }
    };

    const handleRemotePause = ({ currentTime }) => {
      console.log('[DEBUG - VideoPlayer] Received video:pause, time=', currentTime);
      const videoEl = videoRef.current;
      if (videoEl && !videoEl.paused) {
        videoEl.currentTime = currentTime;
        videoEl.pause();
      }
    };

    const handleRemoteSeek = ({ currentTime }) => {
      console.log('[DEBUG - VideoPlayer] Received video:seek, time=', currentTime);
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
    videoEl.play().catch(err => console.error('[DEBUG] local play() error:', err));
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

  const handleSeeked = () => {
    
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;

    const newTime = videoEl.currentTime;
    const diff = Math.abs(newTime - lastSeekEmittedRef.current);
    
    if (diff > 3) {
      videoEl.pause();
      socket.emit('video:seek', { roomId, currentTime: newTime });
      lastSeekEmittedRef.current = newTime;
      
    } else {
      console.log('[DEBUG - VideoPlayer] onSeeked called, diff < 5s, skipping emit');
    }
  };


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
    }
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


      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
      />

      <div style={{ marginTop: '15px' }}>
        <button className="glass-button" onClick={handlePlay}>Play</button>
        <button className="glass-button" onClick={handlePause} style={{ marginLeft: '10px' }}>Pause</button>
        <button className="glass-button" onClick={() => handleSkip(10)} style={{ marginLeft: '10px' }}>
          Forward 10s
        </button>
        <button className="glass-button" onClick={() => handleSkip(-10)} style={{ marginLeft: '10px' }}>
          Backward 10s
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;

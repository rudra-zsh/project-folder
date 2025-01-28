import React, { useRef, useEffect, useState } from 'react';

function VideoPlayer({ socket, roomId }) {
  const videoRef = useRef(null);

  // Track the last time we emitted a local 'seek'
  const lastSeekEmittedRef = useRef(0);

  // Listen for events from the server (triggered by other clients)
  useEffect(() => {
    if (!socket) return;

    // Another client started playing the video
    const handleRemotePlay = ({ currentTime }) => {
      console.log('[DEBUG - VideoPlayer] Received video:play, time=', currentTime);
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.currentTime = currentTime;
        if (videoEl.paused) {
          videoEl.play().catch(err => {
            console.error('[DEBUG - VideoPlayer] play() error:', err);
          });
        }
      }
    };

    // Another client paused the video
    const handleRemotePause = ({ currentTime }) => {
      console.log('[DEBUG - VideoPlayer] Received video:pause, time=', currentTime);
      const videoEl = videoRef.current;
      if (videoEl) {
        videoEl.currentTime = currentTime;
        if (!videoEl.paused) {
          videoEl.pause();
        }
      }
    };

    // Another client sought the video timeline
    const handleRemoteSeek = ({ currentTime }) => {
      console.log('[DEBUG - VideoPlayer] Received video:seek, time=', currentTime);
      const videoEl = videoRef.current;
      if (videoEl) {
        // Set the video time
        videoEl.currentTime = currentTime;
        // NEW CODE: Update lastSeekEmittedRef so we don't re-emit immediately
        lastSeekEmittedRef.current = currentTime;
      }
    };

    // Attach listeners
    socket.on('video:play', handleRemotePlay);
    socket.on('video:pause', handleRemotePause);
    socket.on('video:seek', handleRemoteSeek);

    // Cleanup on unmount
    return () => {
      socket.off('video:play', handleRemotePlay);
      socket.off('video:pause', handleRemotePause);
      socket.off('video:seek', handleRemoteSeek);
    };
  }, [socket]);

  // Play
  const handlePlay = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;

    console.log('[DEBUG - VideoPlayer] Emitting video:play');
    socket.emit('video:play', {
      roomId,
      currentTime: videoEl.currentTime,
    });

    videoEl.play().catch(err => {
      console.error('[DEBUG - VideoPlayer] local play() error:', err);
    });
  };

  // Pause
  const handlePause = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;

    console.log('[DEBUG - VideoPlayer] Emitting video:pause');
    socket.emit('video:pause', {
      roomId,
      currentTime: videoEl.currentTime,
    });

    videoEl.pause();
  };

  // Skip forward/backward in seconds (custom buttons)
  const handleSkip = (seconds) => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;

    videoEl.currentTime += seconds;

    // NEW CODE: We'll only emit the final skip once
    console.log('[DEBUG - VideoPlayer] Emitting video:seek (skip)', videoEl.currentTime);
    socket.emit('video:seek', {
      roomId,
      currentTime: videoEl.currentTime,
    });
    // Update lastSeekEmittedRef
    lastSeekEmittedRef.current = videoEl.currentTime;
  };

  // If user uses built-in timeline (onSeeked)
  const handleSeeked = () => {
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;

    const newTime = videoEl.currentTime;
    // Compare newTime to lastSeekEmittedRef
    const diff = Math.abs(newTime - lastSeekEmittedRef.current);
    
    // Only emit if user moved the slider significantly
    if (diff > 0.2) {
      console.log('[DEBUG - VideoPlayer] Emitting video:seek (onSeeked)', newTime);
      socket.emit('video:seek', {
        roomId,
        currentTime: newTime,
      });
      lastSeekEmittedRef.current = newTime;
    } else {
      console.log('[DEBUG - VideoPlayer] onSeeked called, but difference < 0.2s -> skipping emit');
    }
  };

  return (
    <div className="video-player">
      <h3>Synchronized Video Player</h3>
      <p>Use the custom buttons or the timeline to see real-time sync.</p>

      <video
        ref={videoRef}
        width="400"
        controls
        onSeeked={handleSeeked} // If user drags the timeline
      >
        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
        Your browser does not support HTML5 video.
      </video>

      <div style={{ marginTop: '10px' }}>
        <button onClick={handlePlay}>Play</button>
        <button onClick={handlePause} style={{ marginLeft: '10px' }}>Pause</button>
        <button onClick={() => handleSkip(10)} style={{ marginLeft: '10px' }}>Forward 10s</button>
        <button onClick={() => handleSkip(-10)} style={{ marginLeft: '10px' }}>Backward 10s</button>
      </div>
    </div>
  );
}

export default VideoPlayer;

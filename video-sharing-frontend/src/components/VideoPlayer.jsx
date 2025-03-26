import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * VideoPlayer component
 *  - Uses Video.js for the player with native controls
 *  - Syncs play/pause/seek events via Socket.IO
 */
function VideoPlayer({ socket, roomId }) {
  // --------------------------------------------------
  // Refs
  // --------------------------------------------------
  const videoNodeRef = useRef(null); // Points to the actual <video> DOM node
  const playerRef = useRef(null);    // The Video.js player instance
  const fileInputRef = useRef(null); // <input type="file">

  // So we can block re-emitting if the event came remotely
  const isRemoteActionRef = useRef(false);

  // --------------------------------------------------
  // State
  // --------------------------------------------------
  // We'll store the current video source in state
  const [videoSrc, setVideoSrc] = useState(null);

  // --------------------------------------------------
  // 1) Create & Dispose the Video.js player (once)
  // --------------------------------------------------
  useEffect(() => {
    // Create the Video.js player once, when mounted
    if (!playerRef.current) {
      // Initialize Video.js on our <video> element
      playerRef.current = videojs(videoNodeRef.current, {
        controls: true, // Show native play/pause controls
        autoplay: false,
        fluid: true,    // Make it responsive
      });

      // Attach local event listeners for sync
      attachLocalEventListeners(playerRef.current);
    }

    // Clean up: dispose the player on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // --------------------------------------------------
  // 2) Whenever "videoSrc" changes, update the player's source
  // --------------------------------------------------
  useEffect(() => {
    const player = playerRef.current;
    if (player && videoSrc) {
      player.src(videoSrc);
    }
  }, [videoSrc]);

  // --------------------------------------------------
  // 3) Local Event Listeners on the Video.js player
  //    to emit socket events
  // --------------------------------------------------
  function attachLocalEventListeners(player) {
    // "play" fires when the user presses the native play button or hits spacebar, etc.
    player.on('play', () => {
      console.log('[LOCAL] play event');
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitVideoEvent('play', player.currentTime());
    });

    // "pause" fires when the user presses the native pause button
    player.on('pause', () => {
      console.log('[LOCAL] pause event');
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitVideoEvent('pause', player.currentTime());
    });

    // "seeked" fires when the user drags/clicks the timeline & releases
    player.on('seeked', () => {
      console.log('[LOCAL] seeked event');
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      const newTime = player.currentTime();
      emitVideoEvent('seek', newTime);
    });
  }

  // --------------------------------------------------
  // 4) Socket: Listen for remote play/pause/seek
  // --------------------------------------------------
  useEffect(() => {
    if (!socket) return;

    const handleRemotePlay = ({ currentTime }) => {
      console.log('[REMOTE] play ->', currentTime);
      const player = playerRef.current;
      if (!player) return;
      isRemoteActionRef.current = true;
      player.currentTime(currentTime);
      player.play().catch(err => {
        console.error('[REMOTE] play error:', err);
        isRemoteActionRef.current = false;
      });
    };

    const handleRemotePause = ({ currentTime }) => {
      console.log('[REMOTE] pause ->', currentTime);
      const player = playerRef.current;
      if (!player) return;
      isRemoteActionRef.current = true;
      player.currentTime(currentTime);
      player.pause();
    };

    const handleRemoteSeek = ({ currentTime }) => {
      console.log('[REMOTE] seek ->', currentTime);
      const player = playerRef.current;
      if (!player) return;
      isRemoteActionRef.current = true;
      player.currentTime(currentTime);
    };

    // Attach
    socket.on('video:play', handleRemotePlay);
    socket.on('video:pause', handleRemotePause);
    socket.on('video:seek', handleRemoteSeek);

    // Cleanup
    return () => {
      socket.off('video:play', handleRemotePlay);
      socket.off('video:pause', handleRemotePause);
      socket.off('video:seek', handleRemoteSeek);
    };
  }, [socket]);

  // --------------------------------------------------
  // 5) Helper to emit our local events to the server
  // --------------------------------------------------
  function emitVideoEvent(type, currentTime) {
    if (!socket) return;
    console.log(`[LOCAL] Emitting ${type} -> ${currentTime}`);
    socket.emit(`video:${type}`, { roomId, currentTime });
  }

  // --------------------------------------------------
  // 6) Additional manual controls (Skip, etc.)
  // --------------------------------------------------
  const handlePlay = () => {
    const player = playerRef.current;
    if (!player) return;
    isRemoteActionRef.current = false;
    player.play();
    emitVideoEvent('play', player.currentTime());
  };

  const handlePause = () => {
    const player = playerRef.current;
    if (!player) return;
    isRemoteActionRef.current = false;
    player.pause();
    emitVideoEvent('pause', player.currentTime());
  };

  const handleSkip = (secs) => {
    const player = playerRef.current;
    if (!player) return;
    isRemoteActionRef.current = false;
    const newTime = player.currentTime() + secs;
    player.currentTime(newTime);
    // Programmatic changes won't emit "seeked" automatically
    emitVideoEvent('seek', newTime);
  };

  const handleRestart = () => {
    const player = playerRef.current;
    if (!player) return;
    console.log('[LOCAL] restart video');
    isRemoteActionRef.current = false;
    player.currentTime(0);
    emitVideoEvent('seek', 0);
  };

  // --------------------------------------------------
  // 7) Local File Selection
  // --------------------------------------------------
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('[LOCAL] File Selected:', file.name);
    const url = URL.createObjectURL(file);
    // Video.js expects an object like: { src: "...", type: "video/mp4" }
    setVideoSrc({ src: url, type: 'video/mp4' });
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div className="video-player">
      

      {/* The container for the Video.js player */}
      <div data-vjs-player style={{ marginBottom: '10px' }}>
        <video
          ref={videoNodeRef}
          className="video-js vjs-big-play-centered"
        />
      </div>

      {/* Choose local file */}
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
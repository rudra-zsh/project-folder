import React, { useRef, useEffect, useState } from 'react';

function VideoPlayer({ socket, roomId }) {
  const videoRef = useRef(null);

  // We'll use these booleans to skip the next onPlay/onPause
  const suppressNextOnPlay = useRef(false);
  const suppressNextOnPause = useRef(false);

  // While this is true => we can't do normal play/pause/skip
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [videoSrc, setVideoSrc] = useState(null);

  // Tolerance for ignoring micro difference
  const TOLERANCE = 0.5;

  useEffect(() => {
    if (!socket) return;

    // ---------- Remote "Play" ----------
    const handleRemotePlay = ({ currentTime }) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      const diff = Math.abs(videoEl.currentTime - currentTime);
      // If already playing & difference < TOLERANCE => skip
      if (!videoEl.paused && diff < TOLERANCE) {
        console.log('[VideoPlayer] handleRemotePlay: ignoring micro difference or already playing');
        return;
      }
      console.log('[VideoPlayer] handleRemotePlay => time=', currentTime);
      videoEl.currentTime = currentTime;

      // We'll programmatically call play => so let's suppress onPlay
      suppressNextOnPlay.current = true;
      videoEl.play().catch(err => console.warn('[VideoPlayer] remote play error:', err));
    };

    // ---------- Remote "Pause" ----------
    const handleRemotePause = ({ currentTime }) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      const diff = Math.abs(videoEl.currentTime - currentTime);
      // If already paused & difference < TOLERANCE => skip
      if (videoEl.paused && diff < TOLERANCE) {
        console.log('[VideoPlayer] handleRemotePause: ignoring micro difference or already paused');
        return;
      }
      console.log('[VideoPlayer] handleRemotePause => time=', currentTime);
      videoEl.currentTime = currentTime;

      // We'll programmatically call pause => so let's suppress onPause
      suppressNextOnPause.current = true;
      videoEl.pause();
    };

    // ---------- Remote "SeekAll" (final time) ----------
    const handleSeekAll = ({ currentTime }) => {
      const videoEl = videoRef.current;
      if (!videoEl) return;

      console.log('[VideoPlayer] handleSeekAll => time=', currentTime);
      // Pause & set final time
      videoEl.pause();
      videoEl.currentTime = currentTime;
      setSyncInProgress(true);

      // Acknowledge to server
      socket.emit('video:seekAck', { roomId });
    };

    // ---------- Remote "SeekResume" (all acked) ----------
    const handleSeekResume = () => {
      console.log('[VideoPlayer] handleSeekResume => re-enable controls');
      setSyncInProgress(false);
    };

    socket.on('video:play', handleRemotePlay);
    socket.on('video:pause', handleRemotePause);
    socket.on('video:seekAll', handleSeekAll);
    socket.on('video:seekResume', handleSeekResume);

    return () => {
      socket.off('video:play', handleRemotePlay);
      socket.off('video:pause', handleRemotePause);
      socket.off('video:seekAll', handleSeekAll);
      socket.off('video:seekResume', handleSeekResume);
    };
  }, [socket, roomId]);

  // =====================
  // HTML5 event handlers
  // =====================
  const onLocalPlay = () => {
    if (syncInProgress) {
      console.log('[VideoPlayer] ignoring local onPlay while syncInProgress');
      const videoEl = videoRef.current;
      if (videoEl) videoEl.pause();
      return;
    }
    // If we suppressed this next onPlay => skip broadcasting
    if (suppressNextOnPlay.current) {
      console.log('[VideoPlayer] suppressed onPlay => skip broadcasting');
      suppressNextOnPlay.current = false;
      return;
    }
    // Otherwise, broadcast to others
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;
    console.log('[VideoPlayer] local onPlay => broadcast');
    socket.emit('video:play', {
      roomId,
      currentTime: videoEl.currentTime
    });
  };

  const onLocalPause = () => {
    if (syncInProgress) {
      console.log('[VideoPlayer] ignoring local onPause while syncInProgress');
      return;
    }
    // If we suppressed onPause => skip
    if (suppressNextOnPause.current) {
      console.log('[VideoPlayer] suppressed onPause => skip broadcasting');
      suppressNextOnPause.current = false;
      return;
    }
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;
    console.log('[VideoPlayer] local onPause => broadcast');
    socket.emit('video:pause', {
      roomId,
      currentTime: videoEl.currentTime
    });
  };

  // While user scrubs => we pause for everyone
  const handleSeeking = () => {
    if (syncInProgress) return;
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;
    console.log('[VideoPlayer] onSeeking => pause everyone');
    // We'll do a local pause => so we suppress next onPause
    suppressNextOnPause.current = true;
    videoEl.pause();
    socket.emit('video:pause', {
      roomId,
      currentTime: videoEl.currentTime
    });
  };

  // Once user finishes scrubbing => final time => "video:seek"
  const handleSeeked = () => {
    if (syncInProgress) return;
    const videoEl = videoRef.current;
    if (!videoEl || !socket) return;

    const newTime = videoEl.currentTime;
    // If we moved more than 0.2s => broadcast final
    if (Math.abs(newTime - (videoRef.current?.lastSeek || 0)) > 0.2) {
      console.log('[VideoPlayer] Final seek => time=', newTime);
      videoRef.current.lastSeek = newTime;
      setSyncInProgress(true);
      socket.emit('video:seek', {
        roomId,
        currentTime: newTime
      });
    }
  };

  // =====================
  // Dedicated Buttons
  // =====================
  const handlePlayButton = () => {
    if (syncInProgress) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
    // We'll do a local .play() => so we must suppress next onPlay
    suppressNextOnPlay.current = true;
    videoEl.play();
  };

  const handlePauseButton = () => {
    if (syncInProgress) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
    suppressNextOnPause.current = true;
    videoEl.pause();
  };

  const handleForward10s = () => {
    if (syncInProgress) return;
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.currentTime += 10;
    }
  };

  const handleBackward10s = () => {
    if (syncInProgress) return;
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.currentTime -= 10;
    }
  };

  // =====================
  // Load local file
  // =====================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
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
          onPlay={onLocalPlay}
          onPause={onLocalPause}
          onSeeking={handleSeeking}
          onSeeked={handleSeeked}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      )}

      <br/><br/>
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
      />

      <div style={{ marginTop: '15px' }}>
        <button
          className="glass-button"
          onClick={handlePlayButton}
          disabled={syncInProgress}
        >
          Play
        </button>
        <button
          className="glass-button"
          onClick={handlePauseButton}
          disabled={syncInProgress}
          style={{ marginLeft: '10px' }}
        >
          Pause
        </button>
        <button
          className="glass-button"
          onClick={handleForward10s}
          disabled={syncInProgress}
          style={{ marginLeft: '10px' }}
        >
          Forward 10s
        </button>
        <button
          className="glass-button"
          onClick={handleBackward10s}
          disabled={syncInProgress}
          style={{ marginLeft: '10px' }}
        >
          Backward 10s
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
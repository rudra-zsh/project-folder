// import React, { useRef, useEffect, useState } from 'react';
// import videojs from 'video.js';
// import 'video.js/dist/video-js.css';
// import 'videojs-youtube';

// function VideoPlayer({ socket, roomId }) {
//   // References
//   const videoNodeRef = useRef(null); // <video> element
//   const playerRef = useRef(null);    // Video.js player instance
//   const fileInputRef = useRef(null); // For selecting local files

//   // Prevent local <-> remote event loops
//   const isRemoteActionRef = useRef(false);

//   // Store your current video source and link input
//   const [videoSrc, setVideoSrc] = useState(null); // { src: ..., type: ... }
//   const [videoLink, setVideoLink] = useState('');

//   // Mode state: false => dark mode (default), true => light mode
//   const [lightMode, setLightMode] = useState(false);

//   // Small threshold (in seconds) to ignore minor differences in currentTime
//   const SYNC_THRESHOLD = 3;

//   // A) Create / Dispose the Video.js player exactly once
//   useEffect(() => {
//     if (!playerRef.current) {
//       // Create the Video.js player
//       playerRef.current = videojs(videoNodeRef.current, {
//         controls: true, // show native controls
//         autoplay: false,
//         fluid: true,    // responsive sizing
//       });

//       // Attach local event listeners for sync
//       attachLocalEventListeners(playerRef.current);
//     }

//     // Cleanup on unmount
//     return () => {
//       if (playerRef.current) {
//         playerRef.current.dispose();
//         playerRef.current = null;
//       }
//     };
//   }, []);

//   // B) Whenever "videoSrc" changes, update the player's source
//   useEffect(() => {
//     const player = playerRef.current;
//     if (!player || !videoSrc) return;
//     player.src(videoSrc);
//   }, [videoSrc]);

//   // Mode toggle: Add or remove light-mode class from document body
//   const toggleMode = () => {
//     if (lightMode) {
//       document.body.classList.remove('light-mode');
//       setLightMode(false);
//     } else {
//       document.body.classList.add('light-mode');
//       setLightMode(true);
//     }
//   };

//   // C) Local event listeners => emit
//   function attachLocalEventListeners(player) {
//     player.on('play', () => {
//       console.log('[LOCAL] play event');
//       if (isRemoteActionRef.current) {
//         isRemoteActionRef.current = false;
//         return;
//       }
//       emitVideoEvent('play', player.currentTime());
//     });

//     player.on('pause', () => {
//       console.log('[LOCAL] pause event');
//       if (isRemoteActionRef.current) {
//         isRemoteActionRef.current = false;
//         return;
//       }
//       emitVideoEvent('pause', player.currentTime());
//     });

//     player.on('seeked', () => {
//       console.log('[LOCAL] seeked event');
//       if (isRemoteActionRef.current) {
//         isRemoteActionRef.current = false;
//         return;
//       }
//       const newTime = player.currentTime();
//       emitVideoEvent('seek', newTime);
//     });
//   }

//   // D) Socket: Listen for REMOTE play / pause / seek
//   useEffect(() => {
//     if (!socket) return;

//     const handleRemotePlay = ({ currentTime }) => {
//       console.log('[REMOTE] play ->', currentTime);
//       const player = playerRef.current;
//       if (!player) return;

//       const diff = Math.abs(player.currentTime() - currentTime);
//       console.log('[REMOTE] time diff:', diff);

//       if (diff > SYNC_THRESHOLD) {
//         isRemoteActionRef.current = true;
//         player.currentTime(currentTime);
//       }

//       if (player.paused()) {
//         isRemoteActionRef.current = true;
//         player.play().catch(err => {
//           console.error('[REMOTE] play() error:', err);
//           isRemoteActionRef.current = false;
//         });
//       }
//     };

//     const handleRemotePause = ({ currentTime }) => {
//       console.log('[REMOTE] pause ->', currentTime);
//       const player = playerRef.current;
//       if (!player) return;

//       const diff = Math.abs(player.currentTime() - currentTime);
//       if (diff > SYNC_THRESHOLD) {
//         isRemoteActionRef.current = true;
//         player.currentTime(currentTime);
//       }

//       if (!player.paused()) {
//         isRemoteActionRef.current = true;
//         player.pause();
//       }
//     };

//     const handleRemoteSeek = ({ currentTime }) => {
//       console.log('[REMOTE] seek ->', currentTime);
//       const player = playerRef.current;
//       if (!player) return;

//       const diff = Math.abs(player.currentTime() - currentTime);
//       if (diff > SYNC_THRESHOLD) {
//         isRemoteActionRef.current = true;
//         player.currentTime(currentTime);
//       }
//     };

//     socket.on('video:play', handleRemotePlay);
//     socket.on('video:pause', handleRemotePause);
//     socket.on('video:seek', handleRemoteSeek);

//     return () => {
//       socket.off('video:play', handleRemotePlay);
//       socket.off('video:pause', handleRemotePause);
//       socket.off('video:seek', handleRemoteSeek);
//     };
//   }, [socket]);

//   // E) Emit local events to server
//   function emitVideoEvent(type, currentTime) {
//     if (!socket) return;
//     console.log(`[LOCAL] Emitting ${type} -> ${currentTime}`);
//     socket.emit(`video:${type}`, { roomId, currentTime });
//   }

//   // F) Optional manual controls: skip/restart
//   const handlePlay = () => {
//     const player = playerRef.current;
//     if (!player) return;
//     isRemoteActionRef.current = false;
//     player.play();
//     emitVideoEvent('play', player.currentTime());
//   };

//   const handlePause = () => {
//     const player = playerRef.current;
//     if (!player) return;
//     isRemoteActionRef.current = false;
//     player.pause();
//     emitVideoEvent('pause', player.currentTime());
//   };

//   const handleSkip = (secs) => {
//     const player = playerRef.current;
//     if (!player) return;
//     isRemoteActionRef.current = false;
//     const newTime = player.currentTime() + secs;
//     player.currentTime(newTime);
//     emitVideoEvent('seek', newTime);
//   };

//   const handleRestart = () => {
//     const player = playerRef.current;
//     if (!player) return;
//     console.log('[LOCAL] Restarting video');
//     isRemoteActionRef.current = false;
//     player.currentTime(0);
//     emitVideoEvent('seek', 0);
//   };

//   // G) Local File selection
//   const handleFileChange = (e) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     console.log('[LOCAL] File Selected:', file.name);
//     const url = URL.createObjectURL(file);
//     setVideoSrc({ src: url, type: 'video/mp4' });
//   };

//   // H) Link selection (YouTube or direct MP4 link)
//   const handleVideoLink = () => {
//     const linkLower = videoLink.toLowerCase();
//     if (linkLower.includes('youtube.com') || linkLower.includes('youtu.be')) {
//       setVideoSrc({ src: videoLink, type: 'video/youtube' });
//     } else {
//       setVideoSrc({ src: videoLink, type: 'video/mp4' });
//     }
//   };

//   return (
//     <div className="video-player">
//       <div className="video-container" data-vjs-player>
//         <video ref={videoNodeRef} className="video-js vjs-big-play-centered" />
//       </div>

//       <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
//         <button 
//           className="glass-button" 
//           onClick={toggleMode} 
//           style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
//         >
//           {lightMode 
//             ? <span role="img" aria-label="Switch to Dark Mode">🌙</span>
//             : <span role="img" aria-label="Switch to Light Mode">☀️</span>
//           }
//         </button>
//         <input 
//           type="text" 
//           placeholder="Paste YouTube or direct video link" 
//           value={videoLink}
//           onChange={(e) => setVideoLink(e.target.value)}
//           style={{ flex: 2, padding: '6px 12px', fontSize: '0.8rem' }}
//         />
//         <button 
//           className="glass-button" 
//           onClick={() => fileInputRef.current?.click()}
//           style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
//         >
//           Select Local File
//         </button>
//       </div>
//       <button 
//         className="glass-button" 
//         onClick={handleVideoLink} 
//         style={{ padding: '6px 12px', fontSize: '0.8rem', marginBottom: '15px', width: '100%' }}
//       >
//         Load Link
//       </button>

//       <input 
//         type="file" 
//         accept="video/*" 
//         ref={fileInputRef} 
//         onChange={handleFileChange} 
//         style={{ display: 'none' }} 
//       />

//       <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
//         <button className="glass-button" onClick={() => handleSkip(-10)}>
//           Backward 10s
//         </button>
//         <button className="glass-button" onClick={handlePlay}>
//           Play
//         </button>
//         <button className="glass-button" onClick={handlePause}>
//           Pause
//         </button>
//         <button className="glass-button" onClick={() => handleSkip(10)}>
//           Forward 10s
//         </button>
//         <button className="glass-button" onClick={handleRestart}>
//           Restart
//         </button>
//       </div>
//     </div>
//   );
// }

// export default VideoPlayer;
import React, { useRef, useEffect, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import 'videojs-youtube';

function VideoPlayer({ socket, roomId }) {
  // References
  const videoNodeRef = useRef(null); // <video> element
  const playerRef = useRef(null);    // Video.js player instance
  const fileInputRef = useRef(null); // For selecting local files

  // Prevent local <-> remote event loops
  const isRemoteActionRef = useRef(false);

  // Store your current video source and link input
  const [videoSrc, setVideoSrc] = useState(null); // { src: ..., type: ... }
  const [videoLink, setVideoLink] = useState('');

  // Mode state: false => dark mode (default), true => light mode
  const [lightMode, setLightMode] = useState(false);

  // Small threshold (in seconds) to ignore minor differences in currentTime
  const SYNC_THRESHOLD = 3;

  // A) Create / Dispose the Video.js player exactly once
  useEffect(() => {
    if (!playerRef.current) {
      // Create the Video.js player
      playerRef.current = videojs(videoNodeRef.current, {
        controls: true,
        autoplay: false,
        fluid: true,
      });

      // Attach local event listeners for sync
      attachLocalEventListeners(playerRef.current);
    }

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  // B) Whenever "videoSrc" changes, update the player's source
  useEffect(() => {
    const player = playerRef.current;
    if (!player || !videoSrc) return;
    player.src(videoSrc);
  }, [videoSrc]);

  // Mode toggle: Add or remove light-mode class from document body
  const toggleMode = () => {
    if (lightMode) {
      document.body.classList.remove('light-mode');
      setLightMode(false);
    } else {
      document.body.classList.add('light-mode');
      setLightMode(true);
    }
  };

  // C) Local event listeners => emit events to sync with other clients
  function attachLocalEventListeners(player) {
    player.on('play', () => {
      console.log('[LOCAL] play event');
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitVideoEvent('play', player.currentTime());
    });

    player.on('pause', () => {
      console.log('[LOCAL] pause event');
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitVideoEvent('pause', player.currentTime());
    });

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

  // D) Socket: Listen for REMOTE play / pause / seek events
  useEffect(() => {
    if (!socket) return;

    const handleRemotePlay = ({ currentTime }) => {
      console.log('[REMOTE] play ->', currentTime);
      const player = playerRef.current;
      if (!player) return;

      const diff = Math.abs(player.currentTime() - currentTime);
      console.log('[REMOTE] time diff:', diff);

      if (diff > SYNC_THRESHOLD) {
        isRemoteActionRef.current = true;
        player.currentTime(currentTime);
      }

      if (player.paused()) {
        isRemoteActionRef.current = true;
        player.play().catch(err => {
          console.error('[REMOTE] play() error:', err);
          isRemoteActionRef.current = false;
        });
      }
    };

    const handleRemotePause = ({ currentTime }) => {
      console.log('[REMOTE] pause ->', currentTime);
      const player = playerRef.current;
      if (!player) return;

      const diff = Math.abs(player.currentTime() - currentTime);
      if (diff > SYNC_THRESHOLD) {
        isRemoteActionRef.current = true;
        player.currentTime(currentTime);
      }

      if (!player.paused()) {
        isRemoteActionRef.current = true;
        player.pause();
      }
    };

    const handleRemoteSeek = ({ currentTime }) => {
      console.log('[REMOTE] seek ->', currentTime);
      const player = playerRef.current;
      if (!player) return;

      const diff = Math.abs(player.currentTime() - currentTime);
      if (diff > SYNC_THRESHOLD) {
        isRemoteActionRef.current = true;
        player.currentTime(currentTime);
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

  // E) Emit local events to server
  function emitVideoEvent(type, currentTime) {
    if (!socket) return;
    console.log(`[LOCAL] Emitting ${type} -> ${currentTime}`);
    socket.emit(`video:${type}`, { roomId, currentTime });
  }

  // F) Optional manual controls: play, pause, skip, restart
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
    emitVideoEvent('seek', newTime);
  };

  const handleRestart = () => {
    const player = playerRef.current;
    if (!player) return;
    console.log('[LOCAL] Restarting video');
    isRemoteActionRef.current = false;
    player.currentTime(0);
    emitVideoEvent('seek', 0);
  };

  // G) Local file selection: update video source with selected file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('[LOCAL] File Selected:', file.name);
    const url = URL.createObjectURL(file);
    setVideoSrc({ src: url, type: 'video/mp4' });
  };

  // H) Link selection (YouTube or direct MP4 link)
  const handleVideoLink = () => {
    const linkLower = videoLink.toLowerCase();
    if (linkLower.includes('youtube.com') || linkLower.includes('youtu.be')) {
      setVideoSrc({ src: videoLink, type: 'video/youtube' });
    } else {
      setVideoSrc({ src: videoLink, type: 'video/mp4' });
    }
  };

  return (
    <div className="video-player">
      <div className="video-container" data-vjs-player>
        <video ref={videoNodeRef} className="video-js vjs-big-play-centered" />
      </div>

      {/* Single row containing all controls in the new order:
          Light/Dark mode toggle, Select Local File button, input field, Load Link button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        <button 
          className="glass-button" 
          onClick={toggleMode} 
          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
        >
          {lightMode 
            ? <span role="img" aria-label="Switch to Dark Mode">🌙</span>
            : <span role="img" aria-label="Switch to Light Mode">☀️</span>
          }
        </button>
        <button 
          className="glass-button" 
          onClick={() => fileInputRef.current?.click()}
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          Select Local File
        </button>
        <input 
          type="text" 
          placeholder="Paste YouTube or direct video link" 
          value={videoLink}
          onChange={(e) => setVideoLink(e.target.value)}
          style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
        />
        <button 
          className="glass-button" 
          onClick={handleVideoLink} 
          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
        >
          Load Link
        </button>
      </div>

      <input 
        type="file" 
        accept="video/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
      />

      {/* Manual video controls */}
      <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
        <button className="glass-button" onClick={() => handleSkip(-10)}>
          Backward 10s
        </button>
        <button className="glass-button" onClick={handlePlay}>
          Play
        </button>
        <button className="glass-button" onClick={handlePause}>
          Pause
        </button>
        <button className="glass-button" onClick={() => handleSkip(10)}>
          Forward 10s
        </button>
        <button className="glass-button" onClick={handleRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}

export default VideoPlayer;
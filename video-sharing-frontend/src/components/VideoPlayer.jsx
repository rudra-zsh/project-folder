import React, { useRef, useEffect, useState, forwardRef } from 'react';
import Plyr from 'plyr-react';
import 'plyr/dist/plyr.css';

function VideoPlayer({ socket, roomId }) {
  const plyrRef = useRef(null);
  const lastSeekEmittedRef = useRef(0);
  const [videoSrc, setVideoSrc] = useState(null);
  const fileInputRef = useRef(null);
  const isRemoteActionRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const handleRemotePlay = ({ currentTime }) => {
      console.log('Remote Play Event Received:', currentTime);
      const player = plyrRef.current?.plyr;
      if (player) {
        isRemoteActionRef.current = true;
        player.currentTime = currentTime;
        player.play().catch(err => {
          console.error('Remote play error:', err);
          isRemoteActionRef.current = false;
        });
      }
    };

    const handleRemotePause = ({ currentTime }) => {
      console.log('Remote Pause Event Received:', currentTime);
      const player = plyrRef.current?.plyr;
      if (player) {
        isRemoteActionRef.current = true;
        player.currentTime = currentTime;
        player.pause();
      }
    };

    const handleRemoteSeek = ({ currentTime }) => {
      console.log('Remote Seek Event Received:', currentTime);
      const player = plyrRef.current?.plyr;
      if (player) {
        isRemoteActionRef.current = true;
        player.currentTime = currentTime;
        lastSeekEmittedRef.current = currentTime;
        //player.forwardRef = currentTime;
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

  const emitVideoEvent = (eventType, currentTime) => {
    if (!socket) return;

    console.log(`Emitting ${eventType} event to room ${roomId}:`, currentTime);
    socket.emit(`video:${eventType}`, { roomId, currentTime });
  };

  const handlePlayerReady = (player) => {
    console.log('Player is ready');
    
    player.on('play', () => {
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitVideoEvent('play', player.currentTime);
    });

    player.on('pause', () => {
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }
      emitVideoEvent('pause', player.currentTime);
    });

    player.on('seeked', () => {
        //player.pause();
        console.log('Seeked event fired!');
      if (isRemoteActionRef.current) {
        isRemoteActionRef.current = false;
        return;
      }

      const newTime = player.currentTime;
      emitVideoEvent('seek', newTime);
      // const diff = Math.abs(newTime - lastSeekEmittedRef.current);

      // if (diff > 0.2) {
      //   console.log('Local Seek Detected:', newTime);
      //   emitVideoEvent('seek', newTime);
      //   lastSeekEmittedRef.current = newTime;
      // }
    });
  };

  const handlePlay = () => {
    const player = plyrRef.current?.plyr;
    if (!player) return;

    console.log('Manual Play Triggered');
    isRemoteActionRef.current = false;
    player.play().catch(err => console.error('Manual play error:', err));
    emitVideoEvent('play', player.currentTime);
    
  };

  const handlePause = () => {
    const player = plyrRef.current?.plyr;
    if (!player) return;

    console.log('Manual Pause Triggered');
    isRemoteActionRef.current = false;
    emitVideoEvent('pause', player.currentTime);
    player.pause();
  };

  const handleSkip = (seconds) => {
    const player = plyrRef.current?.plyr;
    if (!player) return;

    const newTime = player.currentTime + seconds;
    console.log(`Skipping ${seconds} seconds. New time: ${newTime}`);
    isRemoteActionRef.current = false;
    player.currentTime = newTime;
    emitVideoEvent('seek', newTime);
    lastSeekEmittedRef.current = newTime;
  };

  const handleRestart = () => {
    const player = plyrRef.current?.plyr;
    if (!player) return;

    console.log('Restarting Video');
    isRemoteActionRef.current = false;
    player.currentTime = 0;
    emitVideoEvent('seek', 0);
    lastSeekEmittedRef.current = 0;
  };
  // const handleSeeked = () => {
  //   const player = plyrRef.current?.plyr;
  //   if (!player || !socket) return;
  
  //   const newTime = player.currentTime;
  //   const diff = Math.abs(newTime - lastSeekEmittedRef.current);
    
  //   if (diff > 0.2) {
  //     socket.emit('video:seek', { roomId, currentTime: newTime });
      
  //     // Update last emitted time after short delay
  //     setTimeout(() => {
  //       lastSeekEmittedRef.current = newTime;
  //     }, 1000);
  //   }
  // };


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('File Selected:', file.name);
      const url = URL.createObjectURL(file);
      setVideoSrc({
        type: 'video',
        sources: [{
          src: url,
          type: 'video/mp4'
        }]
      });
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="video-player">
      {videoSrc && (
        <Plyr
          ref={plyrRef}
          source={videoSrc}
          
          onReady={handlePlayerReady} 
          //onReady={handlePlayerReady}
          options={{
            controls: [
              'play-large', 
              
              'progress', 
              'current-time', 
              'mute', 
              'volume', 
              
              'fullscreen'
            ]
          }}
        />
      )}

      <div style={{ marginTop: '15px' }}>
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

//Buttons working but Double Pressing 
// import React, { useRef, useEffect, useState } from 'react';
// import Plyr from 'plyr-react';
// import 'plyr/dist/plyr.css';

// function VideoPlayer({ socket, roomId }) {
//   const plyrRef = useRef(null);
//   const lastSeekEmittedRef = useRef(0);
//   const [videoSrc, setVideoSrc] = useState(null);
//   const fileInputRef = useRef(null);
//   const isRemote = useRef(false);

//   useEffect(() => {
//     if (!socket) return;

//     const handleRemotePlay = ({ currentTime }) => {
//       const player = plyrRef.current?.plyr;
//       if (player) {
//         isRemote.current = true;
//         player.currentTime = currentTime;
//         player.play().catch(err => console.error('Remote play error:', err));
//       }
//     };

//     const handleRemotePause = ({ currentTime }) => {
//       const player = plyrRef.current?.plyr;
//       if (player) {
//         isRemote.current = true;
//         player.currentTime = currentTime;
//         player.pause();
//       }
//     };

//     const handleRemoteSeek = ({ currentTime }) => {
//       const player = plyrRef.current?.plyr;
//       if (player) {
//         isRemote.current = true;
//         player.currentTime = currentTime;
//         lastSeekEmittedRef.current = currentTime;
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

//   const handlePlay = () => {
//     const player = plyrRef.current?.plyr;
//     if (!player || !socket) return;
    
//     if (isRemote.current) {
//       isRemote.current = false;
//       return;
//     }
    
//     socket.emit('video:play', { roomId, currentTime: player.currentTime });
//     isRemote.current = true; // Prevent event loop
//     player.play().catch(err => console.error('Local play error:', err));
//   };

//   const handlePause = () => {
//     const player = plyrRef.current?.plyr;
//     if (!player || !socket) return;

//     if (isRemote.current) {
//       isRemote.current = false;
//       return;
//     }
    
//     socket.emit('video:pause', { roomId, currentTime: player.currentTime });
//     isRemote.current = true; // Prevent event loop
//     player.pause();
//   };

//   const handleSkip = (seconds) => {
//     const player = plyrRef.current?.plyr;
//     if (!player || !socket) return;
//     const newTime = player.currentTime + seconds;
//     player.currentTime = newTime;
//     socket.emit('video:seek', { roomId, currentTime: newTime });
//     lastSeekEmittedRef.current = newTime;
//   };

//   const handleRestart = () => {
//     const player = plyrRef.current?.plyr;
//     if (!player || !socket) return;
//     player.currentTime = 0;
//     socket.emit('video:seek', { roomId, currentTime: 0 });
//     lastSeekEmittedRef.current = 0;
//   };

//   const handleSeeked = () => {
//     const player = plyrRef.current?.plyr;
//     if (!player || !socket) return;

//     if (isRemote.current) {
//       isRemote.current = false;
//       return;
//     }

//     const newTime = player.currentTime;
//     const diff = Math.abs(newTime - lastSeekEmittedRef.current);
//     if (diff > 0.2) {
//       socket.emit('video:seek', { roomId, currentTime: newTime });
//       lastSeekEmittedRef.current = newTime;
//     }
//   };

//   const handleFileChange = (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       const url = URL.createObjectURL(file);
//       setVideoSrc({
//         type: 'video',
//         sources: [{
//           src: url,
//           type: 'video/mp4'
//         }]
//       });
//     }
//   };

//   const triggerFileSelect = () => {
//     fileInputRef.current.click();
//   };

//   return (
//     <div className="video-player">
//       {videoSrc && (
//         <Plyr
//           ref={plyrRef}
//           source={videoSrc}
//           eventListeners={{
//             play: handlePlay,
//             pause: handlePause,
//             seeked: handleSeeked
//           }}
//         />
//       )}

//       <div style={{ marginTop: '15px' }}>
//         <button
//           className="glass-button"
//           onClick={triggerFileSelect}
//           style={{ marginBottom: '10px', padding: '6px 12px', fontSize: '0.8rem' }}
//         >
//           Select File
//         </button>
//         <br />

//         <button className="glass-button" onClick={() => handleSkip(-10)}>
//           Backward 10s
//         </button>
//         <button className="glass-button" onClick={handlePlay} style={{ marginLeft: '10px' }}>
//           Play
//         </button>
//         <button className="glass-button" onClick={handlePause} style={{ marginLeft: '10px' }}>
//           Pause
//         </button>
//         <button className="glass-button" onClick={() => handleSkip(10)} style={{ marginLeft: '10px' }}>
//           Forward 10s
//         </button>
//         <button className="glass-button" onClick={handleRestart} style={{ marginLeft: '10px' }}>
//           Restart
//         </button>

//         <input
//           type="file"
//           accept="video/*"
//           ref={fileInputRef}
//           onChange={handleFileChange}
//           style={{ display: 'none' }}
//         />
//       </div>
//     </div>
//   );
// }

// export default VideoPlayer;


/* nice UI
import React, { useRef, useEffect, useState } from 'react';
import Plyr from 'plyr-react';
import 'plyr/dist/plyr.css';

function VideoPlayer({ socket, roomId }) {
  const plyrRef = useRef(null);
  const playerInstance = useRef(null);
  const lastSeekEmittedRef = useRef(0);
  const [videoSrc, setVideoSrc] = useState(null);
  const fileInputRef = useRef(null);
  const isRemote = useRef(false);

  // Initialize player and event listeners
  useEffect(() => {
    if (!socket || !playerInstance.current) return;

    const handleRemotePlay = ({ currentTime }) => {
      isRemote.current = true;
      playerInstance.current.currentTime = currentTime;
      playerInstance.current.play().catch(console.error);
      setTimeout(() => (isRemote.current = false), 100);
    };

    const handleRemotePause = ({ currentTime }) => {
      isRemote.current = true;
      playerInstance.current.currentTime = currentTime;
      playerInstance.current.pause();
      setTimeout(() => (isRemote.current = false), 100);
    };

    const handleRemoteSeek = ({ currentTime }) => {
      isRemote.current = true;
      playerInstance.current.currentTime = currentTime;
      lastSeekEmittedRef.current = currentTime;
      setTimeout(() => (isRemote.current = false), 100);
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

  // Set up player event handlers
  const handlePlayerReady = (player) => {
    playerInstance.current = player;

    player.on('play', () => {
      if (isRemote.current) return;
      socket.emit('video:play', {
        roomId,
        currentTime: player.currentTime,
      });
    });

    player.on('pause', () => {
      if (isRemote.current) return;
      socket.emit('video:pause', {
        roomId,
        currentTime: player.currentTime,
      });
    });

    player.on('seeked', () => {
      if (isRemote.current) return;
      const newTime = player.currentTime;
      const diff = Math.abs(newTime - lastSeekEmittedRef.current);
      if (diff > 0.2) {
        socket.emit('video:seek', { roomId, currentTime: newTime });
        lastSeekEmittedRef.current = newTime;
      }
    });
  };

  const handlePlay = () => {
    if (!playerInstance.current || isRemote.current) return;
    playerInstance.current.play();
    socket.emit('video:play', {
      roomId,
      currentTime: playerInstance.current.currentTime,
    });
  };

  const handlePause = () => {
    if (!playerInstance.current || isRemote.current) return;
    playerInstance.current.pause();
    socket.emit('video:pause', {
      roomId,
      currentTime: playerInstance.current.currentTime,
    });
  };

  const handleSkip = (seconds) => {
    if (!playerInstance.current || !socket) return;
    const newTime = playerInstance.current.currentTime + seconds;
    playerInstance.current.currentTime = newTime;
    socket.emit('video:seek', { roomId, currentTime: newTime });
    lastSeekEmittedRef.current = newTime;
  };

  const handleRestart = () => {
    if (!playerInstance.current || !socket) return;
    playerInstance.current.currentTime = 0;
    socket.emit('video:seek', { roomId, currentTime: 0 });
    lastSeekEmittedRef.current = 0;
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc({
        type: 'video',
        sources: [
          {
            src: url,
            type: 'video/mp4',
          },
        ],
      });
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="video-player">
      {videoSrc && (
        <Plyr
          ref={plyrRef}
          source={videoSrc}
          onReady={handlePlayerReady}
          options={{
            controls: [
              'play-large',
              'play',
              'progress',
              'current-time',
              'mute',
              'volume',
              'settings',
              'fullscreen',
            ],
          }}
        />
      )}

      <div style={{ marginTop: '15px' }}>
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

//----------------------------------------------------

//native not wroking -------------------------------->



// import React, { useRef, useEffect, useState } from 'react';

// function VideoPlayer({ socket, roomId }) {
//   const videoRef = useRef(null);
//   const lastSeekEmittedRef = useRef(0);
//   const [videoSrc, setVideoSrc] = useState(null);
//   const fileInputRef = useRef(null);

//   useEffect(() => {
//     if (!socket) return;

//     const handleRemotePlay = ({ currentTime }) => {
//       const videoEl = videoRef.current;
//       if (videoEl) {
//         videoEl.currentTime = currentTime;
//         if (videoEl.paused) {
//           videoEl.play().catch(err => console.error('play() error:', err));
//         }
//       }
//     };

//     const handleRemotePause = ({ currentTime }) => {
//       const videoEl = videoRef.current;
//       if (videoEl && !videoEl.paused) {
//         videoEl.currentTime = currentTime;
//         videoEl.pause();
//       }
//     };

//     const handleRemoteSeek = ({ currentTime }) => {
//       const videoEl = videoRef.current;
//       if (videoEl) {
//         videoEl.currentTime = currentTime;
//         lastSeekEmittedRef.current = currentTime;
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

//   const handlePlay = () => {
//     const videoEl = videoRef.current;
//     if (!videoEl || !socket) return;
//     socket.emit('video:play', { roomId, currentTime: videoEl.currentTime });
//     videoEl.play().catch(err => console.error('local play() error:', err));
//   };

//   const handlePause = () => {
//     const videoEl = videoRef.current;
//     if (!videoEl || !socket) return;
//     socket.emit('video:pause', { roomId, currentTime: videoEl.currentTime });
//     videoEl.pause();
//   };

//   const handleSkip = (seconds) => {
//     const videoEl = videoRef.current;
//     if (!videoEl || !socket) return;
//     videoEl.currentTime += seconds;
//     socket.emit('video:seek', { roomId, currentTime: videoEl.currentTime });
//     lastSeekEmittedRef.current = videoEl.currentTime;
//   };

//   const handleRestart = () => {
//     const videoEl = videoRef.current;
//     if (!videoEl || !socket) return;
//     videoEl.currentTime = 0;
//     socket.emit('video:seek', { roomId, currentTime: 0 });
//     lastSeekEmittedRef.current = 0;
//   };

//   const handleSeeked = () => {
//     const videoEl = videoRef.current;
//     if (!videoEl || !socket) return;

//     const newTime = videoEl.currentTime;
//     const diff = Math.abs(newTime - lastSeekEmittedRef.current);
//     if (diff > 0.2) {
//       //videoEl.pause();
//       socket.emit('video:seek', { roomId, currentTime: newTime });

//       setTimeout(() => {
//         lastSeekEmittedRef.current = newTime;
//       }, 1000);
//     }
//   };

//   const handleFileChange = (event) => {
//     const file = event.target.files[0];
//     if (file) {
//       const url = URL.createObjectURL(file);
//       setVideoSrc(url);
//     }
//   };

//   const triggerFileSelect = () => {
//     fileInputRef.current.click();
//   };

//   return (
//     <div className="video-player">
//       {videoSrc && (
//         <video
//           ref={videoRef}
//           width="100%"
//           controls
//           onSeeked={handleSeeked}/*
//           onPlay={handlePlay}
//           onPause={handlePause}
//             */
//         >
//           <source src={videoSrc} type="video/mp4" />
//           Your browser does not support HTML5 video.
//         </video>
//       )}

//       <div style={{ marginTop: '15px' }}>
//         {/* Smaller select file button placed above */}
//         <button
//           className="glass-button"
//           onClick={triggerFileSelect}
//           style={{ marginBottom: '10px', padding: '6px 12px', fontSize: '0.8rem' }}
//         >
//           Select File
//         </button>
//         <br />

//         <button className="glass-button" onClick={() => handleSkip(-10)}>
//           Backward 10s
//         </button>
//         <button className="glass-button" onClick={handlePlay} style={{ marginLeft: '10px' }}>
//           Play
//         </button>
//         <button className="glass-button" onClick={handlePause} style={{ marginLeft: '10px' }}>
//           Pause
//         </button>
//         <button className="glass-button" onClick={() => handleSkip(10)} style={{ marginLeft: '10px' }}>
//           Forward 10s
//         </button>
//         <button className="glass-button" onClick={handleRestart} style={{ marginLeft: '10px' }}>
//           Restart
//         </button>

//         <input
//           type="file"
//           accept="video/*"
//           ref={fileInputRef}
//           onChange={handleFileChange}
//           style={{ display: 'none' }}
//         />
//       </div>
//     </div>
//   );
// }

// export default VideoPlayer;
// //working
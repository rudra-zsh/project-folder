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
        <source src="https://rr2---sn-cvh7knzl.googlevideo.com/videoplayback?expire=1738153522&ei=0smZZ--EJNnap-oPge-q6Ak&ip=105.102.217.68&id=o-AF31gBOLVwx25ONs9TibKUn-S62WQZHOYLkiYVD3F_06&itag=18&source=youtube&requiressl=yes&xpc=EgVo2aDSNQ%3D%3D&bui=AY2Et-My1v2ZQNHDhsfYzqMd2jncnBI03yiqY2Hrjx8BAXd9qDtRFEzyY7axP5ZgHWj3kkV3iF7To7nb&spc=9kzgDSGAhJTAhWCpO8s7y5gh4iAYz8z7JkiP-RJAmldAkIWM1rT6IhkA4rz923keIQ&vprv=1&svpuc=1&mime=video%2Fmp4&ns=EO-06yqbGqqvEM1D5qR_V9AQ&rqh=1&gir=yes&clen=28769077&ratebypass=yes&dur=562.898&lmt=1738110195639741&fexp=24350590,24350737,24350824,24350827,24350933,24350961,24350977,24350999,24351028,24351059,24351081,51326932,51331020,51353498,51371294&c=MWEB&sefc=1&txp=4538534&n=T-V3EABB69UAwQ&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cxpc%2Cbui%2Cspc%2Cvprv%2Csvpuc%2Cmime%2Cns%2Crqh%2Cgir%2Cclen%2Cratebypass%2Cdur%2Clmt&sig=AJfQdSswRgIhAPbztGZY-qNiYLeIQyf8aIAhv0uUOzhhsvssujlwIVQeAiEAlGuDRJHASG_6olBhGbUPGL5AmXDkbhKuG7YPfhHQzCg%3D&title=Samsung%20Galaxy%20S25%2FUltra%20Impressions%3A%20What%20Happened%3F&rm=sn-5abxgpxuxaxjvh-5aby7e,sn-hgnek7e&rrc=79,104&req_id=1403978c5e5a3ee&cmsv=e&rms=rdu,au&redirect_counter=2&cms_redirect=yes&ipbypass=yes&met=1738147361,&mh=b3&mip=14.194.118.66&mm=29&mn=sn-cvh7knzl&ms=rdu&mt=1738147028&mv=m&mvi=2&pl=22&lsparams=ipbypass,met,mh,mip,mm,mn,ms,mv,mvi,pl,rms&lsig=AGluJ3MwRAIgNzMo4J-h3eTihLeqeuK8XvOk7gMyGo3GU5BwlV6T8akCIHhERxwKX8-SyZRAo1uG5HcesH4E4EhAGu6HmA3L8Noe" type="video/mp4" />
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

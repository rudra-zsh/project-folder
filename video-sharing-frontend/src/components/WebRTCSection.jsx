import React, { useState, useEffect, useRef } from 'react';

function WebRTCSection({ socket, roomId }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const peersRef = useRef({});
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);

  useEffect(() => {
    if (!socket) return;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => setLocalStream(stream))
      .catch(err => console.error('Media Error:', err));

    const handleOffer = async ({ fromSocketId, offer }) => {
      const pc = createOrGetPeerConnection(fromSocketId);
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtcAnswer', { toSocketId: fromSocketId, answer });
    };
    socket.on('webrtcOffer', handleOffer);

    const handleAnswer = async ({ fromSocketId, answer }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc) {
        await pc.setRemoteDescription(answer);
      }
    };
    socket.on('webrtcAnswer', handleAnswer);

    const handleCandidate = ({ fromSocketId, candidate }) => {
      const pc = peersRef.current[fromSocketId];
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
      }
    };
    socket.on('webrtcIceCandidate', handleCandidate);

    return () => {
      socket.off('webrtcOffer', handleOffer);
      socket.off('webrtcAnswer', handleAnswer);
      socket.off('webrtcIceCandidate', handleCandidate);
      Object.values(peersRef.current).forEach(pc => pc.close());
    };
  }, [socket]);

  useEffect(() => {
    if (!localStream) return;
    for (let pc of Object.values(peersRef.current)) {
      pc.getSenders().forEach(sender => pc.removeTrack(sender));
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }
  }, [localStream]);

  const createOrGetPeerConnection = (remoteId) => {
    let pc = peersRef.current[remoteId];
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit('webrtcIceCandidate', {
          toSocketId: remoteId,
          candidate: e.candidate
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteStreams(prev => ({ ...prev, [remoteId]: e.streams[0] }));
    };

    peersRef.current[remoteId] = pc;
    return pc;
  };

  const callEveryone = () => {
    alert("In a real app, you'd call each participant. This is just a demonstration!");
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const newState = !videoOn;
    setVideoOn(newState);
    localStream.getVideoTracks().forEach(track => {
      track.enabled = newState;
    });
  };

  const toggleAudio = () => {
    if (!localStream) return;
    const newState = !audioOn;
    setAudioOn(newState);
    localStream.getAudioTracks().forEach(track => {
      track.enabled = newState;
    });
  };

  return (
    <div className="webrtc-section">
      <h3>Live Video Chat</h3>

      {localStream && (
        <video
          className="local-video"
          ref={ref => { if (ref) ref.srcObject = localStream; }}
          autoPlay
          muted
        />
      )}

      <div className="video-grid">
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <video
            key={id}
            className="remote-video"
            autoPlay
            ref={ref => { if (ref) ref.srcObject = stream; }}
          />
        ))}
      </div>

      <div className="webrtc-controls">
        <button className="glass-button" onClick={callEveryone}>
          Call Everyone (Demo)
        </button>
        <button className="glass-button" onClick={toggleVideo}>
          {videoOn ? 'Video Off' : 'Video On'}
        </button>
        <button className="glass-button" onClick={toggleAudio}>
          {audioOn ? 'Mute' : 'Unmute'}
        </button>
      </div>
    </div>
  );
}

export default WebRTCSection;

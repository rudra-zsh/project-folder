import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  transports: ['websocket'],
  pingTimeout: 1800000,
  pingInterval: 25000,
});

function generateRandomAlphaNumeric() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function Home() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  //rmid=null;
  const [username, setUsername] = useState('');
  const updateUsername = (newUsername) => {
    setUsername(newUsername);
    // localStorage.setItem('username',newUsername);
    socket.emit('updateUsername',{username: newUsername});
  }

  //for existing room
  const handleJoin = () => {
    if (!username.trim()) {
      alert("Please enter a username before joining.");
      return;
    }
    //testing delay
    setLoading(true);  // Start loading animation

    
    setTimeout(() => {
      if (roomId.trim()) {
        navigate("/room/" + roomId, {state: {username}});
        console.log("handeljoin");
        setLoading(false);  // Stop loading animation after navigation
      }
    }, 1000);

   
   // console.log("handeljoin2", {roomId});
  };
  //for generated room
  const handleJoin2 = (rmId) => {
    if (!username.trim()) {
      alert("Please enter a username before creating a room.");
      return;
    }
    
    //delay
    setLoading(true);  // Start loading animation

    setTimeout(() => {
      if(rmId){
        navigate("/room/" + rmId, {state: {username}});
        setLoading(false);  // Stop loading animation after navigation
        return;
      }
    }, 1000);
    
    // if (roomId.trim()) {
    //   navigate("/room/" + roomId);
    //   console.log("handeljoin");
    // }
    // console.log("handeljoin2", {roomId});
  };
    // Press Enter to send
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        handleJoin();
      }
    };

  return (
    <div className="page home-page">
      <div className="home-form">
        <h2>Join a Room</h2>
        <input 
          type="text" 
          placeholder="Enter Room ID" 
          value={roomId} 
          onChange={(e) => setRoomId(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <br></br>
      <div className="username-input">
        <input
        required='required'
        type="text"
        placeholder="Enter your username..."
        value={username}
        onChange={(e) => updateUsername(e.target.value)}
        onKeyDown={handleKeyDown}
        />
      </div>
         
        <center><button className='glass-button' onClick={handleJoin} >Join</button>
        <br></br>
        
        <br></br>
        <button className='glass-button' onClick={()=>{
          handleJoin2(generateRandomAlphaNumeric());
        //  setTimeout(()=>{
          
        //  },2);
          console.log("working");
        }}>Create a new Room</button></center>
      

      </div>
    </div>
  );
}

export default Home;

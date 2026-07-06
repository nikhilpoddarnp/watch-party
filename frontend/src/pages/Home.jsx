import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import socket from "../socket";

function Home() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!username.trim()) return alert("Enter a username");
    const newRoomId = nanoid(6); 
    navigate(`/room/${newRoomId}`, { state: { username } });
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomCode.trim()) return alert("Enter username and room code");
    navigate(`/room/${roomCode}`, { state: { username } });
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Watch Party</h1>
      <input
        placeholder="Your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <br /><br />
      <button onClick={handleCreateRoom}>Create Room</button>

      <hr />

      <input
        placeholder="Room code"
        value={roomCode}
        onChange={(e) => setRoomCode(e.target.value)}
      />
      <button onClick={handleJoinRoom}>Join Room</button>
    </div>
  );
}

export default Home;
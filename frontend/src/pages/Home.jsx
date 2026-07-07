import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import socket from "../socket";
import "./Home.css";

function Home() {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = () => {
    if (!username.trim()) return alert("Enter a name first");
    const newRoomId = nanoid(6);
    navigate(`/room/${newRoomId}`, { state: { username } });
  };

  const handleJoinRoom = () => {
    if (!username.trim() || !roomCode.trim()) return alert("Enter a name and room code");
    navigate(`/room/${roomCode.trim()}`, { state: { username } });
  };

  return (
    <div className="home-wrap">
      <div className="marquee-dots" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="dot" style={{ animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>

      <div className="home-card">
        <p className="eyebrow">Now Screening</p>
        <h1>Watch Party</h1>
        <p className="subtitle">One room. One video. Everyone in sync.</p>

        <input
          className="name-input"
          placeholder="Your name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
        />

        <button className="btn-primary" onClick={handleCreateRoom}>
          Start a Room
        </button>

        <div className="divider">
          <span>or join one</span>
        </div>

        <div className="join-row">
          <input
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
          />
          <button className="btn-secondary" onClick={handleJoinRoom}>
            Join
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;

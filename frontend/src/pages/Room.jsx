import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import VideoPlayer from "../components/VideoPlayer";
import ChangeVideoInput from "../components/ChangeVideoInput";
import HostControls from "../components/HostControls";

function Room() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const username = location.state?.username;
  const hasJoined = useRef(false); 

  const [myRole, setMyRole] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [videoState, setVideoState] = useState({ videoId: null, playState: "paused", currentTime: 0 });

  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }

    if (hasJoined.current) return;
    hasJoined.current = true;

    socket.connect();
    socket.emit("join_room", { roomId, username });

    socket.on("joined_room", ({ role, videoState, participants }) => {
      setMyRole(role);
      setVideoState(videoState);
      setParticipants(participants);
    });

    socket.on("user_joined", ({ participants }) => {
      setParticipants(participants);
    });

    socket.on("user_left", ({ participants }) => {
      setParticipants(participants);
    });

    socket.on("sync_state", (newVideoState) => {
      setVideoState(newVideoState);
    });

    socket.on("role_assigned", ({ userId, role, participants }) => {
      setParticipants(participants);
      if (userId === socket.id) setMyRole(role);
    });

    socket.on("participant_removed", ({ participants }) => {
      setParticipants(participants);
    });

    socket.on("you_were_removed", () => {
      alert("You were removed from the room by the host.");
      navigate("/");
    });

    socket.on("new_host", ({ newHostId, participants }) => {
      setParticipants(participants);
      if (newHostId === socket.id) setMyRole("host");
    });

    return () => {
      socket.off("joined_room");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("sync_state");
      socket.off("role_assigned");
      socket.off("participant_removed");
      socket.off("you_were_removed");
      socket.off("new_host");
      socket.disconnect();
      hasJoined.current = false; 
    };
  }, [roomId, username, navigate]);


  return (
    
    <div style={{ padding: "2rem" }}>


      <h2>Room: {roomId}</h2>
      <p>You are: <strong>{myRole}</strong></p>

      <h3>Participants</h3>
      <ul>
        {participants.map((p) => (
          <li key={p.userId}>
            {p.username} — {p.role} {p.userId === socket.id && "(you)"}
          </li>
        ))}
      </ul>
      {myRole === "host" && (
  <HostControls participants={participants} myUserId={socket.id} />
)}
      {(myRole === "host" || myRole === "moderator") && <ChangeVideoInput />}
      <VideoPlayer 
  videoState={videoState} 
  canControl={myRole === "host" || myRole === "moderator"} 
    />

     
    </div>
  );
}

export default Room;
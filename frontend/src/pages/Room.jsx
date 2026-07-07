import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import socket from "../socket";
import VideoPlayer from "../components/VideoPlayer";
import ChangeVideoInput from "../components/ChangeVideoInput";
import HostControls from "../components/HostControls";
import "./Room.css";

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
    socket.on("user_joined", ({ participants }) => setParticipants(participants));
    socket.on("user_left", ({ participants }) => setParticipants(participants));
    socket.on("sync_state", (newVideoState) => setVideoState(newVideoState));
    socket.on("role_assigned", ({ userId, role, participants }) => {
      setParticipants(participants);
      if (userId === socket.id) setMyRole(role);
    });
    socket.on("participant_removed", ({ participants }) => setParticipants(participants));
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

  const canControl = myRole === "host" || myRole === "moderator";

  return (
    <div className="room-wrap">
      <div className="room-header">
        <div className="room-code-badge">
          <span className="label">Room</span>
          {roomId}
        </div>
        {myRole && <span className={`role-pill ${myRole}`}>{myRole}</span>}
      </div>

      <div className="room-layout">
        <div className="player-panel">
          {canControl && <ChangeVideoInput />}
          <VideoPlayer videoState={videoState} canControl={canControl} />
          {!canControl && (
            <div className="watching-only">
              <span className="indicator" />
              Watching — playback is controlled by the host
            </div>
          )}
        </div>

        <div className="sidebar">
          <div className="panel">
            <h3>Participants ({participants.length})</h3>
            {participants.map((p) => (
              <div className="participant-row" key={p.userId}>
                <span className="participant-name">
                  {p.username}
                  {p.userId === socket.id && <span className="you-tag">you</span>}
                </span>
                <span className={`role-pill ${p.role}`}>{p.role}</span>
              </div>
            ))}
          </div>

          {myRole === "host" && (
            <HostControls participants={participants} myUserId={socket.id} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Room;

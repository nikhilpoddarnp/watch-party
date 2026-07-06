import socket from "../socket";

function HostControls({ participants, myUserId }) {
  const handleAssignRole = (userId, role) => {
    socket.emit("assign_role", { userId, role });
  };

  const handleRemove = (userId) => {
    if (!confirm("Remove this participant from the room?")) return;
    socket.emit("remove_participant", { userId });
  };

  return (
    <div style={{ margin: "1rem 0", padding: "1rem", border: "1px solid #ccc" }}>
      <h3>Host Controls</h3>
      {participants
        .filter((p) => p.userId !== myUserId) 
        .map((p) => (
          <div key={p.userId} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ minWidth: "120px" }}>{p.username} ({p.role})</span>

            <select
              value={p.role}
              onChange={(e) => handleAssignRole(p.userId, e.target.value)}
            >
              <option value="participant">Participant</option>
              <option value="moderator">Moderator</option>
            </select>

            <button onClick={() => handleRemove(p.userId)}>Remove</button>
          </div>
        ))}
    </div>
  );
}

export default HostControls;
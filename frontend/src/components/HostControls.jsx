import socket from "../socket";

function HostControls({ participants, myUserId }) {
  const handleAssignRole = (userId, role) => {
    socket.emit("assign_role", { userId, role });
  };

  const handleRemove = (userId) => {
    if (!confirm("Remove this participant from the room?")) return;
    socket.emit("remove_participant", { userId });
  };

  const others = participants.filter((p) => p.userId !== myUserId);

  return (
    <div className="panel">
      <h3>Host Controls</h3>
      {others.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No one else has joined yet.
        </p>
      )}
      {others.map((p) => (
        <div className="host-control-row" key={p.userId}>
          <span style={{ minWidth: "70px", fontSize: "0.85rem" }}>{p.username}</span>
          <select
            value={p.role}
            onChange={(e) => handleAssignRole(p.userId, e.target.value)}
          >
            <option value="participant">Participant</option>
            <option value="moderator">Moderator</option>
          </select>
          <button className="remove-btn" onClick={() => handleRemove(p.userId)}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export default HostControls;

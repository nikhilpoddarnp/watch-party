const rooms = {};

export function createRoom(roomId, hostSocketId, hostUsername) {
  rooms[roomId] = {
    hostId: hostSocketId,
    videoState: {
      videoId: null,
      playState: "play",
      currentTime: 0,
    },

    participants: {
      [hostSocketId]: {
        username: hostUsername,
        role: "host",
      },
    },
  };
  return rooms[roomId];
}

export function getRoom(roomId) {
  return rooms[roomId];
}

export function addParticipant(roomId, socketId, username) {
  const room = rooms[roomId];
  if (!room) return null;
  room.participants[socketId] = {
    username,
    role: "participant",
  };
  return room;
}

export function getParticipantList(roomId) {
  const room = rooms[roomId];
  if (!room) return [];
  return Object.entries(room.participants).map(([socketId, data]) => ({
    userId: socketId,
    username: data.username,
    role: data.role,
  }));
}

export function hasPlaybackPermission(roomId, socketId) {
  const room = rooms[roomId];
  if (!room) return false;
  const participant = room.participants[socketId];
  if (!participant) return false;
  return participant.role === "host" || participant.role === "moderator";
}

export function updateVideoState(roomId, updates) {
  const room = rooms[roomId];
  if (!room) return null;
  room.videoState = {
    ...room.videoState,
    ...updates,
    lastUpdatedAt: Date.now(),
  };
  return room.videoState;
}

export function getInterpolatedState(roomId) {
  const room = rooms[roomId];
  if (!room) return null;

  const { videoId, playState, currentTime, lastUpdatedAt } = room.videoState;

  if (playState === "playing" && lastUpdatedAt) {
    const elapsedSeconds = (Date.now() - lastUpdatedAt) / 1000;
    return { videoId, playState, currentTime: currentTime + elapsedSeconds };
  }

  return { videoId, playState, currentTime };
}

export function isHost(roomId, socketId) {
  const room = rooms[roomId];
  if (!room) return false;
  return room.hostId === socketId;
}

export function assignRole(roomId, targetUserId, newRole) {
  const room = rooms[roomId];
  if (!room) return null;
  if (!room.participants[targetUserId]) return null;

  room.participants[targetUserId].role = newRole;
  return room;
}

export function removeParticipant(roomId, targetUserId) {
  const room = rooms[roomId];
  if (!room) return null;
  delete room.participants[targetUserId];
  return room;
}

export function handleDisconnect(roomId, socketId) {
  const room = rooms[roomId];
  if (!room) return null;

  const wasHost = room.hostId === socketId;
  delete room.participants[socketId];

  const remainingIds = Object.keys(room.participants);

  if (remainingIds.length === 0) {
    delete rooms[roomId];
    return { deleted: true };
  }

  let newHostId = null;
  if (wasHost) {
    newHostId = remainingIds[0];
    room.hostId = newHostId;
    room.participants[newHostId].role = "host";
  }

  return {
    deleted: false,
    newHostId,
    participants: Object.entries(room.participants).map(([id, data]) => ({
      userId: id,
      username: data.username,
      role: data.role,
    })),
  };
}

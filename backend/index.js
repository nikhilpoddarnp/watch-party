import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createRoom, getRoom, addParticipant, getParticipantList, hasPlaybackPermission, updateVideoState, isHost, assignRole, removeParticipant, handleDisconnect } from "./rooms.js";
dotenv.config({ path: './env'});


const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    // origin: "http://localhost:5173", // frontend dev URL
    // methods: ["GET", "POST"],
    origin: "*" ,  // allow all origins for testing purposes
     
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("join_room", ({ roomId, username }) => {
    
    // console.log("Room exists?", getRoom(roomId)); // Check if the room already exists


  let room = getRoom(roomId);

  if (!room) {
    // Room doesn't exist yet — this user becomes Host
    room = createRoom(roomId, socket.id, username);
  } else {
    // Room exists — join as participant
    addParticipant(roomId, socket.id, username);
  }

  socket.join(roomId); // socket.io native room joining
  socket.data.roomId = roomId; // remember which room this socket belongs to

  const participants = getParticipantList(roomId);
  const myData = room.participants[socket.id];

  // Tell the joining user their own role + current state
  socket.emit("joined_room", {
    role: myData.role,
    videoState: room.videoState,
    participants,
  });

  // Tell everyone else someone new joined
  socket.to(roomId).emit("user_joined", {
    username,
    userId: socket.id,
    role: myData.role,
    participants,
  });
});

socket.on("play", ({ currentTime }) => {
  const roomId = socket.data.roomId;
  if (!hasPlaybackPermission(roomId, socket.id)) return; // silently reject

  const videoState = updateVideoState(roomId, {
    playState: "playing",
    currentTime,
  });

  io.to(roomId).emit("sync_state", videoState); // broadcast to EVERYONE including sender
});

socket.on("pause", ({ currentTime }) => {
  const roomId = socket.data.roomId;
  if (!hasPlaybackPermission(roomId, socket.id)) return;

  const videoState = updateVideoState(roomId, {
    playState: "paused",
    currentTime,
  });

  io.to(roomId).emit("sync_state", videoState);
});

socket.on("seek", ({ time }) => {
  const roomId = socket.data.roomId;
  if (!hasPlaybackPermission(roomId, socket.id)) return;

  const videoState = updateVideoState(roomId, { currentTime: time });

  io.to(roomId).emit("sync_state", videoState);
});

socket.on("change_video", ({ videoId }) => {
  const roomId = socket.data.roomId;
  if (!hasPlaybackPermission(roomId, socket.id)) return;

  const videoState = updateVideoState(roomId, {
    videoId,
    playState: "paused",
    currentTime: 0,
  });

  io.to(roomId).emit("sync_state", videoState);
});

socket.on("assign_role", ({ userId, role }) => {
  const roomId = socket.data.roomId;
  if (!isHost(roomId, socket.id)) return; // Host-only

  const validRoles = ["host", "moderator", "participant"];
  if (!validRoles.includes(role)) return;

  const room = assignRole(roomId, userId, role);
  if (!room) return;

  const participants = getParticipantList(roomId);
  const target = room.participants[userId];

  io.to(roomId).emit("role_assigned", {
    userId,
    username: target.username,
    role,
    participants,
  });
});

socket.on("remove_participant", ({ userId }) => {
  const roomId = socket.data.roomId;
  if (!isHost(roomId, socket.id)) return; // Host-only

  removeParticipant(roomId, userId);
  const participants = getParticipantList(roomId);

  // Tell the removed user specifically, so their frontend can redirect them
  io.to(userId).emit("you_were_removed");

  // Force-disconnect their socket from the room
  const targetSocket = io.sockets.sockets.get(userId);
  if (targetSocket) targetSocket.leave(roomId);

  io.to(roomId).emit("participant_removed", { userId, participants });
});

 socket.on("disconnect", () => {
  const roomId = socket.data.roomId;
  if (!roomId) return; // never joined a room, nothing to clean up

  const result = handleDisconnect(roomId, socket.id);
  if (!result || result.deleted) return; // room deleted, nothing to broadcast to

  if (result.newHostId) {
    io.to(roomId).emit("new_host", {
      newHostId: result.newHostId,
      participants: result.participants,
    });
  }

  io.to(roomId).emit("user_left", {
    userId: socket.id,
    participants: result.participants,
  });
});
});


httpServer.listen(process.env.PORT || 8000, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

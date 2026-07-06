import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  createRoom,
  getRoom,
  addParticipant,
  getParticipantList,
  hasPlaybackPermission,
  updateVideoState,
  isHost,
  assignRole,
  getInterpolatedState,
  removeParticipant,
  handleDisconnect,
} from "./rooms.js";
dotenv.config({ path: "./env" });

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("join_room", ({ roomId, username }) => {
    let room = getRoom(roomId);

    if (!room) {
      room = createRoom(roomId, socket.id, username);
    } else if (!room.participants[socket.id]) {
      addParticipant(roomId, socket.id, username);
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    const participants = getParticipantList(roomId);
    const myData = room.participants[socket.id];

    socket.emit("joined_room", {
      role: myData.role,
      videoState: getInterpolatedState(roomId),
      participants,
    });

    socket.to(roomId).emit("user_joined", {
      username,
      userId: socket.id,
      role: myData.role,
      participants,
    });
  });

  socket.on("play", ({ currentTime }) => {
    console.log("PLAY received from", socket.id, "at time", currentTime);

    const roomId = socket.data.roomId;
    if (!hasPlaybackPermission(roomId, socket.id)) return;

    const videoState = updateVideoState(roomId, {
      playState: "playing",
      currentTime,
    });

    io.to(roomId).emit("sync_state", videoState);
  });

  socket.on("pause", ({ currentTime }) => {
    console.log("PAUSE received from", socket.id, "at time", currentTime);
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
    if (!isHost(roomId, socket.id)) return;

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
    if (!isHost(roomId, socket.id)) return;

    removeParticipant(roomId, userId);
    const participants = getParticipantList(roomId);

    io.to(userId).emit("you_were_removed");

    const targetSocket = io.sockets.sockets.get(userId);
    if (targetSocket) targetSocket.leave(roomId);

    io.to(roomId).emit("participant_removed", { userId, participants });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const result = handleDisconnect(roomId, socket.id);
    if (!result || result.deleted) return;

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

httpServer.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

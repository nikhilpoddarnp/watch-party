import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { createRoom, getRoom, addParticipant, getParticipantList } from "./rooms.js";

dotenv.config({ path: './env'});


const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // frontend dev URL
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("join_room", ({ roomId, username }) => {
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

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});


httpServer.listen(process.env.PORT || 8000, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
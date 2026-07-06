import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || "https://watch-party-j0jw.onrender.com", {
  autoConnect: false, 
});

export default socket;

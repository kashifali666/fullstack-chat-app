import { io } from "socket.io-client";

let socket;

const SOCKET_SERVER_URL =
  import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

export const connectSocket = (userId) => {
  socket = io(SOCKET_SERVER_URL, {
    query: { userId },
    withCredentials: true,
  });
  return socket;
};

export const getSocket = () => socket;

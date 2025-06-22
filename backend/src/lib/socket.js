import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173"],
  },
});

// used to store online users
const userSocketMap = {}; // { userId: socketId }

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A User connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    // Join the user's personal room for real-time events
    socket.join(userId);
    console.log(`User ${socket.id} joined personal room: ${userId}`);
  }

  // Listen for explicit join event (for multi-device support)
  socket.on("join", (userId) => {
    socket.join(userId);
    userSocketMap[userId] = socket.id;
    console.log(`User ${socket.id} joined personal room: ${userId}`);
  });

  //io.emit() is used to send messages to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Group chat functionality
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group: ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(groupId);
    console.log(`User ${socket.id} left group: ${groupId}`);
  });

  // When a group message is sent (after saving to DB in your controller)
  socket.on("sendGroupMessage", ({ groupId, message }) => {
    // Save message to DB in your controller before emitting!
    io.to(groupId).emit("newMessage", message);
    console.log(`Group message sent to group ${groupId}:`, message);
  });

  // When a group message is deleted (after deleting from DB in your controller)
  socket.on("deleteGroupMessage", ({ groupId, messageId }) => {
    // Delete message from DB in your controller before emitting!
    io.to(groupId).emit("messageDeleted", { messageId });
    console.log(`Group message deleted in group ${groupId}:`, messageId);
  });

  socket.on("disconnect", () => {
    console.log("A User disconnected", socket.id);
    // Remove user from userSocketMap
    for (const [uid, sid] of Object.entries(userSocketMap)) {
      if (sid === socket.id) {
        delete userSocketMap[uid];
        break;
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, server, app };

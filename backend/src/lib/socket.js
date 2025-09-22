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


const userSocketMap = {};

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  console.log("A User connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    
    socket.join(userId);
    console.log(`User ${socket.id} joined personal room: ${userId}`);
  }

  
  socket.on("join", (userId) => {
    socket.join(userId);
    userSocketMap[userId] = socket.id;
    console.log(`User ${socket.id} joined personal room: ${userId}`);
  });

  
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`User ${socket.id} joined group: ${groupId}`);
  });

  socket.on("leaveGroup", (groupId) => {
    socket.leave(groupId);
    console.log(`User ${socket.id} left group: ${groupId}`);
  });

  
  socket.on("sendGroupMessage", ({ groupId, message }) => {
    
    io.to(groupId).emit("newMessage", message);
    console.log(`Group message sent to group ${groupId}:`, message);
  });

  
  socket.on("deleteGroupMessage", ({ groupId, messageId }) => {
    
    io.to(groupId).emit("messageDeleted", { messageId });
    console.log(`Group message deleted in group ${groupId}:`, messageId);
  });

  socket.on("disconnect", () => {
    console.log("A User disconnected", socket.id);
    
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

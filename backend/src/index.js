import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { app, server } from "./lib/socket.js";
import userRoutes from "./routes/user.route.js";
import groupChatRoutes from "./routes/groupChat.route.js";
import path from "path";

dotenv.config();


process.on("unhandledRejection", (reason, promise) => {
  console.error("UNHANDLED REJECTION!", reason);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION!", err);
});

connectDB();

const PORT = process.env.PORT || 5000;

const __dirname = path.resolve();


app.use(express.json({ limit: "10mb" }));


app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);


app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/group", groupChatRoutes);

if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "..", "frontend", "dist");

  console.log(`DEBUG: __dirname is: ${__dirname}`);
  console.log(`DEBUG: buildPath is: ${buildPath}`);

  
  app.use(express.static(buildPath));

  
  app.get("*", (req, res) => {
    res.sendFile(path.join(buildPath, "index.html"));
  });
}

try {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Error starting server:", error);
  process.exit(1);
}

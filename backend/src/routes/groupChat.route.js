import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createGroupChat,
  addToGroup,
  removeFromGroup,
  getGroups,
  deleteGroupChat,
  exitGroup,
} from "../controllers/groupChat.controller.js";

const router = express.Router();

// groupChat.route.js (mounted under /api/group AND /api/chat in index.js)
router.post("/creategroup", protectRoute, createGroupChat);
router.put("/groupadd", protectRoute, addToGroup);
router.put("/groupremove", protectRoute, removeFromGroup);
router.get("/", protectRoute, getGroups);
router.delete("/:groupId", protectRoute, deleteGroupChat);
router.put("/exitgroup", protectRoute, exitGroup);

export default router;

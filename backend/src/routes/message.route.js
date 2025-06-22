import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
  getGroupMessages,
  sendGroupMessage,
  deleteMessage,
  deleteOneToOneChat,
} from "../controllers/message.controller.js";
import verifyGroupMembership from "../middleware/verifyGroupMembership.js";

const router = express.Router();

// message.route.js (mounted under /api/messages in index.js)
router.get("/users", protectRoute, getUsersForSidebar);
router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

router.get("/group/:groupId", getGroupMessages);
router.post(
  "/group/send",
  protectRoute,
  verifyGroupMembership,
  sendGroupMessage
);

router.delete("/:messageId", protectRoute, deleteMessage);
router.delete("/chat/:userId", protectRoute, deleteOneToOneChat);

export default router;

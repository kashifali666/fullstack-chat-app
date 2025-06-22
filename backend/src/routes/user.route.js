import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { allUsers } from "../controllers/user.controller.js";

const router = express.Router();

// This route will search users by name
router.get("/search", protectRoute, allUsers);

export default router;

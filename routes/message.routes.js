import express from "express";
import { getMessage, sendMessage } from "../controllers/message.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

// prefix = /api/v1/message
router.get("/user/:userId", requireAuth(), getMessage); // get message by user id
router.post("/user/:userId", requireAuth(), sendMessage); // send message to user by user id

export default router;

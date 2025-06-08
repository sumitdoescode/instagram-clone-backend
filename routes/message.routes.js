import express from "express";
import { getMessages, sendMessage } from "../controllers/message.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

// prefix = /api/v1/message
router.use(requireAuth()); // protect all routes

// prefix = /api/v1/message/user/:userId
router.get("/user/:userId", getMessages); // get message by user id

// prefix = /api/v1/message/user/:userId
router.post("/user/:userId", sendMessage); // send message to user by user id

export default router;

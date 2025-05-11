import express from "express";
import { getAllConversations, getConversationById, deleteConversation } from "../controllers/conversation.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.use(requireAuth()); // protect all routes

// prefix = /api/v1/conversation
router.get("/", getAllConversations); // get all conversations for the logged-in user
router.get("/:conversationId", getConversationById); // get a single conversation by ID
router.delete("/:conversationId", deleteConversation); // delete a conversation

export default router;

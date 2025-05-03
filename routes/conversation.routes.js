import express from "express";
import { getConversations, getConversationById, deleteConversation } from "../controllers/conversation.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.use(requireAuth()); // protect all routes

router.get("/", getConversations);
router.get("/:id", getConversationById);
router.delete("/:id", deleteConversation); // optional

export default router;

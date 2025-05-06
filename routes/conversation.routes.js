import express from "express";
import { getAllConversations, getConversationById, deleteConversation } from "../controllers/conversation.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.use(requireAuth()); // protect all routes

router.get("/", getAllConversations); // get all conversations for the logged-in user
router.get("/:id", getConversationById);
router.delete("/:id", deleteConversation); // optional

export default router;

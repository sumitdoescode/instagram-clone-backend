import express from "express";
import { getPostComments, createComment, deleteComment } from "../controllers/comment.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

router.get("/post/:postId", requireAuth(), getPostComments); // Get all comments for a post
router.post("/post/:postId", requireAuth(), createComment); // Add a new comment
router.delete("/:commentId", requireAuth(), deleteComment); // Delete a comment

export default router;

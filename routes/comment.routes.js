import express from "express";
import { getPostComments, createComment, deleteComment } from "../controllers/comment.controller.js";
import { requireAuth } from "@clerk/express";

const router = express.Router();

// prefix = /api/v1/comments
router.use(requireAuth()); // Protect all routes

router.get("/post/:postId", getPostComments); // Get all comments for a post
router.post("/post/:postId", createComment); // Add a new comment
router.delete("/:commentId", deleteComment); // Delete a comment

export default router;

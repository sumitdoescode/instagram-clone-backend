import express from "express";
import { getAllPosts, getPost, createPost, updatePost, deletePost, getUserPosts, toggleLikePost, toggleBookmarkPost } from "../controllers/post.controller.js";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

router.get("/", requireAuth(), getAllPosts); // get all posts
router.post("/", requireAuth(), upload.single("image"), createPost); // create new post
router.get("/:postId", requireAuth(), getPost); // get single post
router.patch("/:postId", requireAuth(), upload.single("image"), updatePost); // update post
router.delete("/:postId", requireAuth(), deletePost); // delete post

router.get("/user/:userId", requireAuth(), getUserPosts); // get user posts

router.get("/toggleLike/:postId", requireAuth(), toggleLikePost); // like or unlike post
router.get("/toggleBookmark/:postId", requireAuth(), toggleBookmarkPost); // bookmark or unbookmark post

export default router;

import express from "express";
import { editOwnProfile, recommendedUsers, followOrUnfollowUser, getUserProfileById } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// here id is mongodb id of user
// prefix is /api/v1/user
router.patch("/", requireAuth(), upload.single("profileImage"), editOwnProfile); // edit user profile(self)
router.get("/recommended", requireAuth(), recommendedUsers); // get users to follow
router.get("/followOrUnfollow/:id", requireAuth(), followOrUnfollowUser); // follow or unfollow user

// This only matches 24-char hex Mongo ObjectIds
// router.get("/:id([0-9a-fA-F]{24})", requireAuth(), getUserProfileById);
router.get("/:id([0-9a-fA-F]{24})", requireAuth(), getUserProfileById); // ✅ Correct syntax

export default router;

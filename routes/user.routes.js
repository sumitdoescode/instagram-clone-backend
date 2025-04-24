import express from "express";
import { getUserProfileById, editOwnProfile, recommendedUsers, followOrUnfollowUser } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// here id is mongodb id of user
// prefix is /api/v1/user
router.patch("/", requireAuth(), upload.single("profileImage"), editOwnProfile); // edit user profile(self)
router.get("/recommended", requireAuth(), recommendedUsers); // get users to follow
router.get("/:id", getUserProfileById); // get user profile by id
router.get("/followOrUnfollow/:id", requireAuth(), followOrUnfollowUser); // follow or unfollow user

export default router;

import express from "express";
import { getUserProfile, editUserProfile, usersToFollow, followOrUnfollowUser } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// here id is mongodb id of user
router.get("/:id", requireAuth, getUserProfile); // get user profile by id
router.put("/", requireAuth, upload.single("profileImage"), editUserProfile); // edit user profile(self)
router.get("/usersToFollow", requireAuth, usersToFollow); // get users to follow
router.post("/followOrUnfollow/:id", requireAuth, followOrUnfollowUser); // follow or unfollow user

export default router;

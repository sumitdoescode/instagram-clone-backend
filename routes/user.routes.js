import express from "express";
import { getOwnProfile, getOwnBookmarks, editOwnProfile, deleteClerkProfile, recommendedUsers, followOrUnfollowUser, getUserProfileById, getUserFollowers, getUserFollowing } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// here id is mongodb id of user
// prefix is /api/v1/user
router.get("/", requireAuth(), getOwnProfile); // get user profile(self)
router.get("/bookmarks", requireAuth(), getOwnBookmarks); // get own bookmarks
router.patch("/", requireAuth(), upload.single("profileImage"), editOwnProfile); // edit user profile(self)
router.delete("/", requireAuth(), deleteClerkProfile); // delete user clerk profile(self)
router.get("/recommended", requireAuth(), recommendedUsers); // get users to follow
router.get("/followOrUnfollow/:id", requireAuth(), followOrUnfollowUser); // follow or unfollow user

// Place these BEFORE `/:id`
router.get("/:id/followers", requireAuth(), getUserFollowers);
router.get("/:id/following", requireAuth(), getUserFollowing);

router.get("/:id", requireAuth(), getUserProfileById);

export default router;

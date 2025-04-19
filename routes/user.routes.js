import express from "express";
import { getUserProfileById, editOwnProfile, usersToFollow, followOrUnfollowUser } from "../controllers/user.controller.js";
import { requireAuth } from "@clerk/express";
import upload from "../middlewares/multer.middleware.js";

const router = express.Router();

// here id is mongodb id of user
// prefix is /api/v1/user
const customRequireAuth = (req, res, next) => {
    console.log("✅ requireAuth hit!");
    return requireAuth()(req, res, next);
};
router.get("/:id", customRequireAuth, getUserProfileById); // get user profile by id
router.patch("/", requireAuth(), upload.single("profileImage"), editOwnProfile); // edit user profile(self)
router.get("/usersToFollow", requireAuth(), usersToFollow); // get users to follow
router.post("/followOrUnfollow/:id", requireAuth(), followOrUnfollowUser); // follow or unfollow user

export default router;

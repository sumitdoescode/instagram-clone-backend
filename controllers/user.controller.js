import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose, { isValidObjectId } from "mongoose";

export const getUserProfileById = asyncHandler(async (req, res) => {
    console.log("coming inside getUserProfileById");
    const clerkId = req.auth.userId;
    console.log(clerkId);
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid user id");
    }
    const user = await User.findById(id).populate("posts").populate("followers").populate("following").populate("bookmarks");
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    res.status(200).json({ success: true, message: "Profile Fetched successfully", user });
});

export const editOwnProfile = asyncHandler(async (req, res) => {
    console.log("coming inside editOwnProfile");
    const clerkId = req.auth.userId;
    const { bio, gender } = req.body;
    const profileImage = req.file;

    if (!bio && !gender && !profileImage) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    if (bio) {
        user.bio = bio;
    }
    if (gender) {
        user.gender = gender;
    }
    if (profileImage) {
        const res = await uploadOnCloudinary(profileImage.path);
        if (!res) {
            throw new ApiError(500, "Something went wrong while uploading image");
        }
        user.profileImage = res.secure_url;
    }
    await user.save();
    res.status(200).json({ success: true, message: "Profile updated successfully", user });
});

export const usersToFollow = asyncHandler(async (req, res) => {
    console.log("coming inside usersToFollow");
    const clerkId = req.auth.userId;

    // 1. Find the current user with their following list
    const user = await User.findOne({ clerkId }).select("following _id");

    if (!user) {
        // If the user doesn't exist, return a 404 error
        throw new ApiError(404, "User not found");
    }

    // 2. Get list of user IDs to exclude: people they're already following + themselves
    const excludedIds = [...user.following, user._id];

    // 3. Get 5 random users not in that exclusion list
    const suggestedUsers = await User.aggregate([
        {
            $match: {
                _id: { $nin: excludedIds },
            },
        },
        { $sample: { size: 5 } },
        {
            $project: {
                _id: 1,
                username: 1,
                profileImage: 1,
                bio: 1,
            },
        },
    ]);

    res.status(200).json({
        success: true,
        message: "Suggested users fetched successfully",
        suggestedUsers,
    });
});

export const followOrUnfollowUser = asyncHandler(async (req, res) => {
    console.log("coming inside followOrUnfollowUser");
    const clerkId = req.auth.userId;

    if (!clerkId) {
        throw new ApiError(400, "Clerk ID is required");
    }

    const currentUser = await User.findOne({ clerkId });

    const { id: targetUserId } = req.params;

    // ⛔ Check if the ID is a valid ObjectId
    if (!isValidObjectId(targetUserId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
        throw new ApiError(404, "User not found");
    }

    // ⛔ Prevent following yourself
    if (currentUser._id.equals(targetUser._id)) {
        throw new ApiError(400, "You can't follow yourself");
    }

    // 🔁 Check if you're already following the user
    const isAlreadyFollowing = currentUser.following.includes(targetUser._id);

    if (isAlreadyFollowing) {
        // 🔄 Unfollow
        await User.findByIdAndUpdate(currentUser._id, {
            $pull: { following: targetUser._id },
        });

        await User.findByIdAndUpdate(targetUser._id, {
            $pull: { followers: currentUser._id },
        });

        res.status(200).json({ success: true, message: "User unfollowed successfully" });
    } else {
        // ➕ Follow
        await User.findByIdAndUpdate(currentUser._id, {
            $addToSet: { following: targetUser._id },
        });

        await User.findByIdAndUpdate(targetUser._id, {
            $addToSet: { followers: currentUser._id },
        });

        res.status(200).json({ success: true, message: "User followed successfully" });
    }
});

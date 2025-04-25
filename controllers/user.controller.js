import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose, { isValidObjectId } from "mongoose";

export const editOwnProfile = asyncHandler(async (req, res) => {
    console.log("coming inside editOwnProfile");
    const clerkId = req.auth.userId;
    const { bio, gender } = req.body || {};
    const profileImage = req.file;

    if (!bio && !gender && !profileImage) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    if (bio) {
        user.bio = bio.trim();
    }
    if (gender) {
        user.gender = gender;
    }
    if (profileImage) {
        const uploadResponse = await uploadOnCloudinary(profileImage.path);
        if (!uploadResponse) {
            throw new ApiError(500, "Something went wrong while uploading image");
        }
        user.profileImage = uploadResponse.secure_url;
    }
    await user.save();
    res.status(200).json({ success: true, message: "Profile updated successfully", user });
});

export const recommendedUsers = asyncHandler(async (req, res) => {
    console.log("coming inside recommendedUsers");
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
    const recommendedUsers = await User.aggregate([
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
                gender: 1,
            },
        },
    ]);

    res.status(200).json({
        success: true,
        message: "Recommended Users fetched successfully",
        users: recommendedUsers,
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

        res.status(200).json({ success: true, message: "User unfollowed successfully", isFollow: false });
    } else {
        // ➕ Follow
        await User.findByIdAndUpdate(currentUser._id, {
            $addToSet: { following: targetUser._id },
        });

        await User.findByIdAndUpdate(targetUser._id, {
            $addToSet: { followers: currentUser._id },
        });

        res.status(200).json({ success: true, message: "User followed successfully", isFollow: true });
    }
});

export const getUserProfileById = asyncHandler(async (req, res) => {
    console.log("coming inside getUserProfileById");
    const clerkId = req.auth.userId;
    const { id } = req.params;
    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid user id");
    }
    const loggedInUser = await User.findOne({ clerkId }).select("_id");
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    const user = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(id) } },
        {
            $addFields: {
                followersCount: { $size: "$followers" },
                followingCount: { $size: "$following" },
                postsCount: { $size: "$posts" },
                isAuthor: { $eq: ["$_id", loggedInUser._id] },
                isFollowing: { $in: [loggedInUser._id, "$followers"] }, // no lookup needed, array of IDs hai
            },
        },
        {
            $project: {
                username: 1,
                email: 1,
                profileImage: 1,
                bio: 1,
                gender: 1,
                followersCount: 1,
                followingCount: 1,
                postsCount: 1,
                isAuthor: 1,
                isFollowing: 1,
            },
        },
    ]);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json({ success: true, message: "Profile Fetched successfully", user });
});

export const getUserFollowers = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid user id");
    }

    const loggedInUser = await User.findOne({ clerkId }).select("_id");
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    const followers = await User.aggregate([
        {
            // Match the target user whose followers we want
            $match: { _id: new mongoose.Types.ObjectId(id) },
        },
        {
            // Lookup their followers (returns array of User docs)
            $lookup: {
                from: "users",
                localField: "followers",
                foreignField: "_id",
                as: "followerUsers",
            },
        },
        {
            // Unwind the followers array to process each follower separately
            $unwind: "$followerUsers",
        },
        {
            // Project the required fields + isFollowing + followersCount
            $project: {
                _id: "$followerUsers._id",
                username: "$followerUsers.username",
                profileImage: "$followerUsers.profileImage",
                followersCount: { $size: "$followerUsers.followers" },
                isFollowing: {
                    $in: [loggedInUser._id, "$followerUsers.followers"],
                },
            },
        },
    ]);

    res.status(200).json({
        success: true,
        message: "Followers fetched successfully (via aggregation)",
        followers,
    });
});

export const getUserFollowing = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid user id");
    }

    const loggedInUser = await User.findOne({ clerkId }).select("_id");
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    const following = await User.aggregate([
        {
            // Match the target user
            $match: { _id: new mongoose.Types.ObjectId(id) },
        },
        {
            // Lookup the users they are following
            $lookup: {
                from: "users",
                localField: "following",
                foreignField: "_id",
                as: "followingUsers",
            },
        },
        {
            // Unwind each following user
            $unwind: "$followingUsers",
        },
        {
            // Project required fields
            $project: {
                _id: "$followingUsers._id",
                username: "$followingUsers.username",
                profileImage: "$followingUsers.profileImage",
                followersCount: { $size: "$followingUsers.followers" },
                isFollowing: {
                    $in: [loggedInUser._id, "$followingUsers.followers"],
                },
            },
        },
    ]);

    res.status(200).json({
        success: true,
        message: "Following list fetched successfully",
        following,
    });
});

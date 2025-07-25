import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose, { isValidObjectId } from "mongoose";
import { clerkClient } from "@clerk/express";

export const getOwnProfile = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const loggedInUser = await User.findOne({ clerkId }).select("_id");
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    // const user = await User.findById(loggedInUser._id).select("");
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(loggedInUser._id),
            },
        },
        {
            $addFields: {
                postsCount: { $size: "$posts" },
                followersCount: { $size: "$followers" },
                followingCount: { $size: "$following" },
                bookmarksCount: { $size: "$bookmarks" },
            },
        },
        {
            $project: {
                _id: 1,
                clerkId: 1,
                username: 1,
                email: 1,
                profileImage: 1,
                bio: 1,
                gender: 1,
                postsCount: 1,
                createdAt: 1,
                followersCount: 1,
                followingCount: 1,
                bookmarksCount: 1,
            },
        },
    ]);
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    res.status(200).json({ success: true, message: "Own Profile Fetched successfully", user: user[0] });
});

export const getOwnBookmarks = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const loggedInUser = await User.findOne({ clerkId }).select("_id");
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    const bookmarks = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(loggedInUser._id),
            },
        },
        {
            $lookup: {
                from: "posts",
                localField: "bookmarks",
                foreignField: "_id",
                as: "bookmarks",
            },
        },
        { $unwind: "$bookmarks" },
        {
            $lookup: {
                from: "users",
                localField: "bookmarks.author",
                foreignField: "_id",
                as: "bookmarks.author",
            },
        },
        { $unwind: "$bookmarks.author" }, // ✅ fix here
        {
            $addFields: {
                likesCount: { $size: "$bookmarks.likes" },
                commentsCount: { $size: "$bookmarks.comments" },
                isLiked: { $in: [loggedInUser._id, "$bookmarks.likes"] },
                isAuthor: { $eq: ["$bookmarks.author._id", loggedInUser._id] },
                isBookmarked: true, // hardcoded true because it's coming from bookmarks
            },
        },
        {
            $sort: { "bookmarks.createdAt": -1 }, // ✅ sort bookmarks, not root doc
        },
        {
            $project: {
                _id: "$bookmarks._id",
                caption: "$bookmarks.caption",
                image: "$bookmarks.image",
                createdAt: "$bookmarks.createdAt",
                likesCount: 1,
                commentsCount: 1,
                isLiked: 1,
                isAuthor: 1,
                isBookmarked: 1,
                author: {
                    _id: "$bookmarks.author._id",
                    username: "$bookmarks.author.username",
                    profileImage: "$bookmarks.author.profileImage",
                    gender: "$bookmarks.author.gender",
                },
            },
        },
    ]);

    res.status(200).json({
        success: true,
        message: "Bookmarks fetched successfully",
        bookmarks,
    });
});

export const editOwnProfile = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { username, bio, gender } = req.body || {};
    const profileImage = req.file;

    if (!username && !bio && !gender && !profileImage) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Prepare fields to update Clerk
    const clerkUpdateData = {};

    // Handle username
    if (username) {
        if (username.length < 3 || username.length > 16) {
            throw new ApiError(400, "Username should be between 3 and 16 characters");
        }
        const existingUser = await User.findOne({ username });
        if (existingUser && existingUser.clerkId !== clerkId) {
            throw new ApiError(400, "Username is already taken");
        }
        clerkUpdateData.username = username.trim();
        user.username = username.trim();
    }

    // Handle publicMetadata

    if (bio) {
        user.bio = bio.trim();
    }
    if (gender) {
        user.gender = gender;
    }

    // Handle profile image upload
    if (profileImage) {
        const uploadResponse = await uploadOnCloudinary(profileImage.path);
        if (!uploadResponse) {
            throw new ApiError(500, "Something went wrong while uploading profile image");
        }

        // Delete old image from Cloudinary if it exists
        if (user.profileImage && user.profileImage.public_id) {
            await deleteFromCloudinary(user.profileImage.public_id);
        }

        // Update user profile image in DB
        user.profileImage.url = uploadResponse.secure_url;
        user.profileImage.public_id = uploadResponse.public_id;
    }

    // Update in Clerk
    await clerkClient.users.updateUser(clerkId, clerkUpdateData);

    // Update in DB
    await user.save();
    res.status(200).json({ success: true, message: "Profile updated successfully", user });
});

export const deleteClerkProfile = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const loggedInUser = await User.findOne({ clerkId }).select("_id");
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    // deleting user from clerk
    const deletedUser = await clerkClient.users.deleteUser(clerkId);
    res.status(200).json({ success: true, message: "Clerk profile deleted successfully" });
});

export const recommendedUsers = asyncHandler(async (req, res) => {
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
                followersCount: {
                    $size: "$followers",
                },
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
    if (!user.length) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json({ success: true, message: "Profile Fetched successfully", user: user[0] });
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
                isOwnProfile: { $eq: ["$followerUsers._id", loggedInUser._id] },
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
                isOwnProfile: { $eq: ["$followingUsers._id", loggedInUser._id] },
            },
        },
    ]);

    res.status(200).json({
        success: true,
        message: "Following list fetched successfully",
        following,
    });
});

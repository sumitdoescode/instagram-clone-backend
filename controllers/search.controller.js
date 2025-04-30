import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
// import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose, { isValidObjectId } from "mongoose";

const searchUsers = asyncHandler(async (req, res) => {
    const { searchQuery } = req.query;
    const loggedInUser = await User.findOne({ clerkId: req.auth.userId });
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    const users = await User.aggregate([
        {
            $match: {
                $or: [{ username: { $regex: searchQuery, $options: "i" } }],
            },
        },
        {
            $project: {
                _id: 1,
                username: 1,
                email: 1,
                profileImage: 1,
                bio: 1,
                gender: 1,
            },
        },
        {
            $sort: { followersCount: -1 },
        },
    ]);

    res.status(200).json({
        success: true,
        message: "Searched users fetched successfully",
        users,
    });
});

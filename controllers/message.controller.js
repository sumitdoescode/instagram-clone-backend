import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
// import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose, { isValidObjectId } from "mongoose";

export const getMessages = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User id");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Get the logged-in user's DB _id
    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    const messages = await Message.find({
        $or: [
            { senderId: currentUser._id, receiverId: user._id }, // Messages sent by the current user to the other user
            { senderId: user._id, receiverId: currentUser._id }, // Messages sent by the other user to the current user
        ],
    }).sort({ createdAt: 1 }); // Optional: sort by timestamp

    res.status(200).json({
        success: true,
        message: "Messages fetched successfully",
        messages,
    });
});

export const sendMessage = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;

    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    // Get sender (logged-in user) from clerkId
    const sender = await User.findOne({ clerkId });
    if (!sender) {
        throw new ApiError(404, "Sender not found");
    }

    // Confirm receiver exists
    const receiver = await User.findById(userId);
    if (!receiver) {
        throw new ApiError(404, "Receiver not found");
    }

    const { message } = req.body || {};
    if (!message || !message.trim()) {
        throw new ApiError(400, "Message text is required");
    }

    const messageObj = await Message.create({
        senderId: sender._id,
        receiverId: receiver._id,
        message: message.trim(),
    });

    res.status(201).json({ success: true, message: "Message sent successfully", message: messageObj });
});

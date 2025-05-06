import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { isValidObjectId } from "mongoose";
import User from "../models/user.model.js";

// GET all conversations for the logged-in user
export const getAllConversations = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;

    const user = await User.findOne({ clerkId });
    if (!user) throw new ApiError(404, "User not found");

    const conversations = await Conversation.find({
        participants: user._id,
    })
        .populate("participants", "_id username email profileImage") // optional user info
        .sort({ updatedAt: -1 });

    res.status(200).json({
        success: true,
        message: "Conversations fetched successfully",
        conversations,
    });
});

// GET a single conversation by ID (optional)
export const getConversationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const conversation = await Conversation.findById(id).populate("participants", "_id username name profilePic");

    if (!conversation) throw new ApiError(404, "Conversation not found");

    res.status(200).json({
        success: true,
        conversation,
    });
});

// DELETE a conversation (optional archive or real delete)
export const deleteConversation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid conversation ID");
    }

    const deleted = await Conversation.findByIdAndDelete(id);
    if (!deleted) throw new ApiError(404, "Conversation not found");

    res.status(200).json({
        success: true,
        message: "Conversation deleted",
    });
});

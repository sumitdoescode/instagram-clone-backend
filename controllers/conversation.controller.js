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
    const { conversationId } = req.params;
    const clerkId = req.auth.userId;

    if (!isValidObjectId(conversationId)) {
        throw new ApiError(400, "Invalid conversation ID");
    }

    // Check if the user is logged in
    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    // Check if the conversation exists
    const conversation = await Conversation.findById(conversationId).populate("participants", "_id username email profileImage"); // optional user info

    if (!conversation) {
        throw new ApiError(404, "Conversation not found");
    }

    // Check if the user is a participant in the conversation
    if (!conversation.participants.includes(currentUser._id)) {
        throw new ApiError(403, "Unauthorized: You can only view your own conversation");
    }

    res.status(200).json({
        success: true,
        message: "Conversation fetched successfully",
        conversation,
    });
});

// DELETE a conversation
export const deleteConversation = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const clerkId = req.auth.userId;

    if (!isValidObjectId(id)) {
        throw new ApiError(400, "Invalid conversation ID");
    }

    // Check if the user is logged in
    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    const covnersation = await Conversation.findById(conversationId);
    if (!covnersation) throw new ApiError(404, "Conversation not found");

    // Check if the user is a participant in the conversation
    if (!covnersation.participants.includes(currentUser._id)) {
        throw new ApiError(403, "Unauthorized: You can only delete your own conversation");
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    res.status(200).json({
        success: true,
        message: "Conversation deleted",
    });
});

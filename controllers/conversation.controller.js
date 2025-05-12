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
        .populate("participants", "_id username email profileImage")
        .populate("lastMessage")
        .sort({ updatedAt: -1 })
        .lean(); // plain JS objects for easy filtering

    // const formattedConversations = conversations.map((conversation) => {
    //     const otherUser = conversation.participants.find((p) => p._id.toString() !== user._id.toString());

    //     return {
    //         _id: conversation._id,
    //         participant: otherUser, // singular user, since it's 1-to-1
    //         lastMessage: conversation.lastMessage,
    //         updatedAt: conversation.updatedAt,
    //     };
    // });

    res.status(200).json({
        success: true,
        message: "Conversations fetched successfully",
        conversations: conversations,
    });
});

// GET a single conversation by ID (optional)
export const getConversationById = asyncHandler(async (req, res) => {
    const { conversationId } = req.params;
    const clerkId = req.auth.userId;

    if (!isValidObjectId(conversationId)) {
        throw new ApiError(400, "Invalid conversation ID");
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    const conversation = await Conversation.findById(conversationId).populate("participants", "_id username email profileImage").populate("lastMessage").lean();

    if (!conversation) {
        throw new ApiError(404, "Conversation not found");
    }

    const isParticipant = conversation.participants.some((p) => p._id.toString() === currentUser._id.toString());
    if (!isParticipant) {
        throw new ApiError(403, "Unauthorized: You can only view your own conversations");
    }

    const otherUser = conversation.participants.find((p) => p._id.toString() !== currentUser._id.toString());

    res.status(200).json({
        success: true,
        message: "Conversation fetched successfully",
        conversation: {
            _id: conversation._id,
            participant: otherUser,
            lastMessage: conversation.lastMessage,
            updatedAt: conversation.updatedAt,
        },
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

import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId, Types } from "mongoose";
import User from "../models/user.model.js";

// GET all conversations for the logged-in user
export const getAllConversations = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;

    const user = await User.findOne({ clerkId });
    if (!user) throw new ApiError(404, "User not found");

    const conversations = await Conversation.aggregate([
        // Match conversations where user is a participant
        { $match: { participants: user._id } },

        // Sort by latest update
        { $sort: { updatedAt: -1 } },

        // Lookup lastMessage details
        {
            $lookup: {
                from: "messages",
                localField: "lastMessage",
                foreignField: "_id",
                as: "lastMessage",
            },
        },
        { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

        // Lookup all messages in this conversation
        {
            $lookup: {
                from: "messages",
                localField: "_id",
                foreignField: "conversationId",
                as: "allMessages",
            },
        },

        // Lookup participant details
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participants",
            },
        },

        // Add "other participant" and unread count
        {
            $addFields: {
                participant: {
                    $first: {
                        $filter: {
                            input: "$participants",
                            as: "p",
                            cond: { $ne: ["$$p._id", user._id] },
                        },
                    },
                },
                unreadMessages: {
                    $size: {
                        $filter: {
                            input: "$allMessages",
                            as: "m",
                            cond: {
                                $and: [{ $eq: ["$$m.isRead", false] }, { $eq: ["$$m.receiverId", user._id] }],
                            },
                        },
                    },
                },
            },
        },

        // Final shape
        {
            $project: {
                _id: 1,
                updatedAt: 1,
                // lastMessage: "$lastMessage.content",
                lastMessage: 1,
                unreadMessages: 1,
                participant: {
                    _id: 1,
                    username: 1,
                    email: 1,
                    profileImage: 1,
                },
            },
        },
    ]);

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

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    const userId = currentUser._id;

    const conversation = await Conversation.aggregate([
        // Match the conversation by ID and ensure the user is a participant
        {
            $match: {
                _id: new mongoose.Types.ObjectId(conversationId),
                participants: userId,
            },
        },

        // Lookup the last message
        {
            $lookup: {
                from: "messages",
                localField: "lastMessage",
                foreignField: "_id",
                as: "lastMessage",
            },
        },
        {
            $unwind: {
                path: "$lastMessage",
                preserveNullAndEmptyArrays: true,
            },
        },

        // Lookup participant user details
        {
            $lookup: {
                from: "users",
                localField: "participants",
                foreignField: "_id",
                as: "participants",
            },
        },

        // Add a field for the "other" participant (exclude current user)
        {
            $addFields: {
                participant: {
                    $first: {
                        $filter: {
                            input: "$participants",
                            as: "p",
                            cond: { $ne: ["$$p._id", userId] },
                        },
                    },
                },
            },
        },

        // Final shape of the response
        {
            $project: {
                _id: 1,
                updatedAt: 1,
                lastMessage: 1,
                participant: {
                    _id: 1,
                    username: 1,
                    gender: 1,
                    email: 1,
                    profileImage: 1,
                },
            },
        },
    ]);

    if (!conversation || conversation.length === 0) {
        throw new ApiError(404, "Conversation not found or unauthorized");
    }

    res.status(200).json({
        success: true,
        message: "Conversation fetched successfully",
        conversation: conversation[0],
    });
});

// DELETE a conversation
export const deleteConversation = asyncHandler(async (req, res) => {
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

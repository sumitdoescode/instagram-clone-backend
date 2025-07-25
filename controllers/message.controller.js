import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
// import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose, { isValidObjectId } from "mongoose";
import Conversation from "../models/conversation.model.js";

export const sendMessage = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }

    const sender = await User.findOne({ clerkId });
    if (!sender) {
        throw new ApiError(404, "Sender not found");
    }

    const receiver = await User.findById(userId);
    if (!receiver) {
        throw new ApiError(404, "Receiver not found");
    }

    const { content } = req.body || {};
    if (!content || !content.trim()) {
        throw new ApiError(400, "Message text is required");
    }

    // Step 1: Find or create the conversation
    let conversation = await Conversation.findOne({
        participants: { $all: [sender._id, receiver._id] },
    });

    if (!conversation) {
        conversation = await Conversation.create({
            participants: [sender._id, receiver._id],
        });
    }

    // Step 2: Create the message
    const messageObj = await Message.create({
        conversationId: conversation._id,
        senderId: sender._id,
        receiverId: receiver._id,
        content: content.trim(),
        isRead: false,
    });

    // Step 3: Update the last messae in the conversation
    conversation.lastMessage = messageObj._id;
    await conversation.save();

    res.status(200).json({
        success: true,
        message: "Message sent successfully",
    });
});

export const getMessages = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User id");
    }

    const user = await User.findById(userId).select("_id username email profileImage gender");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const currentUser = await User.findOne({ clerkId });
    if (!currentUser) {
        throw new ApiError(404, "User not found");
    }

    // Step 1: Find the conversation
    const conversation = await Conversation.findOne({
        participants: { $all: [currentUser._id, user._id] },
    });

    // if there is no coversation then there are no messages
    if (!conversation) {
        return res.status(200).json({
            success: true,
            message: "No messages yet",
            messages: [],
        });
    }

    // find the message of that conversation
    const messages = await Message.find({
        conversationId: conversation._id,
    }).sort({ createdAt: 1 });

    // udpate those message where receiver is current user as read : true
    await Message.updateMany(
        { conversationId: conversation._id, receiverId: currentUser._id },
        {
            $set: {
                isRead: true,
            },
        }
    );

    res.status(200).json({
        success: true,
        message: "Messages fetched successfully",
        messages,
        user,
    });
});

import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import mongoose, { isValidObjectId } from "mongoose";
import Comment from "../models/comment.model.js";

export const getPostComments = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post ID");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    const comments = await Comment.find({ post: postId }).sort({ createdAt: -1 }).populate({
        path: "author",
        select: "username profileImage",
    });

    res.status(200).json({
        success: true,
        message: "Comments fetched successfully",
        comments,
    });
});

export const createComment = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
        throw new ApiError(404, "Invalid post ID");
    }

    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // Get the logged-in user from clerkId
    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const { text } = req.body;
    if (!text || !text.trim()) {
        throw new ApiError(400, "Comment text is required");
    }

    // Create new comment
    const comment = await Comment.create({
        text: text.trim(),
        author: user._id,
        post: post._id,
    });

    // Push comment id to post's comments array
    post.comments.push(comment._id);
    await post.save();

    res.status(201).json({
        success: true,
        message: "Comment added successfully",
        comment,
    });
});

export const deleteComment = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { commentId } = req.params;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    // Get logged-in user
    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Check if the user is the author of the comment
    if (comment.author.toString() !== user._id.toString()) {
        throw new ApiError(403, "Unauthorized: You can only delete your own comment");
    }

    // Remove comment from post's comments array
    await Post.findByIdAndUpdate(comment.post, {
        $pull: { comments: comment._id },
    });

    // Delete the comment
    await comment.deleteOne();

    res.status(200).json({
        success: true,
        message: "Comment deleted successfully",
    });
});

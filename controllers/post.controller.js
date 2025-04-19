import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import { getReceiverSocketId, io } from "../socket/socket.js";
import mongoose, { isValidObjectId } from "mongoose";

export const getAllPosts = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId; // Get logged-in user's clerkId

    // Step 1: Get MongoDB user ID from clerkId
    const loggedInUser = await User.findOne({ clerkId });
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    const posts = await Post.aggregate([
        // Join with the User collection to get author data
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "author",
            },
        },
        // Flatten the author array to an object
        {
            $unwind: "$author",
        },
        // Add a computed field to check if loggedInUser has liked the post
        {
            $addFields: {
                isLiked: {
                    $in: [loggedInUser._id, "$likes"],
                },
            },
        },
        // Project fields + computed likeCount and commentCount
        {
            $project: {
                caption: 1,
                image: 1,
                createdAt: 1,
                likeCount: { $size: "$likes" },
                commentCount: { $size: "$comments" },
                isLiked: 1,
                author: {
                    _id: "$author._id",
                    username: "$author.username",
                    profileImage: "$author.profileImage",
                },
            },
        },
        // Sort newest first
        {
            $sort: { createdAt: -1 },
        },
    ]);

    return res.status(200).json({
        success: true,
        message: posts.length === 0 ? "No posts found" : "Posts fetched successfully",
        posts: posts.length === 0 ? [] : posts,
    });
});

export const getPost = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post ID");
    }

    const user = await User.findOne({ clerkId }).select("_id");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const posts = await Post.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(postId) } },

        // Populate author
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "author",
            },
        },
        { $unwind: "$author" },

        // Add likesCount, commentCount, isLiked
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: {
                    $in: [user._id, "$likes"],
                },
            },
        },

        // Lookup and populate comments with authors
        {
            $lookup: {
                from: "comments",
                let: { postId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$post", "$$postId"] },
                        },
                    },
                    {
                        $lookup: {
                            from: "users",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
                                        username: 1,
                                        profileImage: 1,
                                    },
                                },
                            ],
                            localField: "author",
                            foreignField: "_id",
                            as: "author",
                        },
                    },
                    {
                        $set: {
                            author: { $first: "$author" },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            text: 1,
                            createdAt: 1,
                            author: 1,
                        },
                    },
                ],
                as: "comments",
            },
        },

        // Final projection
        {
            $project: {
                _id: 1,
                caption: 1,
                image: 1,
                createdAt: 1,
                likesCount: 1,
                isLiked: 1,
                commentCount: { $size: "$comments" },
                comments: 1,
                author: {
                    _id: 1,
                    username: 1,
                    profileImage: 1,
                },
            },
        },
    ]);

    if (!posts || posts.length === 0) {
        throw new ApiError(404, "Post not found");
    }

    return res.status(200).json({
        success: true,
        message: "Post fetched successfully",
        post: posts[0],
    });
});

export const createPost = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;

    const { caption } = req.body || {};
    const image = req.file;

    if (!caption?.trim()) {
        throw new ApiError(400, "Caption is required");
    }

    if (!image) {
        throw new ApiError(400, "Image is required");
    }

    // get the user from DB to find their _id
    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Upload image to Cloudinary
    const cloudinaryRes = await uploadOnCloudinary(image.path);
    if (!cloudinaryRes) {
        throw new ApiError(500, "Something went wrong while uploading image");
    }

    // Create post
    const post = await Post.create({
        caption: caption.trim(),
        image: cloudinaryRes.secure_url,
        author: user._id,
    });

    // Push post to user's posts array
    await User.findByIdAndUpdate(user._id, { $push: { posts: post._id } }, { new: true });

    return res.status(201).json({
        success: true,
        message: "New Post created",
        post,
    });
});

export const updatePost = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId; // Clerk ID of logged-in user
    const { postId } = req.params;

    // Validate postId format
    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post id");
    }

    // Find post by ID
    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // Fetch user from clerkId to match with the post author
    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if the logged-in user is the author of the post
    if (post.author.toString() !== user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }

    const { caption } = req.body || {};
    const image = req.file;

    // Either caption or image is required
    if (!caption?.trim() && !image) {
        throw new ApiError(400, "Please provide either a caption or an image");
    }

    // Update caption if provided
    if (caption.trim()) {
        post.caption = caption.trim();
    }

    // Update image if provided
    if (image) {
        // Upload image to Cloudinary
        const cloudinaryRes = await uploadOnCloudinary(image.path);
        if (!cloudinaryRes) {
            throw new ApiError(500, "Something went wrong while uploading image");
        }
        post.image = cloudinaryRes.secure_url;
    }

    // Save updated post
    await post.save();

    return res.status(200).json({
        success: true,
        message: "Post updated successfully",
        post,
    });
});

export const deletePost = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId; // Logged-in user's clerkId
    const { postId } = req.params;

    // Validate postId format
    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post id");
    }

    // Find post by ID
    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // Fetch user from clerkId to match with the post author
    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if the logged-in user is the author of the post
    if (post.author.toString() !== user._id.toString()) {
        throw new ApiError(403, "Unauthorized");
    }

    // Delete the post
    await Post.findByIdAndDelete(postId);

    // Remove the post ID from the user's posts array
    await User.findByIdAndUpdate(user._id, { $pull: { posts: postId } }, { new: true });

    return res.status(200).json({
        success: true,
        message: "Post deleted successfully",
    });
});

export const getUserPosts = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId;

    // Step 1: Get MongoDB user ID from clerkId
    const loggedInUser = await User.findOne({ clerkId });
    if (!loggedInUser) {
        throw new ApiError(404, "Logged-in user not found");
    }

    const { userId } = req.params;

    // Step 2: Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Step 3: Check if the user exists
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Step 4: Aggregate posts
    const posts = await Post.aggregate([
        {
            $match: { author: new mongoose.Types.ObjectId(userId) },
        },
        {
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "_id",
                as: "author",
            },
        },
        { $unwind: "author" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                commentsCount: { $size: "$comments" },
                isLiked: { $in: [loggedInUser._id, "$likes"] },
            },
        },
        {
            $project: {
                _id: 1,
                caption: 1,
                image: 1,
                createdAt: 1,
                likesCount: 1,
                commentsCount: 1,
                isLiked: 1,
                author: {
                    username: 1,
                    profileImage: 1,
                },
            },
        },
        {
            $sort: { createdAt: -1 },
        },
    ]);

    return res.status(200).json({
        success: true,
        message: posts.length > 0 ? "Posts fetched successfully" : "User has no posts yet",
        posts,
    });
});

export const toggleLikePost = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId; // Get logged-in user's clerkId
    const { postId } = req.params;

    // Validate postId format
    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post id");
    }

    // Find the user by clerkId
    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Find post by ID
    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // Check if the user already liked the post
    let isLike = false;
    if (post.likes.includes(user._id)) {
        // If already liked, unlike the post
        isLike = false;
        await post.updateOne({ $pull: { likes: user._id } });
    } else {
        // If not liked, like the post
        isLike = true;
        await post.updateOne({ $addToSet: { likes: user._id } });
    }

    // Save the updated post
    await post.save();

    return res.status(200).json({
        success: true,
        message: isLike ? "Post liked" : "Post unliked",
        post,
    });
});

export const toggleBookmarkPost = asyncHandler(async (req, res) => {
    const clerkId = req.auth.userId; // Get logged-in user's clerkId
    const { postId } = req.params;

    // Validate postId format
    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid post id");
    }

    // Find the post by ID
    const post = await Post.findById(postId);
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    // Find the user by clerkId
    const user = await User.findOne({ clerkId });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if the post is already bookmarked by the user
    if (user.bookmarks.includes(post._id)) {
        // If already bookmarked, remove from bookmarks
        await user.updateOne({ $pull: { bookmarks: post._id } });
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Post removed from bookmark",
            post,
        });
    } else {
        // If not bookmarked, add to bookmarks
        await user.updateOne({ $addToSet: { bookmarks: post._id } });
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Post bookmarked",
            post,
        });
    }
});

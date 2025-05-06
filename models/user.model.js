import mongoose, { Schema, model } from "mongoose";
import Post from "./post.model.js";
import Comment from "./comment.model.js";
import Message from "./message.model.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const userSchema = new Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
        username: {
            type: String,
            minlength: [3, "Username length should not be less than 3 characters"],
            maxlength: [16, "Username length should not exceed 16 characters"],
            match: /^[0-9A-Za-z]{3,16}$/,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        },
        profileImage: {
            url: {
                type: String,
                default: "",
            },
            public_id: {
                type: String,
                default: "",
            },
        },
        bio: {
            type: String,
            maxlength: [300, "Bio length should not exceed 300 characters"],
            default: "",
        },
        gender: {
            type: String,
            enum: ["male", "female"],
            default: "male",
        },
        followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
        following: [{ type: Schema.Types.ObjectId, ref: "User" }],
        posts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
        bookmarks: [{ type: Schema.Types.ObjectId, ref: "Post" }],
    },
    { timestamps: true }
);

userSchema.pre("findOneAndDelete", async function (next) {
    const user = await this.model.findOne(this.getQuery());
    if (!user) return next();

    try {
        // 1. Delete profile image from Cloudinary
        if (user.profileImage?.public_id) {
            await deleteFromCloudinary(user.profileImage.public_id);
        }

        // 2. Delete all posts by user (triggers postSchema.pre("remove"))
        const posts = await Post.find({ author: user._id });
        for (const post of posts) {
            await post.deleteOne();
        }

        // 3. Delete comments made by the user
        await Comment.deleteMany({ author: user._id });

        // 4. Delete all messages where the user is sender or receiver
        await Message.deleteMany({
            $or: [{ senderId: user._id }, { receiverId: user._id }],
        });

        next();
    } catch (err) {
        console.error("Error in user pre-delete middleware:", err);
        next(err);
    }
});

const User = model("User", userSchema);

export default User;

import mongoose, { Schema, model } from "mongoose";

const userSchema = new Schema(
    {
        clerkId: {
            type: String,
            required: true,
            unique: true,
        },
        username: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        },
        profileImage: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
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

const User = model("User", userSchema);
export default User;

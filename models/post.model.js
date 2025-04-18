import { Schema, model } from "mongoose";

const postSchema = new Schema(
    {
        caption: {
            type: String,
            default: "",
            maxlength: [300, "Caption length should not exceed 300 characters"],
        },
        image: {
            type: String,
            required: true,
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        likes: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
    },
    { timestamps: true }
);

const Post = model("Post", postSchema);
export default Post;

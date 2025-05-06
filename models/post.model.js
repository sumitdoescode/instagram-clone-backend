import { Schema, model } from "mongoose";
import Comment from "./comment.model.js";
import { deleteFromCloudinary } from "../utils/cloudinary.js";

const postSchema = new Schema(
    {
        caption: {
            type: String,
            default: "",
            maxlength: [300, "Caption length should not exceed 300 characters"],
        },
        image: {
            url: {
                type: String,
                required: true,
            },
            public_id: {
                type: String,
                required: true,
            },
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

// will delete post comments when post is deleted
// will also delete comment if post is deleted by findByIdAndDelete method
postSchema.pre("findOneAndDelete", async function (next) {
    const post = await this.model.findOne(this.getQuery());
    if (!post) {
        return next();
    }
    // delete image from cloudinary
    if (post.image && post.image.public_id) {
        await deleteFromCloudinary(post.image.public_id);
    }

    // delete all comments related to this post
    await Comment.deleteMany({ post: post._id });
    next();
});

const Post = model("Post", postSchema);
export default Post;

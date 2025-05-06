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
// will only trigger post.remove() method, not post.findOneAndDelete()
postSchema.pre("remove", async function (next) {
    try {
        if (this.image?.public_id) {
            await deleteFromCloudinary(this.image.public_id);
        }
        await Comment.deleteMany({ post: this._id });
        next();
    } catch (err) {
        console.error("Error in post pre-remove middleware:", err);
        next(err);
    }
});

const Post = model("Post", postSchema);
export default Post;

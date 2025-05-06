import { Schema, model } from "mongoose";

const conversationSchema = new Schema(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        lastMessage: {
            type: String,
            required: true,
            trim: true,
        },
    },
    { timestamps: true }
);
const Conversation = model("Conversation", conversationSchema);

export default Conversation;

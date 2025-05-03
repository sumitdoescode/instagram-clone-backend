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
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
    },
    { timestamps: true }
);
const Conversation = model("Conversation", conversationSchema);

export default Conversation;

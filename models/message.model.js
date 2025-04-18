import mongoose, { Schema, model } from "mongoose";

const messageSchema = new Schema(
    {
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            trim: true,
            required: true,
        },
    },
    { timestamps: true }
);

const Message = model("Message", messageSchema);

export default Message;

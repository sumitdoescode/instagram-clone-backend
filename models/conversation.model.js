import { Schema, model } from "mongoose";

// Define schema
const conversationSchema = new Schema(
    {
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        lastMessage: {
            type: Schema.Types.ObjectId,
            ref: "Message",
        },
    },
    { timestamps: true }
);

// Enforce only 2 participants
conversationSchema.pre("validate", function (next) {
    if (this.participants.length !== 2) {
        next(new Error("A conversation must have exactly two participants."));
    } else {
        // Always sort to maintain consistency (important for uniqueness)
        this.participants.sort();
        next();
    }
});

// Add unique index to prevent duplicates
conversationSchema.index({ participants: 1 }, { unique: true });

// Create and export the model
const Conversation = model("Conversation", conversationSchema);
export default Conversation;

import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { Webhook } from "svix";

const router = express.Router();

// Clerk sends raw JSON so we need to parse it as raw
// prefix = "/api/v1/webhook"
router.post(
    "/clerk",
    express.raw({ type: "*/*" }),
    asyncHandler(async (req, res) => {
        console.log("coming inside webhook.routes.js");
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
        const payload = req.body;
        const headers = req.headers;

        const wh = new Webhook(WEBHOOK_SECRET);

        let event;

        try {
            event = wh.verify(payload, headers); // ✅ This is the proper way
        } catch (err) {
            console.error("❌ Invalid Clerk webhook signature:", err.message);
            return res.status(400).send("Invalid signature");
        }

        const { type: eventType, data } = event;
        const { id: clerkId, username, email_addresses, image_url, public_metadata } = data;

        const email = email_addresses?.[0]?.email_address;

        switch (eventType) {
            case "user.created":
                await User.create({
                    clerkId,
                    username: username || email.split("@")[0],
                    email,
                    profilePicture: image_url || "",
                    bio: public_metadata?.bio || "",
                    gender: public_metadata?.gender || undefined,
                });
                console.log(`✅ [Clerk] User created: ${email}`);
                break;

            case "user.updated":
                await User.findOneAndUpdate(
                    { clerkId },
                    {
                        username: username || email.split("@")[0],
                        email,
                        profilePicture: image_url || "",
                        bio: public_metadata?.bio || "",
                        gender: public_metadata?.gender || undefined,
                    },
                    { new: true }
                );
                console.log(`🔄 [Clerk] User updated: ${email}`);
                break;

            case "user.deleted":
                await User.findOneAndDelete({ clerkId });
                console.log(`❌ [Clerk] User deleted: ${clerkId}`);
                break;

            default:
                console.log(`⚠️ [Clerk] Unhandled event type: ${eventType}`);
                break;
        }

        return res.status(200).json({ success: true });
    })
);

export default router;

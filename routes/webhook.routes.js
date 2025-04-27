import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";
import { Webhook } from "svix";

const router = express.Router();

// Clerk sends raw JSON so we need to parse it as raw
// prefix = "/api/v1/webhook"
router.post(
    "/clerk",
    express.raw({ type: "application/json" }),
    asyncHandler(async (req, res) => {
        console.log("coming inside webhook.routes.js");
        const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
        const payload = req.body;
        const headers = req.headers;

        const wh = new Webhook(WEBHOOK_SECRET);

        let event;
        console.log("1. About to verify signature");

        try {
            event = wh.verify(payload, headers); // ✅ This is the proper way
            console.log("2. Signature verified successfully");
        } catch (err) {
            console.error("❌ Invalid Clerk webhook signature:", err.message);
            return res.status(400).send("Invalid signature");
        }
        console.log("3. After signature verification, EventType:", event.type);
        const { type: eventType, data } = event;
        const { id: clerkId, username, email_addresses, image_url, public_metadata } = data;

        const email = email_addresses?.[0]?.email_address;

        switch (eventType) {
            case "user.created":
                console.log("4. About to insert user into DB");
                await User.create({
                    clerkId,
                    username: username,
                    email: email,
                    profileImage: image_url || "",
                });
                console.log("5. Successfully inserted user");
                break;

            // case "user.updated":
            //     console.log("user updated webhook");
            //     await User.findOneAndUpdate(
            //         { clerkId },
            //         {
            //             username: username,
            //             email: email,
            //             profileImage: public_metadata?.profileImage,
            //             bio: public_metadata?.bio || "",
            //             gender: public_metadata?.gender || "male",
            //         },
            //         { new: true }
            //     );
            //     break;

            case "user.deleted":
                console.log("user deleting webhook");
                await User.findOneAndDelete({ clerkId });
                break;

            default:
                console.log(`⚠️ [Clerk] Unhandled event type: ${eventType}`);
                break;
        }

        return res.status(200).json({ success: true });
    })
);

export default router;

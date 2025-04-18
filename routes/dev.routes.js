// // Dev-only route
// import express from "express";
// import { clerkClient } from "@clerk/backend";
// import asyncHandler from "../utils/asyncHandler.js";
// const router = express.Router();
// import { config } from "dotenv";
// config();

// // /api/vi/dev/signup
// router.post(
//     "/signup",
//     asyncHandler(async (req, res) => {
//         const { email, password } = req.body;
//         if (!email || !password) {
//             return res.status(400).json({ success: false, message: "Email and password are required" });
//         }
//         const user = await clerkClient.users.createUser({
//             emailAddress: [email],
//             password,
//         });

//         const session = await clerkClient.sessions.createSession({
//             userId: user.id,
//         });

//         const jwt = await clerkClient.sessions.getToken(session.id, {
//             template: "instagram-clone", // setup in Clerk dashboard
//         });

//         res.status(200).json({ token: jwt });
//     })
// );

// export default router;

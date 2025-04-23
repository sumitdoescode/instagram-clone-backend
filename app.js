import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { clerkMiddleware } from "@clerk/express";

const app = express();

// adding middlewares to our applications
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
express.urlencoded({ extended: true });
app.use(cookieParser());
app.use(clerkMiddleware());

// importing routes
import healthcheckRouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";
import postRouter from "./routes/post.routes.js";
import messageRouter from "./routes/message.routes.js";
import commentRouter from "./routes/comment.routes.js";
import webhookRouter from "./routes/webhook.routes.js";
// import devRouter from "./routes/dev.routes.js";

// using routes
app.use("/api/v1/webhook", webhookRouter);
app.use(express.json());
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/post", postRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/comment", commentRouter);
// app.use("/api/v1/dev", devRouter);

export default app;

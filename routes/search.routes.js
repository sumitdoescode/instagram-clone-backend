import express from "express";
import { requireAuth } from "@clerk/express";
import { searchUsers } from "../controllers/search.controller.js";

const router = express.Router();

// prefix is /api/v1/search
router.get("/", requireAuth(), searchUsers); // search users

export default router;

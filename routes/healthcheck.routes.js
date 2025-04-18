import express from "express";
import { healthcheck } from "../controllers/healthcheck.controller.js";

const router = express.Router();

router.get("/", healthcheck);

export default router;
// This route is used to check the health of the server. It responds with a 200 status code if the server is running properly.

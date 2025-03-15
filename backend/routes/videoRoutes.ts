import express from "express";
import { getVideoSummary } from "../controllers/videoController";

const router = express.Router();

router.post("/summarize", async (req, res) => {
  try {
    await getVideoSummary(req, res);
  } catch (error) {
    console.error("Error in video summary route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

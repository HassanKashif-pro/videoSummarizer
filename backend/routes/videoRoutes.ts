import express from "express";
import { getVideoSummary, saveVideoNote } from "../controllers/videoController";

const router = express.Router();

router.post("/summarize", async (req, res) => {
  try {
    await getVideoSummary(req, res);
  } catch (error) {
    console.error("Error in video summary route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/save", async (req, res) => {
  try {
    await saveVideoNote(req, res);
  } catch (error) {
    console.error("Error in video save route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

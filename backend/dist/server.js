"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { getTranscript } = require("youtube-transcript-api");
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: "*" })); // ⚠️ Change this in production
app.use(express.json());
console.log("🚀 Server is starting...");
// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
// ✅ Root Route
app.get("/", (req, res) => {
    console.log("📢 Root route hit: GET /");
    res.send("YouTube Summarizer API is running...");
});
// ✅ Fetch YouTube Transcript (REAL IMPLEMENTATION)
app.get("/transcript/:videoId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { videoId } = req.params;
    console.log(`📥 Received request for transcript - Video ID: ${videoId}`);
    // ✅ Validate the video ID
    if (!videoId || videoId.length !== 11) {
        return res.status(400).json({ error: "Invalid YouTube video ID" });
    }
    try {
        // ✅ Fetch transcript from YouTube
        const captions = yield getTranscript(videoId);
        if (!Array.isArray(captions) || captions.length === 0) {
            throw new Error("⚠️ No captions found for this video.");
        }
        // ✅ Convert captions to a single transcript string
        const transcript = captions.map((caption) => caption.text).join(" ");
        console.log(`✅ Successfully fetched transcript for ${videoId}`);
        res.json({ transcript });
    }
    catch (error) {
        console.error(`❌ Error fetching transcript:`, error.message);
        // ✅ Handle 403 Errors (YouTube Blocking Requests)
        if (error.message.includes("403")) {
            return res.status(403).json({
                error: "YouTube is blocking transcript requests. Try again later.",
            });
        }
        // ✅ Handle 404 Errors (Video Not Found)
        if (error.message.includes("404")) {
            return res
                .status(404)
                .json({ error: "Video not found or no captions available." });
        }
        res.status(500).json({ error: "Failed to fetch transcript" });
    }
}));
// ✅ Summarize Transcript (Dummy Implementation)
app.post("/summarize", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { transcript } = req.body;
    console.log(`📥 Received request to summarize transcript: ${transcript
        ? transcript.substring(0, 30) + "..."
        : "No transcript received"}`);
    if (!transcript) {
        console.warn("⚠️ No transcript provided in request body!");
        return res.status(400).json({ error: "No transcript provided" });
    }
    try {
        // ✅ Simulating AI API call (Replace with real AI logic)
        const summary = `Summary: ${transcript.substring(0, 100)}...`;
        console.log(`✅ Summarization successful: ${summary}`);
        res.json({ summary });
    }
    catch (error) {
        console.error(`❌ Summarization failed:`, error.message);
        res.status(500).json({ error: "Summarization failed" });
    }
}));

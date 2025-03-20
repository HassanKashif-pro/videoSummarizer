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
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
console.log("🚀 Server is starting...");
app.get("/", (req, res) => {
    console.log("📢 Root route hit: GET /");
    res.send("YouTube Summarizer API is running...");
});
// Route to fetch video transcript
app.get("/transcript/:videoId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { videoId } = req.params;
    console.log(`📥 Received request for transcript - Video ID: ${videoId}`);
    try {
        // Simulating API call (replace with actual API call)
        const transcript = `Dummy transcript for video ID: ${videoId}`;
        console.log(`✅ Successfully fetched transcript for ${videoId}`);
        res.json({ transcript });
    }
    catch (error) {
        console.error(`❌ Error fetching transcript: ${error.message}`);
        res.status(500).json({ error: "Failed to fetch transcript" });
    }
}));
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
        // Simulating AI API call (replace with actual AI service)
        const summary = `Summary: ${transcript.substring(0, 50)}...`;
        console.log(`✅ Summarization successful: ${summary}`);
        res.json({ summary });
    }
    catch (error) {
        console.error(`❌ Summarization failed: ${error.message}`);
        res.status(500).json({ error: "Summarization failed" });
    }
}));

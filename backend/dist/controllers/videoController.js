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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVideoNotes = exports.saveVideoNote = exports.getVideoSummary = exports.fetchTranscript = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const youtube_transcript_api_1 = require("youtube-transcript-api");
const database_1 = require("../services/database");
dotenv_1.default.config(); // Load environment variables
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
// ✅ Function to extract Video ID from YouTube URLs
const extractVideoId = (url) => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
};
// ✅ Fetch Transcript with Error Handling
const fetchTranscript = (videoId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("📥 Fetching transcript for video ID:", videoId);
        // ✅ Attempt to fetch the transcript (handle errors)
        const captions = yield (0, youtube_transcript_api_1.getTranscript)(videoId).catch((err) => {
            console.error("⚠️ Transcript fetch error:", err.message);
            throw new Error("⚠️ Unable to fetch transcript. Video may be restricted.");
        });
        console.log("📜 Raw captions:", captions);
        if (!Array.isArray(captions) || captions.length === 0) {
            throw new Error("⚠️ No captions found for this video.");
        }
        // ✅ Convert captions into a single transcript string
        const transcript = captions
            .map((caption) => caption.text)
            .join(" ");
        console.log("✅ Final transcript:", transcript);
        return transcript;
    }
    catch (error) {
        console.error("❌ Error fetching transcript:", error instanceof Error ? error.message : "Unknown error");
        throw new Error("❌ Failed to fetch transcript. Video might have no captions.");
    }
});
exports.fetchTranscript = fetchTranscript;
// ✅ Function to summarize text using OpenAI API
const summarizeText = (text) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const response = yield axios_1.default.post("https://api.openai.com/v1/completions", {
            model: "gpt-4", // Ensure GPT-4 access
            prompt: `Summarize this transcript:\n\n${text}`,
            max_tokens: 150,
        }, {
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
        });
        if (!((_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.choices) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.text)) {
            throw new Error("Invalid response from OpenAI.");
        }
        return response.data.choices[0].text.trim();
    }
    catch (error) {
        console.error("❌ Error summarizing text:", ((_d = error.response) === null || _d === void 0 ? void 0 : _d.data) || error.message);
        throw new Error("❌ Failed to summarize text.");
    }
});
// ✅ Express route handler
const getVideoSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoUrl } = req.body;
        if (!videoUrl) {
            console.log("❌ No video URL provided");
            return res.status(400).json({ error: "Missing video URL." });
        }
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            console.log("❌ Invalid YouTube URL:", videoUrl);
            return res.status(400).json({ error: "Invalid YouTube URL." });
        }
        console.log("✅ Extracted Video ID:", videoId);
        // ✅ Fetch transcript
        const transcript = yield (0, exports.fetchTranscript)(videoId);
        if (!transcript) {
            console.log("❌ Transcript is empty");
            return res.status(400).json({ error: "No transcript found." });
        }
        console.log("✅ Fetched Transcript:", transcript);
        // ✅ Summarize the transcript
        const summary = yield summarizeText(transcript);
        console.log("✅ Generated Summary:", summary);
        res.json({ transcript, summary });
    }
    catch (error) {
        console.error("❌ Error:", error.message);
        res.status(500).json({ error: "Failed to fetch transcript." });
    }
});
exports.getVideoSummary = getVideoSummary;
// Fetch video information from YouTube API
const fetchVideoInfo = (videoId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`);
        if (response.data.items && response.data.items.length > 0) {
            return {
                title: response.data.items[0].snippet.title,
                description: response.data.items[0].snippet.description,
                thumbnail: response.data.items[0].snippet.thumbnails.default.url,
            };
        }
        throw new Error("Video not found");
    }
    catch (error) {
        console.error("Error fetching video info:", error);
        throw error;
    }
});
// Save video note to database
const saveVideoNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoUrl, content, category, isPinned } = req.body;
        if (!videoUrl) {
            return res.status(400).json({ error: "Missing video URL" });
        }
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }
        // Fetch video information
        const videoInfo = yield fetchVideoInfo(videoId);
        // Create new note
        const note = new database_1.VideoNote({
            videoId,
            videoTitle: videoInfo.title,
            videoUrl,
            contentType: "text",
            content,
            category,
            isPinned,
            timestamp: new Date().toISOString(),
        });
        // Save to database
        yield note.save();
        res.status(201).json(note);
    }
    catch (error) {
        console.error("Error saving video note:", error);
        res.status(500).json({ error: "Failed to save video note" });
    }
});
exports.saveVideoNote = saveVideoNote;
// Get all video notes
const getVideoNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notes = yield database_1.VideoNote.find().sort({ timestamp: -1 });
        res.json(notes);
    }
    catch (error) {
        console.error("Error fetching video notes:", error);
        res.status(500).json({ error: "Failed to fetch video notes" });
    }
});
exports.getVideoNotes = getVideoNotes;

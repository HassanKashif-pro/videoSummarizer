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
exports.deleteVideoNote = exports.getVideoNotes = exports.saveVideoNote = exports.getVideoSummary = exports.fetchTranscript = void 0;
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
        const { videoUrl, content, category, isPinned, timestamp, contentType } = req.body;
        console.log('🔍 Saving note with:', {
            contentType,
            contentPreview: contentType === 'image'
                ? `[IMAGE DATA - ${content.length} chars]`
                : content.substring(0, 100),
            timestamp,
            category: category || "Uncategorized"
        });
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
            contentType: contentType || "text",
            content,
            category: category || "Uncategorized",
            isPinned,
            timestamp: timestamp || "0:00",
        });
        // Save to database
        const savedNote = yield note.save();
        console.log('✅ Note saved successfully:', {
            id: savedNote._id,
            contentType: savedNote.contentType,
            category: savedNote.category,
            contentPreview: savedNote.contentType === 'image'
                ? `[IMAGE DATA - ${savedNote.content.length} chars]`
                : savedNote.content.substring(0, 100)
        });
        res.status(201).json(savedNote);
    }
    catch (error) {
        console.error("❌ Error saving video note:", error);
        res.status(500).json({ error: "Failed to save video note" });
    }
});
exports.saveVideoNote = saveVideoNote;
// Get all video notes
const getVideoNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const notes = yield database_1.VideoNote.find().sort({ timestamp: -1 });
        console.log('📥 Retrieved notes:', notes.map(note => ({
            id: note._id,
            contentType: note.contentType,
            contentPreview: note.contentType === 'image'
                ? `[IMAGE DATA - ${note.content.length} chars]`
                : note.content.substring(0, 100)
        })));
        res.json(notes);
    }
    catch (error) {
        console.error("❌ Error fetching video notes:", error);
        res.status(500).json({ error: "Failed to fetch video notes" });
    }
});
exports.getVideoNotes = getVideoNotes;
// Delete a video note
const deleteVideoNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { noteId } = req.params;
        console.log("Delete request received for note ID:", noteId);
        if (!noteId) {
            return res.status(400).json({ error: "Missing note ID" });
        }
        const deletedNote = yield database_1.VideoNote.findByIdAndDelete(noteId);
        if (!deletedNote) {
            console.log("Note not found with ID:", noteId);
            return res.status(404).json({ error: "Note not found" });
        }
        console.log("Successfully deleted note:", deletedNote);
        // Also return all remaining notes to help with debugging
        const remainingNotes = yield database_1.VideoNote.find();
        console.log("Remaining notes count:", remainingNotes.length);
        res.status(200).json({
            message: "Note deleted successfully",
            deletedNote,
            remainingNotesCount: remainingNotes.length
        });
    }
    catch (error) {
        console.error("Error deleting video note:", error);
        res.status(500).json({ error: "Failed to delete video note" });
    }
});
exports.deleteVideoNote = deleteVideoNote;
// Add this new function to get video category
// export const getVideoCategory = async (req: Request, res: Response) => {
//   try {
//     const videoId = req.params.videoId;
//     if (!videoId) {
//       return res.status(400).json({ error: "Missing video ID" });
//     }
//     const response = await axios.get(
//       `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
//     );
//     if (!response.data.items || response.data.items.length === 0) {
//       return res.status(404).json({ error: "Video not found" });
//     }
//     const videoData = response.data.items[0].snippet;
//     const categoryId = videoData.categoryId;
//     const tags = videoData.tags || [];
//     const description = videoData.description || "";
//     const title = videoData.title || "";
//     console.log("YouTube API videoData:", videoData);
//     console.log("YouTube API categoryId:", categoryId);
//     console.log("Video title:", title);
//     console.log("Video description:", description);
//     console.log("Video tags:", tags);
//     // Map YouTube categoryId to our categories
//     let category = "Uncategorized";
//     if (categoryId === "27") {
//       category = "Education";
//     } else if (categoryId === "20") {
//       category = "Gaming";
//     } else if (categoryId === "28") {
//       category = "Science & Technology";
//     } else if (categoryId === "24" || categoryId === "10") {
//       category = "Entertainment";
//     }
//     // Fallback: Check title, description, and tags for keywords if still Uncategorized
//     if (category === "Uncategorized") {
//       const content = `${title} ${description} ${tags.join(" ")}`.toLowerCase();
//       if (
//         content.includes("education") ||
//         content.includes("tutorial") ||
//         content.includes("learn") ||
//         content.includes("course")
//       ) {
//         category = "Education";
//       } else if (
//         content.includes("game") ||
//         content.includes("gaming") ||
//         content.includes("gameplay")
//       ) {
//         category = "Gaming";
//       } else if (
//         content.includes("science") ||
//         content.includes("tech") ||
//         content.includes("technology")
//       ) {
//         category = "Science & Technology";
//       } else if (
//         content.includes("entertainment") ||
//         content.includes("music") ||
//         content.includes("comedy")
//       ) {
//         category = "Entertainment";
//       }
//     }
//     console.log("Final chosen category:", category);
//     res.json({ category });
//   } catch (error: any) {
//     console.error(
//       "Error fetching video category:",
//       error.response?.data || error.message || error
//     );
//     res.status(500).json({ error: "Failed to fetch video category" });
//   }
// };

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
exports.renameVideo = exports.deleteVideo = exports.updateVideoCategory = exports.deleteVideoNote = exports.getVideoNote = exports.getVideoNotes = exports.saveVideoNote = exports.getVideoSummary = exports.fetchTranscript = void 0;
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
// Fetch video information from YouTube API with caching
const videoInfoCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const fetchVideoInfo = (videoId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check cache first
        const cacheKey = `video_${videoId}`;
        const cached = videoInfoCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`📋 Using cached video info for ${videoId}`);
            return cached.data;
        }
        console.log(`🔄 Fetching video info for ${videoId} from YouTube API`);
        const response = yield axios_1.default.get(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`, { timeout: 10000 } // 10 second timeout
        );
        if (response.data.items && response.data.items.length > 0) {
            const videoInfo = {
                title: response.data.items[0].snippet.title,
                description: response.data.items[0].snippet.description,
                thumbnail: response.data.items[0].snippet.thumbnails.default.url,
            };
            // Cache the result
            videoInfoCache.set(cacheKey, {
                data: videoInfo,
                timestamp: Date.now()
            });
            console.log(`✅ Video info cached for ${videoId}`);
            return videoInfo;
        }
        throw new Error("Video not found");
    }
    catch (error) {
        console.error("Error fetching video info:", error);
        // Return fallback data instead of throwing
        return {
            title: "Unknown Title",
            description: "",
            thumbnail: ""
        };
    }
});
// Save video note to database with optimizations
const saveVideoNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const startTime = Date.now();
        const { videoUrl, content, category, isPinned, timestamp, contentType, videoId: providedVideoId, videoTitle: providedTitle } = req.body;
        if (!videoUrl) {
            return res.status(400).json({ error: "Missing video URL" });
        }
        const videoId = providedVideoId || extractVideoId(videoUrl);
        if (!videoId) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }
        console.log(`🔄 Saving note for video ${videoId}, content type: ${contentType || 'text'}`);
        // Use provided title or fetch from API as fallback
        let videoInfo;
        if (providedTitle) {
            videoInfo = { title: providedTitle };
            console.log(`📋 Using provided video title: ${providedTitle}`);
        }
        else {
            videoInfo = yield fetchVideoInfo(videoId);
        }
        // Validate content size for images
        if (contentType === 'image' && content && content.length > 5 * 1024 * 1024) { // 5MB limit
            return res.status(400).json({ error: "Image too large. Maximum size is 5MB." });
        }
        // Create new note with minimal required fields
        const noteData = {
            videoId,
            videoTitle: videoInfo.title,
            videoUrl,
            contentType: contentType || "text",
            content,
            category: category || "Uncategorized",
            isPinned: isPinned || false,
            timestamp: timestamp || "0:00",
            createdAt: new Date(),
        };
        console.log(`📝 Creating note with data size: ${JSON.stringify(noteData).length} characters`);
        // Save to database with lean option for better performance
        const savedNote = yield database_1.VideoNote.create(noteData);
        const saveTime = Date.now() - startTime;
        console.log(`✅ Note saved in ${saveTime}ms: ${savedNote.contentType} content, ID: ${savedNote._id}`);
        // Return minimal response to reduce transfer time
        const response = {
            _id: savedNote._id,
            videoId: savedNote.videoId,
            contentType: savedNote.contentType,
            category: savedNote.category,
            timestamp: savedNote.timestamp,
            createdAt: savedNote.createdAt,
            success: true
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error("❌ Error saving video note:", error);
        res.status(500).json({ error: "Failed to save video note" });
    }
});
exports.saveVideoNote = saveVideoNote;
// Get all video notes with optimizations and pagination
const getVideoNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const startTime = Date.now();
        // Parse query parameters for optimization
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 items
        const videoId = req.query.videoId;
        const category = req.query.category;
        const contentType = req.query.contentType;
        const includeContent = req.query.includeContent !== 'false'; // Default true
        console.log(`🔄 Fetching notes - Page: ${page}, Limit: ${limit}, VideoID: ${videoId || 'all'}, Category: ${category || 'all'}`);
        // Build query filter
        const filter = {};
        if (videoId)
            filter.videoId = videoId;
        if (category && category !== 'all')
            filter.category = category;
        if (contentType)
            filter.contentType = contentType;
        // Build projection (exclude large content for list views)
        const projection = includeContent ? {} : {
            content: 0 // Exclude content field for faster loading
        };
        // Calculate skip for pagination
        const skip = (page - 1) * limit;
        // Optimized query with lean() for better performance
        const notesQuery = database_1.VideoNote
            .find(filter, projection)
            .sort({ isPinned: -1, createdAt: -1 }) // Pinned first, then newest
            .skip(skip)
            .limit(limit)
            .lean(); // Returns plain JavaScript objects instead of Mongoose documents
        // Execute query with timeout
        const notes = yield Promise.race([
            notesQuery.exec(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 15000))
        ]);
        // Get total count for pagination (only if needed)
        let totalCount = 0;
        if (page === 1) {
            try {
                totalCount = yield database_1.VideoNote.countDocuments(filter).maxTimeMS(5000);
            }
            catch (countError) {
                console.warn("⚠️ Count query failed, skipping pagination info");
                totalCount = notes.length;
            }
        }
        const queryTime = Date.now() - startTime;
        console.log(`✅ Fetched ${notes.length} notes in ${queryTime}ms`);
        // Optimize response payload
        const optimizedNotes = notes.map(note => {
            var _a;
            return ({
                _id: note._id,
                videoId: note.videoId,
                videoTitle: ((_a = note.videoTitle) === null || _a === void 0 ? void 0 : _a.substring(0, 100)) || '', // Truncate long titles
                videoUrl: note.videoUrl,
                content: includeContent ? note.content : undefined,
                contentType: note.contentType,
                category: note.category,
                timestamp: note.timestamp,
                isPinned: note.isPinned,
                createdAt: note.createdAt,
            });
        });
        const response = {
            notes: optimizedNotes,
            pagination: {
                page,
                limit,
                total: totalCount,
                hasMore: notes.length === limit
            },
            meta: {
                queryTime: `${queryTime}ms`,
                count: notes.length
            }
        };
        res.json(response);
    }
    catch (error) {
        console.error("❌ Error fetching video notes:", error);
        if (error.message === 'Query timeout') {
            res.status(408).json({ error: "Request timeout. Please try again." });
        }
        else {
            res.status(500).json({ error: "Failed to fetch video notes" });
        }
    }
});
exports.getVideoNotes = getVideoNotes;
// Get a single note with full content
const getVideoNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { noteId } = req.params;
        if (!noteId) {
            return res.status(400).json({ error: "Missing note ID" });
        }
        const note = yield database_1.VideoNote.findById(noteId).lean().maxTimeMS(5000);
        if (!note) {
            return res.status(404).json({ error: "Note not found" });
        }
        res.json(note);
    }
    catch (error) {
        console.error("❌ Error fetching video note:", error);
        res.status(500).json({ error: "Failed to fetch video note" });
    }
});
exports.getVideoNote = getVideoNote;
// Delete a video note with optimizations
const deleteVideoNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const startTime = Date.now();
        const { noteId } = req.params;
        console.log("🗑️ Delete request received for note ID:", noteId);
        if (!noteId) {
            return res.status(400).json({ error: "Missing note ID" });
        }
        // Use findByIdAndDelete with lean for better performance
        const deletedNote = yield database_1.VideoNote.findByIdAndDelete(noteId).lean().maxTimeMS(5000);
        if (!deletedNote) {
            console.log("⚠️ Note not found with ID:", noteId);
            return res.status(404).json({ error: "Note not found" });
        }
        const deleteTime = Date.now() - startTime;
        console.log(`✅ Successfully deleted note in ${deleteTime}ms:`, deletedNote._id);
        // Return minimal response
        res.status(200).json({
            message: "Note deleted successfully",
            deletedId: deletedNote._id,
            success: true
        });
    }
    catch (error) {
        console.error("❌ Error deleting video note:", error);
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
// Update video note category (for drag and drop functionality)
const updateVideoCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoUrl, newCategory } = req.body;
        if (!videoUrl || !newCategory) {
            return res.status(400).json({ error: "Missing video URL or new category" });
        }
        console.log(`🔄 Updating category for video ${videoUrl} to: ${newCategory}`);
        // Update all notes for this video to the new category
        const result = yield database_1.VideoNote.updateMany({ videoUrl: videoUrl }, { $set: { category: newCategory } });
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "No notes found for this video" });
        }
        console.log(`✅ Updated ${result.modifiedCount} notes to category: ${newCategory}`);
        res.json({
            success: true,
            modifiedCount: result.modifiedCount,
            newCategory: newCategory
        });
    }
    catch (error) {
        console.error("❌ Error updating video category:", error);
        res.status(500).json({ error: "Failed to update video category" });
    }
});
exports.updateVideoCategory = updateVideoCategory;
// Delete all notes for a specific video
const deleteVideo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoUrl } = req.params;
        if (!videoUrl) {
            return res.status(400).json({ error: "Missing video URL" });
        }
        const decodedVideoUrl = decodeURIComponent(videoUrl);
        console.log(`🗑️ Deleting all notes for video: ${decodedVideoUrl}`);
        // Delete all notes for this video
        const result = yield database_1.VideoNote.deleteMany({ videoUrl: decodedVideoUrl });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "No notes found for this video" });
        }
        console.log(`✅ Deleted ${result.deletedCount} notes for video: ${decodedVideoUrl}`);
        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: "Video and all its notes deleted successfully"
        });
    }
    catch (error) {
        console.error("❌ Error deleting video:", error);
        res.status(500).json({ error: "Failed to delete video" });
    }
});
exports.deleteVideo = deleteVideo;
// Rename video title for all notes
const renameVideo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoUrl, newTitle } = req.body;
        if (!videoUrl || !newTitle) {
            return res.status(400).json({ error: "Missing video URL or new title" });
        }
        console.log(`📝 Renaming video "${videoUrl}" to: ${newTitle}`);
        // Update video title for all notes of this video
        const result = yield database_1.VideoNote.updateMany({ videoUrl: videoUrl }, { $set: { videoTitle: newTitle } });
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: "No notes found for this video" });
        }
        console.log(`✅ Renamed video title for ${result.modifiedCount} notes`);
        res.json({
            success: true,
            modifiedCount: result.modifiedCount,
            newTitle: newTitle,
            message: "Video renamed successfully"
        });
    }
    catch (error) {
        console.error("❌ Error renaming video:", error);
        res.status(500).json({ error: "Failed to rename video" });
    }
});
exports.renameVideo = renameVideo;

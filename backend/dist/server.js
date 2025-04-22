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
const { getTranscript } = require("youtube-transcript-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");
const https = require("https");
const HttpsProxyAgent = require("https-proxy-agent");
const { connectDB } = require("./services/database");
const { saveVideoNote, getVideoNotes, } = require("./controllers/videoController");
const app = express();
const PORT = process.env.PORT || 5000;
// Add these constants after the imports
const LOG_DIR = path.join(__dirname, "logs");
const API_STATS_FILE = path.join(LOG_DIR, "api_stats.json");
const PROXY_LIST = process.env.PROXY_LIST
    ? process.env.PROXY_LIST.split(",")
    : [];
const USE_PROXY = process.env.USE_PROXY === "true";
let currentProxyIndex = 0;
// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}
// Initialize API stats if file doesn't exist
if (!fs.existsSync(API_STATS_FILE)) {
    fs.writeFileSync(API_STATS_FILE, JSON.stringify({
        youtubeApi: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastError: null,
            lastErrorTime: null,
            quotaUsed: 0,
        },
        youtubeTranscriptApi: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastError: null,
            lastErrorTime: null,
        },
        assemblyAI: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            lastError: null,
            lastErrorTime: null,
        },
    }));
}
// Initialize Gemini AI
let genAI;
let geminiModel;
// Add YouTube Data API implementation
const youtube = google.youtube("v3");
// Add AssemblyAI implementation
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
// Add these constants after the imports
const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1",
];
// Add this function to get a random user agent
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
// Add this function to implement exponential backoff
function withRetry(operation_1) {
    return __awaiter(this, arguments, void 0, function* (operation, maxRetries = 3, initialDelay = 1000) {
        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return yield operation();
            }
            catch (error) {
                lastError = error;
                console.warn(`⚠️ [RETRY] Attempt ${attempt + 1}/${maxRetries} failed:`, error);
                if (attempt < maxRetries - 1) {
                    const delay = initialDelay * Math.pow(2, attempt);
                    console.log(`⏱️ [RETRY] Waiting ${delay}ms before retrying...`);
                    yield new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    });
}
try {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in .env file");
    }
    console.log("🔄 Initializing Gemini AI...");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Initialize with beta API version for Gemini 1.5
    geminiModel = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        apiVersion: "v1beta",
    });
    // Test the connection immediately
    (() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            console.log("🔄 Testing Gemini connection...");
            const prompt = "Hello! Please confirm if you're working.";
            const result = yield geminiModel.generateContent(prompt);
            const response = yield result.response;
            const text = response.text();
            console.log("✅ Gemini test successful:", text);
        }
        catch (testError) {
            console.error("❌ Gemini test failed:", testError);
            if (testError instanceof Error) {
                console.error("Error details:", {
                    name: testError.name,
                    message: testError.message,
                    stack: testError.stack,
                });
            }
        }
    }))();
}
catch (error) {
    console.error("❌ Failed to initialize Gemini AI:", error);
    if (error instanceof Error) {
        console.error("Error message:", error.message);
    }
    process.exit(1);
}
// Initialize database connection
connectDB().catch(console.error);
app.use(cors({ origin: "*" })); // ⚠️ Change this in production
app.use(express.json());
console.log("🚀 Server is starting...");
// Add this function to get the next proxy from the rotation
function getNextProxy() {
    if (!USE_PROXY || PROXY_LIST.length === 0) {
        return null;
    }
    const proxy = PROXY_LIST[currentProxyIndex];
    currentProxyIndex = (currentProxyIndex + 1) % PROXY_LIST.length;
    console.log(`🔄 [PROXY] Using proxy: ${proxy}`);
    return proxy;
}
// Add this function to create an axios instance with proxy
function createAxiosWithProxy() {
    const proxy = getNextProxy();
    if (!proxy) {
        return axios;
    }
    const httpsAgent = new HttpsProxyAgent(proxy);
    return axios.create({
        httpsAgent,
        timeout: 30000, // 30 seconds timeout
    });
}
// Modify the getTranscript function to use proxy
function getTranscriptWithProxy(videoId_1) {
    return __awaiter(this, arguments, void 0, function* (videoId, options = {}) {
        return withRetry(() => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🔄 [API] Attempting to fetch transcript with proxy support...`);
                // Create axios instance with proxy
                const axiosInstance = createAxiosWithProxy();
                // Use the proxy-enabled axios instance with random user agent
                const response = yield axiosInstance.get(`https://www.youtube.com/watch?v=${videoId}`, {
                    headers: {
                        "User-Agent": getRandomUserAgent(),
                        "Accept-Language": "en-US,en;q=0.9",
                        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Encoding": "gzip, deflate, br",
                        Connection: "keep-alive",
                        "Upgrade-Insecure-Requests": "1",
                        "Cache-Control": "max-age=0",
                        "Sec-Fetch-Dest": "document",
                        "Sec-Fetch-Mode": "navigate",
                        "Sec-Fetch-Site": "none",
                        "Sec-Fetch-User": "?1",
                        DNT: "1",
                    },
                });
                // Extract the transcript data from the response
                const transcriptData = extractTranscriptFromResponse(response.data);
                if (!transcriptData) {
                    throw new Error("Could not extract transcript data from response");
                }
                return transcriptData;
            }
            catch (error) {
                console.error(`❌ [API] Error fetching transcript with proxy:`, error);
                throw error;
            }
        }));
    });
}
// Helper function to extract transcript from YouTube response
function extractTranscriptFromResponse(htmlContent) {
    try {
        // This is a simplified extractor - you may need to adjust based on YouTube's actual HTML structure
        const transcriptMatch = htmlContent.match(/"captions":\s*({[^}]+})/);
        if (!transcriptMatch) {
            return null;
        }
        const captionsData = JSON.parse(transcriptMatch[1]);
        if (!captionsData ||
            !captionsData.playerCaptionsTracklistRenderer ||
            !captionsData.playerCaptionsTracklistRenderer.captionTracks) {
            return null;
        }
        const captionTracks = captionsData.playerCaptionsTracklistRenderer.captionTracks;
        if (captionTracks.length === 0) {
            return null;
        }
        // Get the first available caption track
        const captionTrack = captionTracks[0];
        // Fetch the actual transcript data
        return fetchTranscriptData(captionTrack.baseUrl);
    }
    catch (error) {
        console.error(`❌ [API] Error extracting transcript:`, error);
        return null;
    }
}
// Modify the fetchTranscriptData function to use retry and random user agents
function fetchTranscriptData(baseUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        return withRetry(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const axiosInstance = createAxiosWithProxy();
                const response = yield axiosInstance.get(baseUrl, {
                    headers: {
                        "User-Agent": getRandomUserAgent(),
                        Accept: "application/xml,application/xhtml+xml,text/xml;q=0.9,text/html;q=0.8,*/*;q=0.5",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Accept-Encoding": "gzip, deflate, br",
                        Connection: "keep-alive",
                        "Cache-Control": "no-cache",
                        Pragma: "no-cache",
                    },
                });
                // Parse the XML response
                const transcriptXml = response.data;
                // Extract text segments from the XML
                const textSegments = extractTextFromXml(transcriptXml);
                return textSegments;
            }
            catch (error) {
                console.error(`❌ [API] Error fetching transcript data:`, error);
                throw error;
            }
        }));
    });
}
// Helper function to extract text from XML
function extractTextFromXml(xml) {
    try {
        // This is a simplified parser - you may need to adjust based on the actual XML format
        const textMatches = xml.match(/<text[^>]*>(.*?)<\/text>/g);
        if (!textMatches) {
            return [];
        }
        return textMatches
            .map((match) => {
            const textMatch = match.match(/<text[^>]*>(.*?)<\/text>/);
            if (textMatch && textMatch[1]) {
                return {
                    text: textMatch[1]
                        .replace(/&amp;/g, "&")
                        .replace(/&lt;/g, "<")
                        .replace(/&gt;/g, ">"),
                    start: 0, // You would extract these from the XML attributes in a real implementation
                    duration: 0,
                };
            }
            return null;
        })
            .filter(Boolean);
    }
    catch (error) {
        console.error(`❌ [API] Error parsing transcript XML:`, error);
        return [];
    }
}
// Modify the YouTube API initialization to use proxy
const initializeYouTubeAPI = () => {
    if (!process.env.YOUTUBE_API_KEY) {
        console.error("❌ YOUTUBE_API_KEY is not configured in .env file");
        return null;
    }
    console.log("🔄 Initializing YouTube API with proxy support...");
    // Create a custom HTTP agent with proxy if enabled
    let httpsAgent = null;
    if (USE_PROXY) {
        const proxy = getNextProxy();
        if (proxy) {
            httpsAgent = new HttpsProxyAgent(proxy);
            console.log(`🔄 [PROXY] Using proxy for YouTube API: ${proxy}`);
        }
    }
    // Create a custom YouTube API client with proxy
    const youtube = google.youtube({
        version: "v3",
        auth: process.env.YOUTUBE_API_KEY,
        httpsAgent,
    });
    return youtube;
};
// Function to get transcript using YouTube Data API
const getTranscriptWithYouTubeAPI = (videoId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`🔄 Fetching captions for video: ${videoId} using YouTube API`);
        // First, get the caption tracks for the video
        const response = yield youtube.captions.list({
            key: process.env.YOUTUBE_API_KEY,
            part: ["snippet"],
            videoId: videoId,
        });
        if (!response.data.items || response.data.items.length === 0) {
            console.log("⚠️ No captions found for this video");
            return null;
        }
        // Get the first available caption track
        const captionTrack = response.data.items[0];
        console.log(`✅ Found caption track: ${captionTrack.snippet.name}`);
        // Download the caption track
        const captionResponse = yield youtube.captions.download({
            key: process.env.YOUTUBE_API_KEY,
            id: captionTrack.id,
        });
        // Parse the caption data
        const captionData = captionResponse.data;
        console.log(`✅ Successfully downloaded captions`);
        // Convert to transcript format
        const transcript = parseYouTubeCaptions(captionData);
        return transcript;
    }
    catch (error) {
        console.error("❌ Error fetching transcript with YouTube API:", error);
        return null;
    }
});
// Helper function to parse YouTube captions
const parseYouTubeCaptions = (captionData) => {
    // This is a simplified parser - you may need to adjust based on the actual format
    try {
        // Extract text from caption data
        const textContent = captionData.toString();
        // Remove XML tags and extract just the text
        const cleanText = textContent
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return cleanText;
    }
    catch (error) {
        console.error("❌ Error parsing captions:", error);
        return null;
    }
};
// Initialize YouTube API
const youtubeAPI = initializeYouTubeAPI();
// Function to get transcript using AssemblyAI
const getTranscriptWithAssemblyAI = (videoUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(`🔄 [AssemblyAI] Starting transcription for URL: ${videoUrl}`);
        console.log(`🔑 [AssemblyAI] API Key status: ${ASSEMBLYAI_API_KEY ? "Present" : "Missing"}`);
        if (!ASSEMBLYAI_API_KEY) {
            console.error("❌ [AssemblyAI] API Key is not configured in .env file");
            return null;
        }
        // Validate URL
        try {
            new URL(videoUrl);
            console.log(`✅ [AssemblyAI] URL validation passed: ${videoUrl}`);
        }
        catch (e) {
            console.error(`❌ [AssemblyAI] Invalid URL provided: ${videoUrl}`);
            return null;
        }
        // For YouTube URLs, try to convert to a format AssemblyAI might accept better
        let processedUrl = videoUrl;
        if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
            console.log(`🔍 [AssemblyAI] Detected YouTube URL, attempting to process...`);
            // Extract video ID
            let videoId = "";
            if (videoUrl.includes("youtube.com/watch?v=")) {
                videoId = videoUrl.split("watch?v=")[1].split("&")[0];
                console.log(`🔍 [AssemblyAI] Extracted video ID from watch URL: ${videoId}`);
            }
            else if (videoUrl.includes("youtu.be/")) {
                videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
                console.log(`🔍 [AssemblyAI] Extracted video ID from short URL: ${videoId}`);
            }
            if (videoId) {
                // Try using the embed URL
                processedUrl = `https://www.youtube.com/embed/${videoId}`;
                console.log(`🔄 [AssemblyAI] Converted YouTube URL to: ${processedUrl}`);
            }
            else {
                console.warn(`⚠️ [AssemblyAI] Could not extract video ID from URL: ${videoUrl}`);
            }
        }
        // Step 1: Submit the video URL for transcription
        console.log(`🔄 [AssemblyAI] Submitting URL for transcription: ${processedUrl}`);
        try {
            const submitResponse = yield axios.post("https://api.assemblyai.com/v2/transcript", {
                audio_url: processedUrl,
                language_code: "en",
                auto_highlights: false,
            }, {
                headers: {
                    authorization: ASSEMBLYAI_API_KEY,
                    "content-type": "application/json",
                },
            });
            const transcriptId = submitResponse.data.id;
            console.log(`✅ [AssemblyAI] Video submitted for transcription. ID: ${transcriptId}`);
            console.log(`📊 [AssemblyAI] Full response:`, JSON.stringify(submitResponse.data, null, 2));
            // Step 2: Poll for completion
            let transcript = null;
            let attempts = 0;
            const maxAttempts = 30; // 5 minutes with 10-second intervals
            while (!transcript && attempts < maxAttempts) {
                attempts++;
                console.log(`🔄 [AssemblyAI] Checking transcription status (attempt ${attempts}/${maxAttempts})...`);
                // Wait 10 seconds before checking again
                yield new Promise((resolve) => setTimeout(resolve, 10000));
                try {
                    const statusResponse = yield axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                        headers: {
                            authorization: ASSEMBLYAI_API_KEY,
                        },
                    });
                    const status = statusResponse.data.status;
                    console.log(`📊 [AssemblyAI] Transcription status: ${status}`);
                    if (status === "completed") {
                        transcript = statusResponse.data.text;
                        console.log(`✅ [AssemblyAI] Transcription completed successfully`);
                        console.log(`📊 [AssemblyAI] Transcript length: ${transcript.length} characters`);
                        console.log(`📝 [AssemblyAI] First 100 characters: ${transcript.substring(0, 100)}...`);
                        break;
                    }
                    else if (status === "error") {
                        console.error(`❌ [AssemblyAI] Transcription failed:`, statusResponse.data.error);
                        console.error(`📊 [AssemblyAI] Full error response:`, JSON.stringify(statusResponse.data, null, 2));
                        break;
                    }
                    else {
                        console.log(`⏳ [AssemblyAI] Still processing... Status: ${status}`);
                        if (statusResponse.data.audio_duration) {
                            console.log(`⏱️ [AssemblyAI] Audio duration: ${statusResponse.data.audio_duration} seconds`);
                        }
                    }
                }
                catch (pollError) {
                    console.error(`❌ [AssemblyAI] Error checking transcription status:`, pollError);
                    if (pollError instanceof Error) {
                        console.error(`📊 [AssemblyAI] Error details:`, {
                            name: pollError.name,
                            message: pollError.message,
                            stack: pollError.stack,
                        });
                    }
                    break;
                }
            }
            if (!transcript) {
                console.error(`❌ [AssemblyAI] Transcription timed out or failed after ${attempts} attempts`);
                return null;
            }
            return transcript;
        }
        catch (submitError) {
            console.error(`❌ [AssemblyAI] Error submitting URL for transcription:`, submitError);
            if (submitError instanceof Error) {
                console.error(`📊 [AssemblyAI] Error details:`, {
                    name: submitError.name,
                    message: submitError.message,
                    stack: submitError.stack,
                });
                // Check if it's an Axios error with response data
                if (axios.isAxiosError(submitError)) {
                    const axiosError = submitError;
                    if (axiosError.response) {
                        console.error(`📊 [AssemblyAI] API response:`, JSON.stringify(axiosError.response.data, null, 2));
                    }
                }
            }
            return null;
        }
    }
    catch (error) {
        console.error(`❌ [AssemblyAI] Unexpected error:`, error);
        if (error instanceof Error) {
            console.error(`📊 [AssemblyAI] Error details:`, {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        }
        return null;
    }
});
// ✅ Start the server
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
});
// ✅ Root Route
app.get("/", (req, res) => {
    console.log("📢 Root route hit: GET /");
    res.send("YouTube Summarizer API is running...");
});
// ✅ Get Transcript
app.get("/transcript/:videoId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const videoId = req.params.videoId;
    console.log(`📥 Received request for transcript of video: ${videoId}`);
    if (!videoId) {
        console.warn("⚠️ No video ID provided!");
        return res.status(400).json({ error: "No video ID provided" });
    }
    try {
        // Try multiple methods to get the transcript
        let transcript = null;
        let segments = [];
        // Method 1: Try with YouTube Transcript API
        try {
            console.log("🔄 Attempting to fetch transcript with YouTube Transcript API...");
            const directTranscript = yield getTranscript(videoId, {
                lang: "en",
                country: "US",
            });
            if (directTranscript && directTranscript.length > 0) {
                transcript = directTranscript
                    .map((segment) => segment.text)
                    .join(" ");
                segments = directTranscript;
                console.log("✅ Successfully fetched transcript with YouTube Transcript API");
            }
        }
        catch (directError) {
            console.warn("⚠️ YouTube Transcript API method failed:", directError.message);
        }
        // Method 2: Try with YouTube Data API if first method failed
        if (!transcript && youtubeAPI) {
            console.log("🔄 Attempting to fetch transcript with YouTube Data API...");
            const apiTranscript = yield getTranscriptWithYouTubeAPI(videoId);
            if (apiTranscript) {
                transcript = apiTranscript;
                console.log("✅ Successfully fetched transcript with YouTube API method");
            }
        }
        // Check if we got a transcript from any method
        if (!transcript) {
            console.warn("⚠️ No transcript found with any method");
            return res.status(404).json({
                error: "No transcript found",
                details: "The video might not have captions available or all methods failed",
            });
        }
        console.log(`📝 Transcript length: ${transcript.length} characters`);
        console.log(`📝 First 100 characters: ${transcript.substring(0, 100)}...`);
        res.json({
            transcript: transcript,
            segments: segments,
        });
    }
    catch (error) {
        console.error(`❌ Error fetching transcript:`, error);
        if (error instanceof Error) {
            console.error("Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        }
        // Provide more specific error messages
        let errorMessage = "Failed to fetch transcript";
        let errorDetails = "";
        if (error instanceof Error) {
            if (error.message.includes("Could not get transcripts")) {
                errorMessage = "No captions available";
                errorDetails = "This video might not have captions available";
            }
            else if (error.message.includes("blocked")) {
                errorMessage = "Access blocked";
                errorDetails = "YouTube blocked the request. Try again later";
            }
        }
        res.status(500).json({
            error: errorMessage,
            details: errorDetails ||
                (error instanceof Error ? error.message : "Unknown error"),
        });
    }
}));
// Add this function after the imports
function updateApiStats(api, success, error) {
    try {
        const stats = JSON.parse(fs.readFileSync(API_STATS_FILE, "utf8"));
        if (!stats[api]) {
            stats[api] = {
                totalRequests: 0,
                successfulRequests: 0,
                failedRequests: 0,
                lastError: null,
                lastErrorTime: null,
            };
        }
        stats[api].totalRequests++;
        if (success) {
            stats[api].successfulRequests++;
        }
        else {
            stats[api].failedRequests++;
            stats[api].lastError = (error === null || error === void 0 ? void 0 : error.message) || "Unknown error";
            stats[api].lastErrorTime = new Date().toISOString();
        }
        fs.writeFileSync(API_STATS_FILE, JSON.stringify(stats, null, 2));
    }
    catch (err) {
        console.error("Error updating API stats:", err);
    }
}
// Add this function to log API requests
function logApiRequest(api, requestDetails) {
    const logFile = path.join(LOG_DIR, `${api}_requests.log`);
    const timestamp = new Date().toISOString();
    const logEntry = Object.assign({ timestamp }, requestDetails);
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
}
// Modify the transcript URL endpoint to use the improved methods
app.post("/transcript/url", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { videoUrl } = req.body;
    const requestId = Math.random().toString(36).substring(2, 15);
    console.log(`📥 [API] [${requestId}] Received request for transcript of video URL: ${videoUrl}`);
    if (!videoUrl) {
        console.warn(`⚠️ [API] [${requestId}] No video URL provided!`);
        return res.status(400).json({ error: "No video URL provided" });
    }
    try {
        // Check if it's a YouTube URL
        if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
            console.log(`🔍 [API] [${requestId}] Detected YouTube URL, extracting video ID...`);
            // Extract video ID
            let videoId = "";
            if (videoUrl.includes("youtube.com/watch?v=")) {
                videoId = videoUrl.split("watch?v=")[1].split("&")[0];
                console.log(`🔍 [API] [${requestId}] Extracted video ID from watch URL: ${videoId}`);
            }
            else if (videoUrl.includes("youtu.be/")) {
                videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
                console.log(`🔍 [API] [${requestId}] Extracted video ID from short URL: ${videoId}`);
            }
            else if (videoUrl.includes("youtube.com/embed/")) {
                videoId = videoUrl.split("embed/")[1].split("?")[0];
                console.log(`🔍 [API] [${requestId}] Extracted video ID from embed URL: ${videoId}`);
            }
            if (videoId) {
                console.log(`🔍 [API] [${requestId}] Extracted video ID: ${videoId}`);
                // Try with YouTube Data API first (official method)
                try {
                    console.log(`🔄 [API] [${requestId}] Attempting to fetch transcript with YouTube Data API...`);
                    // Log the request
                    logApiRequest("youtubeApi", {
                        requestId,
                        videoId,
                        method: "videos.list",
                        timestamp: new Date().toISOString(),
                    });
                    // Check if YouTube API is initialized
                    if (!process.env.YOUTUBE_API_KEY) {
                        console.warn(`⚠️ [API] [${requestId}] YouTube API key is not configured`);
                        updateApiStats("youtubeApi", false, new Error("YouTube API key is not configured"));
                        throw new Error("YouTube API key is not configured");
                    }
                    // Get video details first to check if captions are available
                    const videoResponse = yield withRetry(() => __awaiter(void 0, void 0, void 0, function* () {
                        return yield youtube.videos.list({
                            key: process.env.YOUTUBE_API_KEY,
                            part: ["contentDetails"],
                            id: [videoId],
                        });
                    }));
                    if (!videoResponse.data.items ||
                        videoResponse.data.items.length === 0) {
                        updateApiStats("youtubeApi", false, new Error("Video not found"));
                        throw new Error("Video not found");
                    }
                    // Log the captions request
                    logApiRequest("youtubeApi", {
                        requestId,
                        videoId,
                        method: "captions.list",
                        timestamp: new Date().toISOString(),
                    });
                    // Get captions
                    const captionsResponse = yield withRetry(() => __awaiter(void 0, void 0, void 0, function* () {
                        return yield youtube.captions.list({
                            key: process.env.YOUTUBE_API_KEY,
                            part: ["snippet"],
                            videoId: videoId,
                        });
                    }));
                    if (!captionsResponse.data.items ||
                        captionsResponse.data.items.length === 0) {
                        console.warn(`⚠️ [API] [${requestId}] No captions found for this video using YouTube Data API`);
                        updateApiStats("youtubeApi", false, new Error("No captions available for this video"));
                        throw new Error("No captions available for this video");
                    }
                    // Get the first available caption track
                    const captionId = captionsResponse.data.items[0].id;
                    // Log the caption download request
                    logApiRequest("youtubeApi", {
                        requestId,
                        videoId,
                        captionId,
                        method: "captions.download",
                        timestamp: new Date().toISOString(),
                    });
                    // Download the caption
                    const captionDownloadResponse = yield withRetry(() => __awaiter(void 0, void 0, void 0, function* () {
                        return yield youtube.captions.download({
                            key: process.env.YOUTUBE_API_KEY,
                            id: captionId,
                        });
                    }));
                    // Process the caption data
                    const captionData = captionDownloadResponse.data;
                    // Convert to transcript format
                    const transcript = processYouTubeCaptionData(captionData);
                    if (transcript) {
                        console.log(`✅ [API] [${requestId}] Successfully fetched transcript with YouTube Data API`);
                        console.log(`📝 [API] [${requestId}] Transcript length: ${transcript.length} characters`);
                        updateApiStats("youtubeApi", true);
                        return res.json({
                            transcript: transcript,
                            source: "youtube-data-api",
                        });
                    }
                }
                catch (youtubeApiError) {
                    console.warn(`⚠️ [API] [${requestId}] YouTube Data API method failed:`, youtubeApiError.message);
                    updateApiStats("youtubeApi", false, youtubeApiError);
                    // Fall back to youtube-transcript-api with proxy
                    try {
                        console.log(`🔄 [API] [${requestId}] Falling back to YouTube Transcript API with proxy...`);
                        // Log the request
                        logApiRequest("youtubeTranscriptApi", {
                            requestId,
                            videoId,
                            timestamp: new Date().toISOString(),
                        });
                        // Use our proxy-enabled transcript fetcher
                        const directTranscript = yield getTranscriptWithProxy(videoId, {
                            lang: "en",
                            country: "US",
                        });
                        if (directTranscript && directTranscript.length > 0) {
                            const transcript = directTranscript
                                .map((segment) => segment.text)
                                .join(" ");
                            console.log(`✅ [API] [${requestId}] Successfully fetched transcript with YouTube Transcript API`);
                            console.log(`📝 [API] [${requestId}] Transcript length: ${transcript.length} characters`);
                            updateApiStats("youtubeTranscriptApi", true);
                            return res.json({
                                transcript: transcript,
                                segments: directTranscript,
                                source: "youtube-transcript-api",
                            });
                        }
                    }
                    catch (directError) {
                        console.warn(`⚠️ [API] [${requestId}] YouTube Transcript API method failed:`, directError.message);
                        updateApiStats("youtubeTranscriptApi", false, directError);
                    }
                }
            }
        }
        // If YouTube methods failed or it's not a YouTube URL, try AssemblyAI
        console.log(`🔄 [API] [${requestId}] Attempting to get transcript with AssemblyAI...`);
        // Log the request
        logApiRequest("assemblyAI", {
            requestId,
            videoUrl,
            timestamp: new Date().toISOString(),
        });
        const transcript = yield getTranscriptWithAssemblyAI(videoUrl);
        if (!transcript) {
            console.warn(`⚠️ [API] [${requestId}] No transcript found with any method`);
            updateApiStats("assemblyAI", false, new Error("No transcript found"));
            return res.status(404).json({
                error: "No transcript found",
                details: "Failed to transcribe the video. The video might not be accessible or the transcription service might be unavailable.",
            });
        }
        console.log(`✅ [API] [${requestId}] Successfully retrieved transcript from AssemblyAI`);
        console.log(`📝 [API] [${requestId}] Transcript length: ${transcript.length} characters`);
        console.log(`📝 [API] [${requestId}] First 100 characters: ${transcript.substring(0, 100)}...`);
        updateApiStats("assemblyAI", true);
        res.json({
            transcript: transcript,
            source: "assemblyai",
        });
    }
    catch (error) {
        console.error(`❌ [API] [${requestId}] Error processing video URL:`, error);
        if (error instanceof Error) {
            console.error(`📊 [API] [${requestId}] Error details:`, {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        }
        res.status(500).json({
            error: "Failed to process video URL",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}));
// Add a new endpoint to get API statistics
app.get("/api/stats", (req, res) => {
    try {
        const stats = JSON.parse(fs.readFileSync(API_STATS_FILE, "utf8"));
        res.json(stats);
    }
    catch (error) {
        console.error("Error reading API stats:", error);
        res.status(500).json({ error: "Failed to read API statistics" });
    }
});
// Helper function to process YouTube caption data
function processYouTubeCaptionData(captionData) {
    try {
        // This is a simplified parser - you may need to adjust based on the actual format
        // Extract text from caption data
        const textContent = captionData.toString();
        // Remove XML tags and extract just the text
        const cleanText = textContent
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return cleanText;
    }
    catch (error) {
        console.error("❌ Error parsing captions:", error);
        return "";
    }
}
// ✅ Summarize Transcript with Gemini
app.post("/summarize", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const transcript = req.body.transcript;
    console.log(`📥 Received request to summarize transcript: ${transcript
        ? transcript.substring(0, 30) + "..."
        : "No transcript received"}`);
    if (!transcript) {
        console.warn("⚠️ No transcript provided in request body!");
        return res.status(400).json({ error: "No transcript provided" });
    }
    try {
        console.log("🔄 Starting Gemini summarization process...");
        console.log(`📝 Transcript length: ${transcript.length} characters`);
        // Process transcript for Gemini
        let processedTranscript = transcript;
        const maxLength = 30000;
        if (transcript.length > maxLength) {
            processedTranscript =
                transcript.substring(0, maxLength / 2) +
                    "..." +
                    transcript.substring(transcript.length - maxLength / 2);
            console.log("📊 Truncated long transcript for Gemini");
        }
        const prompt = `Please provide a concise summary of this video transcript in 3-4 sentences: ${processedTranscript}`;
        const result = yield geminiModel.generateContent(prompt);
        console.log("✅ Received response from Gemini");
        const response = yield result.response;
        console.log("✅ Got response object");
        const summary = response.text();
        console.log("✅ Extracted summary text");
        if (!summary || summary.trim() === "") {
            throw new Error("Empty summary received from Gemini API");
        }
        console.log(`✅ Summary length: ${summary.length} characters`);
        console.log(`📝 Summary: ${summary}`);
        res.json({ summary });
    }
    catch (error) {
        console.error("❌ Summarization error:", error);
        if (error instanceof Error) {
            console.error("Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
        }
        res.status(500).json({
            error: "Failed to generate summary",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}));
// ✅ Test Gemini Connection
app.get("/test/gemini", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("📝 Testing Gemini AI connection...");
    try {
        const testPrompt = "Hello! Please respond with a short greeting.";
        const result = yield geminiModel.generateContent(testPrompt);
        const response = yield result.response;
        const text = response.text();
        console.log("✅ Gemini AI test successful!");
        res.json({
            status: "success",
            message: "Gemini AI is working correctly",
            response: text,
        });
    }
    catch (error) {
        console.error("❌ Gemini AI test failed:", error);
        res.status(500).json({
            status: "error",
            error: "Failed to connect to Gemini AI",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
}));
// Add a new endpoint to check proxy status
app.get("/api/proxy-status", (req, res) => {
    res.json({
        useProxy: USE_PROXY,
        proxyCount: PROXY_LIST.length,
        currentProxyIndex,
        proxies: PROXY_LIST.map((proxy, index) => ({
            index,
            url: proxy,
            isActive: index === currentProxyIndex,
        })),
    });
});
// Add a new endpoint to manually rotate proxies
app.post("/api/rotate-proxy", (req, res) => {
    if (!USE_PROXY || PROXY_LIST.length === 0) {
        return res.status(400).json({
            error: "Proxy rotation is not enabled or no proxies configured",
        });
    }
    currentProxyIndex = (currentProxyIndex + 1) % PROXY_LIST.length;
    res.json({
        message: "Proxy rotated successfully",
        newProxyIndex: currentProxyIndex,
        newProxy: PROXY_LIST[currentProxyIndex],
    });
});
// Routes for video notes
app.post("/api/videos/save", saveVideoNote);
app.get("/api/videos/notes", getVideoNotes);

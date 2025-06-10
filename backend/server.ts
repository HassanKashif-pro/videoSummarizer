const { getTranscript } = require("youtube-transcript-api");
const { CohereClient } = require('cohere-ai');
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
const connectMongoDB = require("./config/database");
const {
  saveVideoNote,
  getVideoNotes,
  getVideoNote,
  deleteVideoNote,
  updateVideoCategory,
  deleteVideo,
  renameVideo,
} = require("./controllers/videoController");

// Add type for Cohere client
type CohereClient = any; // You can replace this with proper type if available

// Initialize APIs and constants
const youtube = google.youtube("v3");
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const app = express();
const PORT = process.env.PORT || 3001;

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
  fs.writeFileSync(
    API_STATS_FILE,
    JSON.stringify({
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
    })
  );
}

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
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(
        `⚠️ [RETRY] Attempt ${attempt + 1}/${maxRetries} failed:`,
        error
      );

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`⏱️ [RETRY] Waiting ${delay}ms before retrying...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Update the rate limit constants for Cohere
const COHERE_RATE_LIMIT = {
  requestsPerMinute: 20, // Reduced from 100 to be more conservative
  tokensPerMinute: 20000, // Reduced from 100000 to be more conservative
  requests: [] as number[],
  tokens: [] as number[],
  maxInputLength: 25000, // Maximum input length in characters
  maxOutputTokens: 150, // Maximum output tokens for summaries
};

// Function to check rate limits
function checkCohereRateLimit(inputTokens = 0) {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Clean up old requests
  COHERE_RATE_LIMIT.requests = COHERE_RATE_LIMIT.requests.filter(time => time > oneMinuteAgo);
  COHERE_RATE_LIMIT.tokens = COHERE_RATE_LIMIT.tokens.filter(time => time > oneMinuteAgo);
  
  // Check limits
  if (COHERE_RATE_LIMIT.requests.length >= COHERE_RATE_LIMIT.requestsPerMinute) {
    throw new Error(`Cohere API request rate limit exceeded (${COHERE_RATE_LIMIT.requestsPerMinute} requests/minute). Please wait.`);
  }
  
  if (COHERE_RATE_LIMIT.tokens.length + inputTokens >= COHERE_RATE_LIMIT.tokensPerMinute) {
    throw new Error(`Cohere API token rate limit exceeded (${COHERE_RATE_LIMIT.tokensPerMinute} tokens/minute). Please wait.`);
  }
  
  // Add current request
  COHERE_RATE_LIMIT.requests.push(now);
  for (let i = 0; i < inputTokens; i++) {
    COHERE_RATE_LIMIT.tokens.push(now);
  }
}

// Helper function to truncate text while preserving meaning
function smartTruncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Split into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let result = '';
  let midPoint = Math.floor(sentences.length / 2);
  
  // Take some sentences from start and end
  const startSentences = sentences.slice(0, midPoint).join(' ');
  const endSentences = sentences.slice(-midPoint).join(' ');
  
  result = startSentences + ' ... ' + endSentences;
  
  // If still too long, do a hard truncate
  if (result.length > maxLength) {
    const halfLength = Math.floor(maxLength / 2) - 10;
    result = text.substring(0, halfLength) + ' ... ' + text.substring(text.length - halfLength);
  }
  
  return result;
}

// Initialize Cohere AI
let cohereClient: CohereClient;
try {
  if (!process.env.COHERE_API_KEY) {
    throw new Error("COHERE_API_KEY is not configured in .env file");
  }
  console.log("🔄 Initializing Cohere AI client...");
  cohereClient = new CohereClient({ 
    token: process.env.COHERE_API_KEY 
  });
  console.log("✅ Cohere AI client initialized");
} catch (error) {
  console.error("❌ Failed to initialize Cohere AI:", error);
  if (error instanceof Error) {
    console.error("Error message:", error.message);
  }
  process.exit(1);
}

// Initialize database connections
connectDB().catch(console.error);
connectMongoDB().catch(console.error);

// Add environment variable validation
console.log("🔍 Checking environment variables...");
const requiredEnvVars = {
  COHERE_API_KEY: process.env.COHERE_API_KEY,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  ASSEMBLYAI_API_KEY: process.env.ASSEMBLYAI_API_KEY,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.warn("⚠️ Missing environment variables:", missingVars.join(", "));
  console.warn("⚠️ Some features may not work properly without these API keys");
} else {
  console.log("✅ All required environment variables are configured");
}

// Validate API keys format (basic check)
if (process.env.YOUTUBE_API_KEY && !process.env.YOUTUBE_API_KEY.startsWith('AIza')) {
  console.warn("⚠️ YouTube API key format looks incorrect (should start with 'AIza')");
}

if (process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.length < 20) {
  console.warn("⚠️ Cohere API key looks too short");
}

app.use(cors({ 
  origin: ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-user-data']
}));
app.use(express.json({ limit: '50mb' })); // Increased limit for image uploads
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Also handle URL-encoded data

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
async function getTranscriptWithProxy(videoId: string, options: any = {}) {
  return withRetry(async () => {
    try {
      console.log(
        `🔄 [API] Attempting to fetch transcript with proxy support...`
      );

      // Create axios instance with proxy
      const axiosInstance = createAxiosWithProxy();

      // Use the proxy-enabled axios instance with random user agent
      const response = await axiosInstance.get(
        `https://www.youtube.com/watch?v=${videoId}`,
        {
          headers: {
            "User-Agent": getRandomUserAgent(),
            "Accept-Language": "en-US,en;q=0.9",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
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
        }
      );

      // Extract the transcript data from the response
      const transcriptData = extractTranscriptFromResponse(response.data);

      if (!transcriptData) {
        throw new Error("Could not extract transcript data from response");
      }

      return transcriptData;
    } catch (error) {
      console.error(`❌ [API] Error fetching transcript with proxy:`, error);
      throw error;
    }
  });
}

// Helper function to extract transcript from YouTube response
function extractTranscriptFromResponse(htmlContent: string) {
  try {
    // This is a simplified extractor - you may need to adjust based on YouTube's actual HTML structure
    const transcriptMatch = htmlContent.match(/"captions":\s*({[^}]+})/);

    if (!transcriptMatch) {
      return null;
    }

    const captionsData = JSON.parse(transcriptMatch[1]);

    if (
      !captionsData ||
      !captionsData.playerCaptionsTracklistRenderer ||
      !captionsData.playerCaptionsTracklistRenderer.captionTracks
    ) {
      return null;
    }

    const captionTracks =
      captionsData.playerCaptionsTracklistRenderer.captionTracks;

    if (captionTracks.length === 0) {
      return null;
    }

    // Get the first available caption track
    const captionTrack = captionTracks[0];

    // Fetch the actual transcript data
    return fetchTranscriptData(captionTrack.baseUrl);
  } catch (error) {
    console.error(`❌ [API] Error extracting transcript:`, error);
    return null;
  }
}

// Modify the fetchTranscriptData function to use retry and random user agents
async function fetchTranscriptData(baseUrl: string) {
  return withRetry(async () => {
    try {
      const axiosInstance = createAxiosWithProxy();

      const response = await axiosInstance.get(baseUrl, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          Accept:
            "application/xml,application/xhtml+xml,text/xml;q=0.9,text/html;q=0.8,*/*;q=0.5",
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
    } catch (error) {
      console.error(`❌ [API] Error fetching transcript data:`, error);
      throw error;
    }
  });
}

// Helper function to extract text from XML
function extractTextFromXml(xml: string) {
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
  } catch (error) {
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
const getTranscriptWithYouTubeAPI = async (videoId: string) => {
  try {
    console.log(`🔄 Fetching captions for video: ${videoId} using YouTube API`);

    if (!youtubeAPI) {
      console.warn("⚠️ YouTube API is not initialized, skipping...");
      return null;
    }

    // First, get the caption tracks for the video
    const response = await youtube.captions.list({
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
    const captionResponse = await youtube.captions.download({
      key: process.env.YOUTUBE_API_KEY,
      id: captionTrack.id,
    });

    // Parse the caption data
    const captionData = captionResponse.data;
    console.log(`✅ Successfully downloaded captions`);

    // Convert to transcript format
    const transcript = parseYouTubeCaptions(captionData);
    return transcript;
  } catch (error) {
    console.error("❌ Error fetching transcript with YouTube API:", error);
    
    // Don't expose API keys in error logs
    if (error instanceof Error && error.message) {
      const sanitizedMessage = error.message.replace(/key=[^&\s]+/g, 'key=***HIDDEN***');
      console.error("❌ Sanitized error message:", sanitizedMessage);
    }
    
    // Check if it's a 403 error (API key issue)
    if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
      console.error("❌ YouTube API returned 403 Forbidden. This usually means:");
      console.error("   - API key is invalid or expired");
      console.error("   - API key doesn't have YouTube Data API v3 enabled");
      console.error("   - Quota exceeded");
      console.error("   - API key restrictions (IP, referrer, etc.)");
    }
    
    return null;
  }
};

// Helper function to parse YouTube captions
const parseYouTubeCaptions = (captionData: any) => {
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
  } catch (error) {
    console.error("❌ Error parsing captions:", error);
    return null;
  }
};

// Initialize YouTube API
const youtubeAPI = initializeYouTubeAPI();

// Function to get transcript using AssemblyAI
const getTranscriptWithAssemblyAI = async (videoUrl: string) => {
  try {
    console.log(`🔄 [AssemblyAI] Starting transcription for URL: ${videoUrl}`);
    console.log(
      `🔑 [AssemblyAI] API Key status: ${
        ASSEMBLYAI_API_KEY ? "Present" : "Missing"
      }`
    );

    if (!ASSEMBLYAI_API_KEY) {
      console.error("❌ [AssemblyAI] API Key is not configured in .env file");
      return null;
    }

    // Validate URL
    try {
      new URL(videoUrl);
      console.log(`✅ [AssemblyAI] URL validation passed: ${videoUrl}`);
    } catch (e) {
      console.error(`❌ [AssemblyAI] Invalid URL provided: ${videoUrl}`);
      return null;
    }

    // For YouTube URLs, try to convert to a format AssemblyAI might accept better
    let processedUrl = videoUrl;
    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      console.log(
        `🔍 [AssemblyAI] Detected YouTube URL, attempting to process...`
      );

      // Extract video ID
      let videoId = "";
      if (videoUrl.includes("youtube.com/watch?v=")) {
        videoId = videoUrl.split("watch?v=")[1].split("&")[0];
        console.log(
          `🔍 [AssemblyAI] Extracted video ID from watch URL: ${videoId}`
        );
      } else if (videoUrl.includes("youtu.be/")) {
        videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
        console.log(
          `🔍 [AssemblyAI] Extracted video ID from short URL: ${videoId}`
        );
      }

      if (videoId) {
        // Try using the embed URL
        processedUrl = `https://www.youtube.com/embed/${videoId}`;
        console.log(
          `🔄 [AssemblyAI] Converted YouTube URL to: ${processedUrl}`
        );
      } else {
        console.warn(
          `⚠️ [AssemblyAI] Could not extract video ID from URL: ${videoUrl}`
        );
      }
    }

    // Step 1: Submit the video URL for transcription
    console.log(
      `🔄 [AssemblyAI] Submitting URL for transcription: ${processedUrl}`
    );
    try {
      const submitResponse = await axios.post(
        "https://api.assemblyai.com/v2/transcript",
        {
          audio_url: processedUrl,
          language_code: "en",
          auto_highlights: false,
        },
        {
          headers: {
            authorization: ASSEMBLYAI_API_KEY,
            "content-type": "application/json",
          },
        }
      );

      const transcriptId = submitResponse.data.id;
      console.log(
        `✅ [AssemblyAI] Video submitted for transcription. ID: ${transcriptId}`
      );
      console.log(
        `📊 [AssemblyAI] Full response:`,
        JSON.stringify(submitResponse.data, null, 2)
      );

      // Step 2: Poll for completion
      let transcript = null;
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes with 10-second intervals

      while (!transcript && attempts < maxAttempts) {
        attempts++;
        console.log(
          `🔄 [AssemblyAI] Checking transcription status (attempt ${attempts}/${maxAttempts})...`
        );

        // Wait 10 seconds before checking again
        await new Promise((resolve) => setTimeout(resolve, 10000));

        try {
          const statusResponse = await axios.get(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            {
              headers: {
                authorization: ASSEMBLYAI_API_KEY,
              },
            }
          );

          const status = statusResponse.data.status;
          console.log(`📊 [AssemblyAI] Transcription status: ${status}`);

          if (status === "completed") {
            transcript = statusResponse.data.text;
            console.log(`✅ [AssemblyAI] Transcription completed successfully`);
            console.log(
              `📊 [AssemblyAI] Transcript length: ${transcript.length} characters`
            );
            console.log(
              `📝 [AssemblyAI] First 100 characters: ${transcript.substring(
                0,
                100
              )}...`
            );
            break;
          } else if (status === "error") {
            console.error(
              `❌ [AssemblyAI] Transcription failed:`,
              statusResponse.data.error
            );
            console.error(
              `📊 [AssemblyAI] Full error response:`,
              JSON.stringify(statusResponse.data, null, 2)
            );
            break;
          } else {
            console.log(
              `⏳ [AssemblyAI] Still processing... Status: ${status}`
            );
            if (statusResponse.data.audio_duration) {
              console.log(
                `⏱️ [AssemblyAI] Audio duration: ${statusResponse.data.audio_duration} seconds`
              );
            }
          }
        } catch (pollError) {
          console.error(
            `❌ [AssemblyAI] Error checking transcription status:`,
            pollError
          );
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
        console.error(
          `❌ [AssemblyAI] Transcription timed out or failed after ${attempts} attempts`
        );
        return null;
      }

      return transcript;
    } catch (submitError) {
      console.error(
        `❌ [AssemblyAI] Error submitting URL for transcription:`,
        submitError
      );
      if (submitError instanceof Error) {
        console.error(`📊 [AssemblyAI] Error details:`, {
          name: submitError.name,
          message: submitError.message,
          stack: submitError.stack,
        });
        // Check if it's an Axios error with response data
        if (axios.isAxiosError(submitError)) {
          const axiosError = submitError as import("axios").AxiosError;
          if (axiosError.response) {
            console.error(
              `📊 [AssemblyAI] API response:`,
              JSON.stringify(axiosError.response.data, null, 2)
            );
          }
        }
      }
      return null;
    }
  } catch (error) {
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
};

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

// ✅ Root Route
app.get("/", (req: any, res: { send: (arg0: string) => void }) => {
  console.log("📢 Root route hit: GET /");
  res.send("YouTube Summarizer API is running...");
});

// ✅ Get Transcript
app.get(
  "/transcript/:videoId",
  async (
    req: { params: { videoId: string } },
    res: {
      status: (arg0: number) => {
        (): any;
        new (): any;
        json: {
          (arg0: { error: string; details?: string }): void;
          new (): any;
        };
      };
      json: (arg0: { transcript: string; segments: any[] }) => void;
    }
  ) => {
    const videoId = req.params.videoId;
    console.log(`📥 Received request for transcript of video: ${videoId}`);

    if (!videoId) {
      console.warn("⚠️ No video ID provided!");
      return res.status(400).json({ error: "No video ID provided" });
    }

    try {
      // Try multiple methods to get the transcript
      let transcript = null;
      let segments: any[] = [];

      // Method 1: Try with YouTube Transcript API
      try {
        console.log(
          "🔄 Attempting to fetch transcript with YouTube Transcript API..."
        );
        const directTranscript = await getTranscript(videoId, {
          lang: "en",
          country: "US",
        });

        if (directTranscript && directTranscript.length > 0) {
          transcript = directTranscript
            .map((segment: any) => segment.text)
            .join(" ");
          segments = directTranscript;
          console.log(
            "✅ Successfully fetched transcript with YouTube Transcript API"
          );
        }
      } catch (directError: any) {
        console.warn(
          "⚠️ YouTube Transcript API method failed:",
          directError.message
        );
      }

      // Method 2: Try with YouTube Data API if first method failed
      if (!transcript && youtubeAPI) {
        console.log(
          "🔄 Attempting to fetch transcript with YouTube Data API..."
        );
        const apiTranscript = await getTranscriptWithYouTubeAPI(videoId);

        if (apiTranscript) {
          transcript = apiTranscript;
          console.log(
            "✅ Successfully fetched transcript with YouTube API method"
          );
        }
      }

      // Check if we got a transcript from any method
      if (!transcript) {
        console.warn("⚠️ No transcript found with any method");
        return res.status(404).json({
          error: "No transcript found",
          details:
            "The video might not have captions available or all methods failed",
        });
      }

      console.log(`📝 Transcript length: ${transcript.length} characters`);
      console.log(
        `📝 First 100 characters: ${transcript.substring(0, 100)}...`
      );

      res.json({
        transcript: transcript,
        segments: segments,
      });
    } catch (error) {
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
        } else if (error.message.includes("blocked")) {
          errorMessage = "Access blocked";
          errorDetails = "YouTube blocked the request. Try again later";
        }
      }

      res.status(500).json({
        error: errorMessage,
        details:
          errorDetails ||
          (error instanceof Error ? error.message : "Unknown error"),
      });
    }
  }
);

// Add this function after the imports
function updateApiStats(api: string, success: boolean, error?: any) {
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
    } else {
      stats[api].failedRequests++;
      stats[api].lastError = error?.message || "Unknown error";
      stats[api].lastErrorTime = new Date().toISOString();
    }

    fs.writeFileSync(API_STATS_FILE, JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("Error updating API stats:", err);
  }
}

// Add this function to log API requests
function logApiRequest(api: string, requestDetails: any) {
  const logFile = path.join(LOG_DIR, `${api}_requests.log`);
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    ...requestDetails,
  };

  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n");
}

// Modify the transcript URL endpoint to use the improved methods
app.post("/transcript/url", async (req: any, res: any) => {
  const { videoUrl } = req.body;
  const requestId = Math.random().toString(36).substring(2, 15);

  console.log(
    `📥 [API] [${requestId}] Received request for transcript of video URL: ${videoUrl}`
  );

  if (!videoUrl) {
    console.warn(`⚠️ [API] [${requestId}] No video URL provided!`);
    return res.status(400).json({ error: "No video URL provided" });
  }

  try {
    // Check if it's a YouTube URL
    if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
      console.log(
        `🔍 [API] [${requestId}] Detected YouTube URL, extracting video ID...`
      );

      // Extract video ID
      let videoId = "";
      if (videoUrl.includes("youtube.com/watch?v=")) {
        videoId = videoUrl.split("watch?v=")[1].split("&")[0];
        console.log(
          `🔍 [API] [${requestId}] Extracted video ID from watch URL: ${videoId}`
        );
      } else if (videoUrl.includes("youtu.be/")) {
        videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
        console.log(
          `🔍 [API] [${requestId}] Extracted video ID from short URL: ${videoId}`
        );
      } else if (videoUrl.includes("youtube.com/embed/")) {
        videoId = videoUrl.split("embed/")[1].split("?")[0];
        console.log(
          `🔍 [API] [${requestId}] Extracted video ID from embed URL: ${videoId}`
        );
      }

      if (videoId) {
        console.log(`🔍 [API] [${requestId}] Extracted video ID: ${videoId}`);

        // Try with YouTube Data API first (official method)
        try {
          console.log(
            `🔄 [API] [${requestId}] Attempting to fetch transcript with YouTube Data API...`
          );

          // Log the request
          logApiRequest("youtubeApi", {
            requestId,
            videoId,
            method: "videos.list",
            timestamp: new Date().toISOString(),
          });

          // Check if YouTube API is initialized
          if (!process.env.YOUTUBE_API_KEY) {
            console.warn(
              `⚠️ [API] [${requestId}] YouTube API key is not configured`
            );
            updateApiStats(
              "youtubeApi",
              false,
              new Error("YouTube API key is not configured")
            );
            throw new Error("YouTube API key is not configured");
          }

          if (!youtubeAPI) {
            console.warn(
              `⚠️ [API] [${requestId}] YouTube API is not initialized`
            );
            updateApiStats(
              "youtubeApi",
              false,
              new Error("YouTube API is not initialized")
            );
            throw new Error("YouTube API is not initialized");
          }

          // Get video details first to check if captions are available
          const videoResponse = await withRetry(async () => {
            return await youtube.videos.list({
              key: process.env.YOUTUBE_API_KEY,
              part: ["snippet", "contentDetails"],
              id: [videoId],
            });
          });

          if (
            !videoResponse.data.items ||
            videoResponse.data.items.length === 0
          ) {
            updateApiStats("youtubeApi", false, new Error("Video not found"));
            throw new Error("Video not found or not accessible");
          }

          console.log(`✅ [API] [${requestId}] Video found: ${videoResponse.data.items[0].snippet?.title || 'Unknown title'}`);

          // Log the captions request
          logApiRequest("youtubeApi", {
            requestId,
            videoId,
            method: "captions.list",
            timestamp: new Date().toISOString(),
          });

          // Get captions
          const captionsResponse = await withRetry(async () => {
            return await youtube.captions.list({
              key: process.env.YOUTUBE_API_KEY,
              part: ["snippet"],
              videoId: videoId,
            });
          });

          if (
            !captionsResponse.data.items ||
            captionsResponse.data.items.length === 0
          ) {
            console.warn(
              `⚠️ [API] [${requestId}] No captions found for this video using YouTube Data API`
            );
            updateApiStats(
              "youtubeApi",
              false,
              new Error("No captions available for this video")
            );
            throw new Error("No captions available for this video");
          }

          // Get the first available caption track
          const captionId = captionsResponse.data.items[0].id;
          console.log(`✅ [API] [${requestId}] Found caption track: ${captionsResponse.data.items[0].snippet?.name || 'Unknown'}`);

          // Log the caption download request
          logApiRequest("youtubeApi", {
            requestId,
            videoId,
            captionId,
            method: "captions.download",
            timestamp: new Date().toISOString(),
          });

          // Download the caption
          const captionDownloadResponse = await withRetry(async () => {
            return await youtube.captions.download({
              key: process.env.YOUTUBE_API_KEY,
              id: captionId,
              tfmt: 'srt', // Request SRT format for easier parsing
            });
          });

          // Process the caption data
          const captionData = captionDownloadResponse.data;

          // Convert to transcript format
          const transcript = processYouTubeCaptionData(captionData);

          if (transcript) {
            console.log(
              `✅ [API] [${requestId}] Successfully fetched transcript with YouTube Data API`
            );
            console.log(
              `📝 [API] [${requestId}] Transcript length: ${transcript.length} characters`
            );

            updateApiStats("youtubeApi", true);

            return res.json({
              transcript: transcript,
              source: "youtube-data-api",
            });
          }
        } catch (youtubeApiError: any) {
          console.warn(
            `⚠️ [API] [${requestId}] YouTube Data API method failed:`,
            youtubeApiError.message
          );

          // Sanitize error message to hide API keys
          if (youtubeApiError.message) {
            const sanitizedMessage = youtubeApiError.message.replace(/key=[^&\s]+/g, 'key=***HIDDEN***');
            console.warn(`⚠️ [API] [${requestId}] Sanitized error:`, sanitizedMessage);
          }

          // Check for specific error types
          if (youtubeApiError.status === 403) {
            console.error(`❌ [API] [${requestId}] YouTube API 403 Error - Check your API key configuration`);
          } else if (youtubeApiError.status === 429) {
            console.error(`❌ [API] [${requestId}] YouTube API quota exceeded`);
          } else if (youtubeApiError.status === 400) {
            console.error(`❌ [API] [${requestId}] YouTube API 400 Error - Bad request format or invalid video ID`);
            console.error(`❌ [API] [${requestId}] Video ID: ${videoId}`);
          }

          updateApiStats("youtubeApi", false, youtubeApiError);

          // Fall back to youtube-transcript-api with proxy
          try {
            console.log(
              `🔄 [API] [${requestId}] Falling back to YouTube Transcript API with proxy...`
            );

            // Log the request
            logApiRequest("youtubeTranscriptApi", {
              requestId,
              videoId,
              timestamp: new Date().toISOString(),
            });

            // Try the original youtube-transcript-api first
            const directTranscript = await getTranscript(videoId, {
              lang: "en",
              country: "US",
            });

            if (directTranscript && directTranscript.length > 0) {
              const transcript = directTranscript
                .map((segment: any) => segment.text)
                .join(" ");
              console.log(
                `✅ [API] [${requestId}] Successfully fetched transcript with YouTube Transcript API`
              );
              console.log(
                `📝 [API] [${requestId}] Transcript length: ${transcript.length} characters`
              );

              updateApiStats("youtubeTranscriptApi", true);

              return res.json({
                transcript: transcript,
                segments: directTranscript,
                source: "youtube-transcript-api",
              });
            }
          } catch (directError: any) {
            console.warn(
              `⚠️ [API] [${requestId}] YouTube Transcript API method failed:`,
              directError.message
            );

            updateApiStats("youtubeTranscriptApi", false, directError);
          }
        }
      }
    }

    // If YouTube methods failed or it's not a YouTube URL, try AssemblyAI
    console.log(
      `🔄 [API] [${requestId}] Attempting to get transcript with AssemblyAI...`
    );

    // Log the request
    logApiRequest("assemblyAI", {
      requestId,
      videoUrl,
      timestamp: new Date().toISOString(),
    });

    const transcript = await getTranscriptWithAssemblyAI(videoUrl);

    if (!transcript) {
      console.warn(
        `⚠️ [API] [${requestId}] No transcript found with any method`
      );
      updateApiStats("assemblyAI", false, new Error("No transcript found"));
      return res.status(404).json({
        error: "No transcript found",
        details:
          "Failed to transcribe the video. The video might not be accessible or the transcription service might be unavailable.",
      });
    }

    console.log(
      `✅ [API] [${requestId}] Successfully retrieved transcript from AssemblyAI`
    );
    console.log(
      `📝 [API] [${requestId}] Transcript length: ${transcript.length} characters`
    );
    console.log(
      `📝 [API] [${requestId}] First 100 characters: ${transcript.substring(
        0,
        100
      )}...`
    );

    updateApiStats("assemblyAI", true);

    res.json({
      transcript: transcript,
      source: "assemblyai",
    });
  } catch (error) {
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
});

// Add a new endpoint to get API statistics
app.get("/api/stats", (req: any, res: any) => {
  try {
    const stats = JSON.parse(fs.readFileSync(API_STATS_FILE, "utf8"));
    res.json(stats);
  } catch (error) {
    console.error("Error reading API stats:", error);
    res.status(500).json({ error: "Failed to read API statistics" });
  }
});

// Helper function to process YouTube caption data
function processYouTubeCaptionData(captionData: any): string {
  try {
    console.log("🔄 Processing YouTube caption data...");
    
    // Convert to string if it's not already
    const textContent = captionData.toString();
    console.log(`📝 Caption data length: ${textContent.length} characters`);
    console.log(`📝 First 200 characters: ${textContent.substring(0, 200)}...`);

    // Check if it's SRT format
    if (textContent.includes('-->')) {
      console.log("📝 Detected SRT format, parsing...");
      return parseSRTCaptions(textContent);
    }
    
    // Check if it's XML/VTT format
    if (textContent.includes('<text') || textContent.includes('WEBVTT')) {
      console.log("📝 Detected XML/VTT format, parsing...");
      return parseXMLCaptions(textContent);
    }

    // Fallback: treat as plain text and clean it up
    console.log("📝 Using fallback text cleaning...");
    const cleanText = textContent
      .replace(/<[^>]*>/g, " ") // Remove XML tags
      .replace(/\d+:\d+:\d+[.,]\d+\s*-->\s*\d+:\d+:\d+[.,]\d+/g, "") // Remove SRT timestamps
      .replace(/\d+\s*$/gm, "") // Remove SRT sequence numbers
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    return cleanText;
  } catch (error) {
    console.error("❌ Error parsing captions:", error);
    return "";
  }
}

// Helper function to parse SRT format captions
function parseSRTCaptions(srtContent: string): string {
  try {
    const lines = srtContent.split('\n');
    const textLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip sequence numbers and timestamps
      if (/^\d+$/.test(line) || /\d+:\d+:\d+[.,]\d+\s*-->\s*\d+:\d+:\d+[.,]\d+/.test(line)) {
        continue;
      }
      
      // Skip empty lines
      if (line === '') {
        continue;
      }
      
      // This should be caption text
      textLines.push(line);
    }
    
    return textLines.join(' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error("❌ Error parsing SRT captions:", error);
    return "";
  }
}

// Helper function to parse XML format captions
function parseXMLCaptions(xmlContent: string): string {
  try {
    // Extract text from XML tags
    const textMatches = xmlContent.match(/<text[^>]*>(.*?)<\/text>/g);
    
    if (!textMatches) {
      // Try alternative XML parsing
      const altMatches = xmlContent.match(/>(.*?)</g);
      if (altMatches) {
        return altMatches
          .map(match => match.slice(1, -1))
          .filter(text => text.trim() && !text.includes('<'))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return "";
    }

    return textMatches
      .map((match) => {
        const textMatch = match.match(/<text[^>]*>(.*?)<\/text>/);
        if (textMatch && textMatch[1]) {
          return textMatch[1]
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        }
        return "";
      })
      .filter(text => text.trim())
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  } catch (error) {
    console.error("❌ Error parsing XML captions:", error);
    return "";
  }
}

// ✅ Summarize Transcript with Cohere
app.post("/summarize", async (req: any, res: any) => {
  const transcript = req.body.transcript;

  console.log(
    `📥 Received request to summarize transcript: ${
      transcript
        ? transcript.substring(0, 30) + "..."
        : "No transcript received"
    }`
  );

  if (!transcript) {
    console.warn("⚠️ No transcript provided in request body!");
    return res.status(400).json({ error: "No transcript provided" });
  }

  try {
    console.log("🔄 Starting Cohere summarization process...");
    console.log(`📝 Original transcript length: ${transcript.length} characters`);

    // Smart truncate the transcript if needed
    const processedTranscript = smartTruncateText(transcript, COHERE_RATE_LIMIT.maxInputLength);
    console.log(`📝 Processed transcript length: ${processedTranscript.length} characters`);

    // Estimate input tokens (rough estimate: 4 chars per token)
    const estimatedInputTokens = Math.ceil(processedTranscript.length / 4);
    const totalEstimatedTokens = estimatedInputTokens + COHERE_RATE_LIMIT.maxOutputTokens;

    // Check rate limit with total estimated tokens
    try {
      checkCohereRateLimit(totalEstimatedTokens);
    } catch (rateLimitError: unknown) {
      const error = rateLimitError as Error;
      console.warn("⚠️ Rate limit reached:", error.message);
      return res.status(429).json({ 
        error: "Rate limit exceeded",
        message: error.message,
        retryAfter: "60 seconds"
      });
    }

    const prompt = `Please provide a concise summary of this video transcript in 2-3 short sentences, focusing on the main points only: ${processedTranscript}`;
    
    const response = await cohereClient.generate({
      model: 'command',
      prompt: prompt,
      max_tokens: COHERE_RATE_LIMIT.maxOutputTokens,
      temperature: 0.3, // Reduced for more focused summaries
      k: 0,
      stop_sequences: ["\n\n", "###"],
      return_likelihoods: 'NONE'
    });

    console.log("✅ Received response from Cohere");
    const summary = response.generations[0].text.trim();

    if (!summary || summary.trim() === "") {
      throw new Error("Empty summary received from Cohere API");
    }

    console.log(`✅ Summary length: ${summary.length} characters`);
    console.log(`📝 Summary: ${summary}`);

    // Update rate limit tracking with actual tokens used
    const actualOutputTokens = Math.ceil(summary.length / 4);
    const totalActualTokens = estimatedInputTokens + actualOutputTokens;
    
    // Adjust token count in rate limiter (remove estimated, add actual)
    COHERE_RATE_LIMIT.tokens = COHERE_RATE_LIMIT.tokens.slice(0, -totalEstimatedTokens);
    for (let i = 0; i < totalActualTokens; i++) {
      COHERE_RATE_LIMIT.tokens.push(Date.now());
    }

    res.json({ 
      summary,
      tokenStats: {
        inputTokens: estimatedInputTokens,
        outputTokens: actualOutputTokens,
        totalTokens: totalActualTokens
      }
    });
  } catch (error) {
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
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// ✅ Test Cohere Connection
app.get("/test/cohere", async (req: any, res: any) => {
  console.log("📝 Testing Cohere AI connection...");

  try {
    // Add rate limit check with minimal tokens
    try {
      // Test prompt is very short, estimate 5 tokens for input and 10 for output
      checkCohereRateLimit(15);
    } catch (rateLimitError: unknown) {
      if (rateLimitError instanceof Error) {
        console.warn("⚠️ Rate limit reached:", rateLimitError.message);
        return res.status(429).json({ 
          error: "Rate limit exceeded",
          message: rateLimitError.message,
          retryAfter: "60 seconds"
        });
      }
      throw rateLimitError;
    }

    const response = await cohereClient.generate({
      model: 'command',
      prompt: 'Say hi',
      max_tokens: 10,
      temperature: 0.3,
      stop_sequences: ["\n", "."],
      return_likelihoods: 'NONE'
    });

    console.log("✅ Cohere AI test successful!");
    res.json({
      status: "success",
      message: "Cohere AI is working correctly",
      response: response.generations[0].text.trim()
    });
  } catch (error) {
    console.error("❌ Cohere AI test failed:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to connect to Cohere AI",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add a new endpoint to check proxy status
app.get("/api/proxy-status", (req: any, res: any) => {
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
app.post("/api/rotate-proxy", (req: any, res: any) => {
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

// Authentication routes
const authRoutes = require('./routes/authRoutes.js');
app.use('/api/auth', authRoutes);

// Routes for video notes
app.post("/api/videos/save", saveVideoNote);
app.get("/api/videos/notes", getVideoNotes);
app.get("/api/videos/notes/:noteId", getVideoNote);
app.delete("/api/videos/notes/:noteId", deleteVideoNote);
app.put("/api/videos/update-category", updateVideoCategory);

// Add new routes for video operations
app.delete("/api/videos/:videoUrl", deleteVideo);
app.put("/api/videos/rename", renameVideo);

// Add a new endpoint to test YouTube API with a specific video
app.get("/test/youtube/:videoId", async (req: any, res: any) => {
  const videoId = req.params.videoId;
  console.log(`📝 Testing YouTube API with video ID: ${videoId}`);

  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(500).json({
      error: "YouTube API key not configured"
    });
  }

  try {
    // Test basic video info retrieval
    const videoResponse = await youtube.videos.list({
      key: process.env.YOUTUBE_API_KEY,
      part: ["snippet"],
      id: [videoId],
    });

    if (!videoResponse.data.items || videoResponse.data.items.length === 0) {
      return res.status(404).json({
        error: "Video not found",
        videoId: videoId
      });
    }

    const video = videoResponse.data.items[0];
    
    // Test captions availability
    let captionsAvailable = false;
    let captionError = null;
    
    try {
      const captionsResponse = await youtube.captions.list({
        key: process.env.YOUTUBE_API_KEY,
        part: ["snippet"],
        videoId: videoId,
      });
      
      captionsAvailable = captionsResponse.data.items && captionsResponse.data.items.length > 0;
    } catch (captionErr: any) {
      captionError = captionErr.message;
    }

    res.json({
      status: "success",
      video: {
        id: video.id,
        title: video.snippet?.title,
        channelTitle: video.snippet?.channelTitle,
        publishedAt: video.snippet?.publishedAt,
      },
      captions: {
        available: captionsAvailable,
        error: captionError
      }
    });
  } catch (error: any) {
    console.error("❌ YouTube API test failed:", error);
    
    // Sanitize error message
    const sanitizedMessage = error.message ? error.message.replace(/key=[^&\s]+/g, 'key=***HIDDEN***') : 'Unknown error';
    
    res.status(500).json({
      error: "YouTube API test failed",
      details: sanitizedMessage,
      status: error.status || 'unknown',
      videoId: videoId
    });
  }
});

// Legacy authentication status endpoint (now handled by /api/auth/verify)
// This is kept for backward compatibility but should use the new /api/auth/verify endpoint

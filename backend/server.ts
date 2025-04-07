const { getTranscript } = require("youtube-transcript-api");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Gemini AI
let genAI;
let geminiModel: any;

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
  (async () => {
    try {
      console.log("🔄 Testing Gemini connection...");
      const prompt = "Hello! Please confirm if you're working.";
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log("✅ Gemini test successful:", text);
    } catch (testError) {
      console.error("❌ Gemini test failed:", testError);
      if (testError instanceof Error) {
        console.error("Error details:", {
          name: testError.name,
          message: testError.message,
          stack: testError.stack,
        });
      }
    }
  })();
} catch (error) {
  console.error("❌ Failed to initialize Gemini AI:", error);
  if (error instanceof Error) {
    console.error("Error message:", error.message);
  }
  process.exit(1);
}

app.use(cors({ origin: "*" })); // ⚠️ Change this in production
app.use(express.json());

console.log("🚀 Server is starting...");

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
        json: { (arg0: { error: string }): void; new (): any };
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
      console.log("🔄 Fetching transcript from YouTube...");
      const transcript = await getTranscript(videoId);
      console.log(
        `✅ Successfully fetched ${transcript.length} caption segments`
      );

      // Convert transcript segments to text
      const transcriptText = transcript
        .map((segment: { text: string }) => segment.text)
        .join(" ");
      console.log(`📝 Transcript length: ${transcriptText.length} characters`);
      console.log(
        `📝 First 100 characters: ${transcriptText.substring(0, 100)}...`
      );

      res.json({
        transcript: transcriptText,
        segments: transcript,
      });
    } catch (error) {
      console.error(`❌ Error fetching transcript:`, error);
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  }
);

// ✅ Summarize Transcript with Gemini
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
    const result = await geminiModel.generateContent(prompt);
    console.log("✅ Received response from Gemini");

    const response = await result.response;
    console.log("✅ Got response object");

    const summary = response.text();
    console.log("✅ Extracted summary text");

    if (!summary || summary.trim() === "") {
      throw new Error("Empty summary received from Gemini API");
    }

    console.log(`✅ Summary length: ${summary.length} characters`);
    console.log(`📝 Summary: ${summary}`);

    res.json({ summary });
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
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ✅ Test Gemini Connection
app.get("/test/gemini", async (req: any, res: any) => {
  console.log("📝 Testing Gemini AI connection...");

  try {
    const testPrompt = "Hello! Please respond with a short greeting.";
    const result = await geminiModel.generateContent(testPrompt);
    const response = await result.response;
    const text = response.text();

    console.log("✅ Gemini AI test successful!");
    res.json({
      status: "success",
      message: "Gemini AI is working correctly",
      response: text,
    });
  } catch (error) {
    console.error("❌ Gemini AI test failed:", error);
    res.status(500).json({
      status: "error",
      error: "Failed to connect to Gemini AI",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

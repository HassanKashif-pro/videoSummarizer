const { getTranscript } = require("youtube-transcript-api");
const { OpenAI } = require("openai");
require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5000;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Verify OpenAI configuration
console.log(
  "🔑 OpenAI API Key configured:",
  process.env.OPENAI_API_KEY ? "Yes" : "No"
);

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

// ✅ Get Transcript (Real Implementation)
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

      // Return both the text and the segments for debugging
      res.json({
        transcript: transcriptText,
        segments: transcript, // Include the raw segments for debugging
      });
    } catch (error) {
      console.error(`❌ Error fetching transcript:`, error);
      console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  }
);

// ✅ View Raw Transcript (Debug Endpoint)
app.get(
  "/debug/transcript/:videoId",
  async (
    req: { params: { videoId: string } },
    res: {
      status: (arg0: number) => {
        (): any;
        new (): any;
        json: { (arg0: { error: string }): void; new (): any };
      };
      json: (arg0: {
        transcript: string;
        segments: any[];
        details: any;
      }) => void;
    }
  ) => {
    const videoId = req.params.videoId;
    console.log(`🔍 Debug request for transcript of video: ${videoId}`);

    if (!videoId) {
      return res.status(400).json({ error: "No video ID provided" });
    }

    try {
      const transcript = await getTranscript(videoId);
      const transcriptText = transcript
        .map((segment: { text: string }) => segment.text)
        .join(" ");

      // Return detailed information about the transcript
      res.json({
        transcript: transcriptText,
        segments: transcript,
        details: {
          totalSegments: transcript.length,
          totalCharacters: transcriptText.length,
          firstSegment: transcript[0],
          lastSegment: transcript[transcript.length - 1],
          sampleText: transcriptText.substring(0, 200) + "...",
        },
      });
    } catch (error) {
      console.error(`❌ Debug error:`, error);
      res.status(500).json({
        error: "Failed to fetch transcript",
      });
    }
  }
);

// ✅ Summarize Transcript (Real Implementation with OpenAI)
app.post(
  "/summarize",
  async (
    req: { body: { transcript: any } },
    res: {
      status: (arg0: number) => {
        (): any;
        new (): any;
        json: { (arg0: { error: string }): void; new (): any };
      };
      json: (arg0: { summary: string }) => void;
    }
  ) => {
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
      console.log("🔄 Starting summarization process...");
      console.log(`📝 Transcript length: ${transcript.length} characters`);

      // For very short transcripts, use a different approach
      if (transcript.length < 100) {
        console.log("📝 Using short transcript approach");
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that provides very concise video summaries. Keep summaries brief and focused on key points only.",
            },
            {
              role: "user",
              content: `This is a very short video transcript. Please provide a brief summary: ${transcript}`,
            },
          ],
          temperature: 0.3, // Reduced for more focused responses
          max_tokens: 100, // Reduced token limit
        });
        return res.json({ summary: response.choices[0].message.content });
      }

      // For longer transcripts, use the chunking approach
      let processedTranscript = transcript;
      const maxLength = 2000; // Reduced from 3000 to be more conservative
      if (transcript.length > maxLength) {
        // Take first 1500 chars and last 500 chars if transcript is too long
        processedTranscript =
          transcript.substring(0, 1500) +
          "..." +
          transcript.substring(transcript.length - 500);
        console.log("📊 Truncated long transcript to essential parts");
      }

      console.log("🔄 Making OpenAI API call...");
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that provides very concise video summaries. Keep summaries brief and focused on key points only. Maximum 3-4 sentences.",
          },
          {
            role: "user",
            content: `Please provide a very brief summary of this video transcript, focusing only on the main points: ${processedTranscript}`,
          },
        ],
        temperature: 0.3, // Reduced for more focused responses
        max_tokens: 200, // Reduced token limit
      });

      const summary = response.choices[0].message.content;
      console.log(
        `✅ Summarization successful - Length: ${summary.length} characters`
      );
      console.log(`📝 Summary: ${summary}`);

      res.json({ summary });
    } catch (error) {
      console.error(`❌ Summarization failed:`, error);
      console.error(`❌ Error details:`, JSON.stringify(error, null, 2));

      let errorMessage = "An unknown error occurred";
      let statusCode = 500;
      let retryAfter = 60; // Default retry time

      if (error instanceof Error) {
        if (error.message.includes("429")) {
          errorMessage =
            "API rate limit exceeded. Please try again in a few minutes.";
          statusCode = 429;
          // Try to extract retry-after from error if available
          try {
            const errorObj = JSON.parse(error.message);
            if (errorObj.retry_after) {
              retryAfter = errorObj.retry_after;
            }
          } catch (e) {
            // If we can't parse the error, use default retry time
          }
        } else if (error.message.includes("401")) {
          errorMessage = "API key error. Please contact support.";
          statusCode = 401;
        } else if (error.message.includes("quota")) {
          errorMessage =
            "OpenAI API quota exceeded. Please check your billing status.";
          statusCode = 402;
        } else {
          errorMessage = error.message;
        }
      }

      res.status(statusCode).json({
        error: `Summarization failed: ${errorMessage}`,
        ...(statusCode === 429 ? { retryAfter } : {}),
      });
    }
  }
);

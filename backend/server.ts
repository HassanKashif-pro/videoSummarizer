require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

console.log("🚀 Server is starting...");

// ✅ Start the server properly
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

// ✅ Fix TypeScript-like typings in JavaScript
app.get("/", (req: any, res: { send: (arg0: string) => void }) => {
  console.log("📢 Root route hit: GET /");
  res.send("YouTube Summarizer API is running...");
});

app.get(
  "/transcript/:videoId",
  async (
    req: { params: { videoId: any } },
    res: {
      json: (arg0: { transcript: string }) => void;
      status: (arg0: number) => {
        (): any;
        new (): any;
        json: { (arg0: { error: string }): void; new (): any };
      };
    }
  ) => {
    const { videoId } = req.params;
    console.log(`📥 Received request for transcript - Video ID: ${videoId}`);

    try {
      // Simulating API call (replace with actual API call)
      const transcript = `Dummy transcript for video ID: ${videoId}`;
      console.log(`✅ Successfully fetched transcript for ${videoId}`);

      res.json({ transcript });
    } catch (error) {
      console.error(
        `❌ Error fetching transcript: ${(error as Error).message}`
      );
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  }
);

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
    const { transcript } = req.body;
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
      // Simulating AI API call (replace with actual AI service)
      const summary = `Summary: ${transcript.substring(0, 50)}...`;
      console.log(`✅ Summarization successful: ${summary}`);

      res.json({ summary });
    } catch (error) {
      console.error(`❌ Summarization failed: ${(error as Error).message}`);
      res.status(500).json({ error: "Summarization failed" });
    }
  }
);

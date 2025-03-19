require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req: any, res: { send: (arg0: string) => void }) => {
  res.send("YouTube Summarizer API is running...");
});

// Route to fetch video transcript
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
    try {
      // Make a request to an API like YouTube's transcript API (or use a third-party service)
      const transcript = `Dummy transcript for video ID: ${videoId}`;
      res.json({ transcript });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transcript" });
    }
  }
);

// Route to summarize transcript
app.post(
  "/summarize",
  async (
    req: { body: { transcript: any } },
    res: {
      json: (arg0: { summary: string }) => void;
      status: (arg0: number) => {
        (): any;
        new (): any;
        json: { (arg0: { error: string }): void; new (): any };
      };
    }
  ) => {
    const { transcript } = req.body;
    try {
      // Call AI API (like OpenAI GPT) to summarize text
      const summary = `Summary: ${transcript.substring(0, 50)}...`; // Dummy summary
      res.json({ summary });
    } catch (error) {
      res.status(500).json({ error: "Summarization failed" });
    }
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

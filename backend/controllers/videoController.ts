import axios from "axios";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { getTranscript } from "youtube-transcript-api";

dotenv.config(); // Load environment variables

// Function to extract Video ID from YouTube URLs
const extractVideoId = (url: string): string | null => {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

const fetchTranscript = async (videoId: string): Promise<string> => {
  try {
    console.log("Fetching transcript for video ID:", videoId);

    const captions = await getTranscript(videoId);
    console.log("Raw captions:", captions);

    if (!captions || captions.length === 0) {
      throw new Error("No captions found for this video.");
    }

    const transcript = captions.map((caption) => caption.text).join(" ");
    console.log("Final transcript:", transcript);

    return transcript;
  } catch (error: any) {
    console.error("Error fetching transcript:", error.message);
    throw new Error("Failed to fetch transcript.");
  }
};
// Function to summarize text using OpenAI API
const summarizeText = async (text: string) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "gpt-4", // Updated to GPT-4
        prompt: `Summarize this transcript:\n\n${text}`,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json", // Added missing header
        },
      }
    );

    if (
      !response.data ||
      !response.data.choices ||
      response.data.choices.length === 0
    ) {
      throw new Error("Invalid response from OpenAI.");
    }

    return response.data.choices[0].text.trim();
  } catch (error: any) {
    console.error(
      "Error summarizing text:",
      error.response?.data || error.message
    );
    throw new Error("Failed to summarize text.");
  }
};

// Express route handler
export const getVideoSummary = async (req: Request, res: Response) => {
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

    // Fetch transcript
    const transcript = await fetchTranscript(videoId);

    if (!transcript) {
      console.log("❌ Transcript is empty");
      return res.status(400).json({ error: "No transcript provided" });
    }

    console.log("✅ Fetched Transcript:", transcript);

    res.json({ transcript });
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Failed to fetch transcript." });
  }
};

function getSubtitles(arg0: {
  videoID: string; // YouTube video ID
  lang: string;
}) {
  throw new Error("Function not implemented.");
}

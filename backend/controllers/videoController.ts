import axios from "axios";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { getTranscript, TranscriptSegment } from "youtube-transcript-api";
import { VideoNote } from "../services/database";

dotenv.config(); // Load environment variables

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// ✅ Function to extract Video ID from YouTube URLs
const extractVideoId = (url: string): string | null => {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// ✅ Fetch Transcript with Error Handling
export const fetchTranscript = async (videoId: string): Promise<string> => {
  try {
    console.log("📥 Fetching transcript for video ID:", videoId);

    // ✅ Attempt to fetch the transcript (handle errors)
    const captions = await getTranscript(videoId).catch((err: Error) => {
      console.error("⚠️ Transcript fetch error:", err.message);
      throw new Error(
        "⚠️ Unable to fetch transcript. Video may be restricted."
      );
    });

    console.log("📜 Raw captions:", captions);

    if (!Array.isArray(captions) || captions.length === 0) {
      throw new Error("⚠️ No captions found for this video.");
    }

    // ✅ Convert captions into a single transcript string
    const transcript = captions
      .map((caption: { text: string }) => caption.text)
      .join(" ");
    console.log("✅ Final transcript:", transcript);

    return transcript;
  } catch (error: any) {
    console.error(
      "❌ Error fetching transcript:",
      error instanceof Error ? error.message : "Unknown error"
    );
    throw new Error(
      "❌ Failed to fetch transcript. Video might have no captions."
    );
  }
};

// ✅ Function to summarize text using OpenAI API
const summarizeText = async (text: string) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      {
        model: "gpt-4", // Ensure GPT-4 access
        prompt: `Summarize this transcript:\n\n${text}`,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data?.choices?.[0]?.text) {
      throw new Error("Invalid response from OpenAI.");
    }

    return response.data.choices[0].text.trim();
  } catch (error: any) {
    console.error(
      "❌ Error summarizing text:",
      error.response?.data || error.message
    );
    throw new Error("❌ Failed to summarize text.");
  }
};

// ✅ Express route handler
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

    // ✅ Fetch transcript
    const transcript = await fetchTranscript(videoId);

    if (!transcript) {
      console.log("❌ Transcript is empty");
      return res.status(400).json({ error: "No transcript found." });
    }

    console.log("✅ Fetched Transcript:", transcript);

    // ✅ Summarize the transcript
    const summary = await summarizeText(transcript);
    console.log("✅ Generated Summary:", summary);

    res.json({ transcript, summary });
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    res.status(500).json({ error: "Failed to fetch transcript." });
  }
};

// Fetch video information from YouTube API
const fetchVideoInfo = async (videoId: string) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (response.data.items && response.data.items.length > 0) {
      return {
        title: response.data.items[0].snippet.title,
        description: response.data.items[0].snippet.description,
        thumbnail: response.data.items[0].snippet.thumbnails.default.url,
      };
    }
    throw new Error("Video not found");
  } catch (error) {
    console.error("Error fetching video info:", error);
    throw error;
  }
};

// Save video note to database
export const saveVideoNote = async (req: Request, res: Response) => {
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
    const videoInfo = await fetchVideoInfo(videoId);

    // Create new note
    const note = new VideoNote({
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
    await note.save();

    res.status(201).json(note);
  } catch (error) {
    console.error("Error saving video note:", error);
    res.status(500).json({ error: "Failed to save video note" });
  }
};

// Get all video notes
export const getVideoNotes = async (req: Request, res: Response) => {
  try {
    const notes = await VideoNote.find().sort({ timestamp: -1 });
    res.json(notes);
  } catch (error) {
    console.error("Error fetching video notes:", error);
    res.status(500).json({ error: "Failed to fetch video notes" });
  }
};

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
    const { videoUrl, content, category, isPinned, timestamp, contentType } = req.body;

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
      contentType: contentType || "text",
      content,
      category: category || "Uncategorized",
      isPinned,
      timestamp: timestamp || "0:00",
    });

    // Save to database
    const savedNote = await note.save();
    console.log(`✅ Note saved: ${savedNote.contentType} content`);

    res.status(201).json(savedNote);
  } catch (error) {
    console.error("❌ Error saving video note:", error);
    res.status(500).json({ error: "Failed to save video note" });
  }
};

// Get all video notes
export const getVideoNotes = async (req: Request, res: Response) => {
  try {
    const notes = await VideoNote.find().sort({ timestamp: -1 });
    res.json(notes);
  } catch (error) {
    console.error("❌ Error fetching video notes:", error);
    res.status(500).json({ error: "Failed to fetch video notes" });
  }
};

// Delete a video note
export const deleteVideoNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    
    console.log("Delete request received for note ID:", noteId);
    
    if (!noteId) {
      return res.status(400).json({ error: "Missing note ID" });
    }

    const deletedNote = await VideoNote.findByIdAndDelete(noteId);
    
    if (!deletedNote) {
      console.log("Note not found with ID:", noteId);
      return res.status(404).json({ error: "Note not found" });
    }

    console.log("Successfully deleted note:", deletedNote);
    
    // Also return all remaining notes to help with debugging
    const remainingNotes = await VideoNote.find();
    console.log("Remaining notes count:", remainingNotes.length);
    
    res.status(200).json({ 
      message: "Note deleted successfully", 
      deletedNote,
      remainingNotesCount: remainingNotes.length
    });
  } catch (error) {
    console.error("Error deleting video note:", error);
    res.status(500).json({ error: "Failed to delete video note" });
  }
};

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

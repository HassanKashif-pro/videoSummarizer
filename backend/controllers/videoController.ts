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

// Fetch video information from YouTube API with caching
const videoInfoCache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const fetchVideoInfo = async (videoId: string) => {
  try {
    // Check cache first
    const cacheKey = `video_${videoId}`;
    const cached = videoInfoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`📋 Using cached video info for ${videoId}`);
      return cached.data;
    }

    console.log(`🔄 Fetching video info for ${videoId} from YouTube API`);
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`,
      { timeout: 10000 } // 10 second timeout
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
  } catch (error) {
    console.error("Error fetching video info:", error);
    // Return fallback data instead of throwing
    return {
      title: "Unknown Title",
      description: "",
      thumbnail: ""
    };
  }
};

// Save video note to database with optimizations
export const saveVideoNote = async (req: Request, res: Response) => {
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
    } else {
      videoInfo = await fetchVideoInfo(videoId);
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
    const savedNote = await VideoNote.create(noteData);
    
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
  } catch (error) {
    console.error("❌ Error saving video note:", error);
    res.status(500).json({ error: "Failed to save video note" });
  }
};

// Get all video notes with optimizations and pagination
export const getVideoNotes = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Parse query parameters for optimization
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 items
    const videoId = req.query.videoId as string;
    const category = req.query.category as string;
    const contentType = req.query.contentType as string;
    const includeContent = req.query.includeContent !== 'false'; // Default true
    
    console.log(`🔄 Fetching notes - Page: ${page}, Limit: ${limit}, VideoID: ${videoId || 'all'}, Category: ${category || 'all'}`);

    // Build query filter
    const filter: any = {};
    if (videoId) filter.videoId = videoId;
    if (category && category !== 'all') filter.category = category;
    if (contentType) filter.contentType = contentType;

    // Build projection (exclude large content for list views)
    const projection = includeContent ? {} : { 
      content: 0 // Exclude content field for faster loading
    };

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Optimized query with lean() for better performance
    const notesQuery = VideoNote
      .find(filter, projection)
      .sort({ isPinned: -1, createdAt: -1 }) // Pinned first, then newest
      .skip(skip)
      .limit(limit)
      .lean(); // Returns plain JavaScript objects instead of Mongoose documents

    // Execute query with timeout
    const notes = await Promise.race([
      notesQuery.exec(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 15000)
      )
    ]) as any[];

    // Get total count for pagination (only if needed)
    let totalCount = 0;
    if (page === 1) {
      try {
        totalCount = await VideoNote.countDocuments(filter).maxTimeMS(5000);
      } catch (countError) {
        console.warn("⚠️ Count query failed, skipping pagination info");
        totalCount = notes.length;
      }
    }

    const queryTime = Date.now() - startTime;
    console.log(`✅ Fetched ${notes.length} notes in ${queryTime}ms`);

    // Optimize response payload
    const optimizedNotes = notes.map(note => ({
      _id: note._id,
      videoId: note.videoId,
      videoTitle: note.videoTitle?.substring(0, 100) || '', // Truncate long titles
      videoUrl: note.videoUrl,
      content: includeContent ? note.content : undefined,
      contentType: note.contentType,
      category: note.category,
      timestamp: note.timestamp,
      isPinned: note.isPinned,
      createdAt: note.createdAt,
    }));

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
  } catch (error: any) {
    console.error("❌ Error fetching video notes:", error);
    
    if (error.message === 'Query timeout') {
      res.status(408).json({ error: "Request timeout. Please try again." });
    } else {
      res.status(500).json({ error: "Failed to fetch video notes" });
    }
  }
};

// Get a single note with full content
export const getVideoNote = async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;
    
    if (!noteId) {
      return res.status(400).json({ error: "Missing note ID" });
    }

    const note = await VideoNote.findById(noteId).lean().maxTimeMS(5000);
    
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }

    res.json(note);
  } catch (error) {
    console.error("❌ Error fetching video note:", error);
    res.status(500).json({ error: "Failed to fetch video note" });
  }
};

// Delete a video note with optimizations
export const deleteVideoNote = async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const { noteId } = req.params;
    
    console.log("🗑️ Delete request received for note ID:", noteId);
    
    if (!noteId) {
      return res.status(400).json({ error: "Missing note ID" });
    }

    // Use findByIdAndDelete with lean for better performance
    const deletedNote = await VideoNote.findByIdAndDelete(noteId).lean().maxTimeMS(5000);
    
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
  } catch (error) {
    console.error("❌ Error deleting video note:", error);
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

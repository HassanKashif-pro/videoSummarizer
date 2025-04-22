import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://hassan:NtGaqFt2QKd4Gkv@summify.k4z5mic.mongodb.net/?retryWrites=true&w=majority&appName=SUMMIFY";

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Define the VideoNote Schema
const videoNoteSchema = new mongoose.Schema({
  videoId: { type: String, required: true },
  videoTitle: { type: String, required: true },
  videoUrl: { type: String, required: true },
  content: { type: String, required: true },
  contentType: {
    type: String,
    enum: ["text", "image", "link"],
    default: "text",
  },
  category: { type: String, required: true },
  timestamp: { type: String, required: true },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Create indexes for better query performance
videoNoteSchema.index({ videoId: 1 });
videoNoteSchema.index({ category: 1 });
videoNoteSchema.index({ createdAt: -1 });

export const VideoNote = mongoose.model("VideoNote", videoNoteSchema);

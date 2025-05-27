import mongoose from "mongoose";

// Remove hardcoded credentials and use environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
  process.exit(1);
}

// Configure mongoose
mongoose.set('strictQuery', true);

export const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    } as mongoose.ConnectOptions;

    await mongoose.connect(MONGODB_URI, options);
    console.log("✅ MongoDB connected successfully");

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    // Don't exit the process, let the application handle the error
    throw error;
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

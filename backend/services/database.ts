import mongoose from "mongoose";

// Remove hardcoded credentials and use environment variables
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
  process.exit(1);
}

// Configure mongoose for better performance
mongoose.set('strictQuery', true);
mongoose.set('bufferCommands', false); // Disable mongoose buffering
mongoose.set('maxTimeMS', 10000); // Set maximum time for operations

export const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Optimized connection settings for performance
      serverSelectionTimeoutMS: 10000, // Increased from 5000
      socketTimeoutMS: 30000, // Reduced from 45000
      connectTimeoutMS: 10000, // Add connection timeout
      maxPoolSize: 10, // Maximum number of connections in pool
      minPoolSize: 1, // Minimum number of connections in pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      retryWrites: true,
      retryReads: true,
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

// Define the VideoNote Schema with optimizations
const videoNoteSchema = new mongoose.Schema({
  videoId: { type: String, required: true, index: true }, // Add index
  videoTitle: { type: String, required: true },
  videoUrl: { type: String, required: true, index: true }, // Add index
  content: { type: String, required: true },
  contentType: {
    type: String,
    enum: ["text", "image", "link", "image+annotation"],
    default: "text",
    index: true, // Add index for filtering by content type
  },
  category: { type: String, required: false, default: "Uncategorized", index: true }, // Add index
  timestamp: { type: String, required: true },
  isPinned: { type: Boolean, default: false, index: true }, // Add index for pinned items
  createdAt: { type: Date, default: Date.now, index: true }, // Add index for sorting
}, {
  // Schema options for better performance
  timestamps: false, // We're using createdAt manually
  versionKey: false, // Remove __v field
  collection: 'videonotes' // Explicit collection name
});

// Create compound indexes for better query performance
videoNoteSchema.index({ videoId: 1, createdAt: -1 }); // For video-specific notes sorted by date
videoNoteSchema.index({ category: 1, createdAt: -1 }); // For category-specific notes sorted by date
videoNoteSchema.index({ videoUrl: 1, contentType: 1 }); // For filtering by video and content type
videoNoteSchema.index({ isPinned: -1, createdAt: -1 }); // For pinned items first, then by date

// Add text index for search functionality (optional)
videoNoteSchema.index({ 
  videoTitle: 'text', 
  content: 'text' 
}, { 
  name: 'content_search_index',
  background: true // Create index in background
});

export const VideoNote = mongoose.model("VideoNote", videoNoteSchema);

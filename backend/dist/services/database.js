"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoNote = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
// Remove hardcoded credentials and use environment variables
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    process.exit(1);
}
// Configure mongoose
mongoose_1.default.set('strictQuery', true);
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };
        yield mongoose_1.default.connect(MONGODB_URI, options);
        console.log("✅ MongoDB connected successfully");
        // Handle connection events
        mongoose_1.default.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
        });
        mongoose_1.default.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });
    }
    catch (error) {
        console.error("❌ MongoDB connection error:", error);
        // Don't exit the process, let the application handle the error
        throw error;
    }
});
exports.connectDB = connectDB;
// Define the VideoNote Schema
const videoNoteSchema = new mongoose_1.default.Schema({
    videoId: { type: String, required: true },
    videoTitle: { type: String, required: true },
    videoUrl: { type: String, required: true },
    content: { type: String, required: true },
    contentType: {
        type: String,
        enum: ["text", "image", "link", "image+annotation"],
        default: "text",
    },
    category: { type: String, required: false, default: "Uncategorized" },
    timestamp: { type: String, required: true },
    isPinned: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});
// Create indexes for better query performance
videoNoteSchema.index({ videoId: 1 });
videoNoteSchema.index({ category: 1 });
videoNoteSchema.index({ createdAt: -1 });
exports.VideoNote = mongoose_1.default.model("VideoNote", videoNoteSchema);

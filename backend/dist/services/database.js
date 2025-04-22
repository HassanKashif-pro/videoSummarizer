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
const MONGODB_URI = process.env.MONGODB_URI ||
    "mongodb+srv://hassan:NtGaqFt2QKd4Gkv@summify.k4z5mic.mongodb.net/?retryWrites=true&w=majority&appName=SUMMIFY";
const connectDB = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield mongoose_1.default.connect(MONGODB_URI);
        console.log("✅ MongoDB connected successfully");
    }
    catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
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
exports.VideoNote = mongoose_1.default.model("VideoNote", videoNoteSchema);

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
exports.getVideoSummary = void 0;
const axios_1 = __importDefault(require("axios"));
const getVideoSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { videoUrl } = req.body;
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            return res.status(400).json({ error: "Invalid YouTube URL" });
        }
        const transcript = yield fetchTranscript(videoId);
        const summary = yield summarizeText(transcript);
        res.json({ summary });
    }
    catch (error) {
        res.status(500).json({ error: "Error processing video" });
    }
});
exports.getVideoSummary = getVideoSummary;
const extractVideoId = (url) => {
    const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
};
const fetchTranscript = (videoId) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.get(`https://api.fake-youtube-transcript.com/${videoId}`);
    return response.data.text;
});
const summarizeText = (text) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield axios_1.default.post("https://api.openai.com/v1/completions", {
        model: "text-davinci-003",
        prompt: `Summarize this transcript: ${text}`,
        max_tokens: 150,
    }, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });
    return response.data.choices[0].text.trim();
});

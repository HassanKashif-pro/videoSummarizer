import axios from "axios";
import { Request, Response } from "express";

export const getVideoSummary = async (req: Request, res: Response) => {
  try {
    const { videoUrl } = req.body;
    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const transcript = await fetchTranscript(videoId);
    const summary = await summarizeText(transcript);

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: "Error processing video" });
  }
};

const extractVideoId = (url: string): string | null => {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return match ? match[1] : null;
};

const fetchTranscript = async (videoId: string) => {
  const response = await axios.get(
    `https://api.fake-youtube-transcript.com/${videoId}`
  );
  return response.data.text;
};

const summarizeText = async (text: string) => {
  const response = await axios.post(
    "https://api.openai.com/v1/completions",
    {
      model: "text-davinci-003",
      prompt: `Summarize this transcript: ${text}`,
      max_tokens: 150,
    },
    {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    }
  );

  return response.data.choices[0].text.trim();
};

import React, { useState } from "react";
import axios from "axios";

interface VideoSummarizerProps {
  videoId: string;
}

const VideoSummarizer: React.FC<VideoSummarizerProps> = ({ videoId }) => {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSummarize = async () => {
    setLoading(true);
    setError("");
    try {
      // First, get the transcript
      const transcriptResponse = await axios.get(
        `http://localhost:3001/transcript/${videoId}`
      );
      const { transcript } = transcriptResponse.data;

      // Then, get the summary
      const summaryResponse = await axios.post(
        "http://localhost:3001/summarize",
        {
          transcript,
        }
      );

      setSummary(summaryResponse.data.summary);
    } catch (err) {
      setError("Failed to generate summary. Please try again.");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="video-summarizer">
      <button
        onClick={handleSummarize}
        disabled={loading}
        className="summarize-button"
      >
        {loading ? "Generating Summary..." : "Generate Summary"}
      </button>

      {error && <div className="error-message">{error}</div>}

      {summary && (
        <div className="summary-container">
          <h3>Video Summary</h3>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
};

export default VideoSummarizer;

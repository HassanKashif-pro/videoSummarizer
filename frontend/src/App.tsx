import { useState } from "react";
import VideoSummarizer from "./components/VideoSummarizer";
import "./components/VideoSummarizer.css";

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");

  const extractVideoId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : "";
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setVideoUrl(url);
    const id = extractVideoId(url);
    setVideoId(id);
  };

  return (
    <div className="app-container">
      <h1>YouTube Video Summarizer</h1>
      <div className="input-container">
        <input
          type="text"
          placeholder="Enter YouTube URL"
          value={videoUrl}
          onChange={handleUrlChange}
          className="url-input"
        />
      </div>
      {videoId && <VideoSummarizer videoId={videoId} />}
    </div>
  );
}

export default App;

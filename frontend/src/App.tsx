import { useState } from "react";
import axios from "axios";

function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [summary, setSummary] = useState("");

  const handleSummarize = async () => {
    const response = await axios.post(
      "http://localhost:5000/api/video/summarize",
      { videoUrl }
    );
    setSummary(response.data.summary);
  };

  return (
    <div>
      <h1>YouTube Video Summarizer</h1>
      <input
        type="text"
        placeholder="Enter YouTube URL"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
      />
      <button onClick={handleSummarize}>Summarize</button>
      <p>{summary}</p>
    </div>
  );
}

export default App;

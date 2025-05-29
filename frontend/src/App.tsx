import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.tsx";
import axios from "axios";
import "./styles.css"; // Import the CSS file for App component

interface Note {
  category: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  content: string;
  timestamp: string;
  isPinned: boolean;
}

interface Category {
  name: string;
  notes: Note[];
}

function App() {
  const [categories, setCategories] = useState<Category[]>([
    { name: "Science & Technology", notes: [] },
    { name: "Education", notes: [] },
    { name: "Gaming", notes: [] },
    { name: "Entertainment", notes: [] },
    { name: "Uncategorized", notes: [] },
  ]);
  const [selectedCategory, setSelectedCategory] = useState("Uncategorized");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [shouldRefreshNotes, setShouldRefreshNotes] = useState(0);

  // Function to refresh notes
  const refreshNotes = () => {
    setShouldRefreshNotes((prev) => prev + 1);
  };

  // Load saved notes from backend
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/videos/notes"
        );
        if (response.data) {
          // Group notes by category
          const groupedNotes = categories.map((category) => {
            const categoryNotes = response.data.filter(
              (note: Note) => note.category === category.name
            );
            return {
              ...category,
              notes: categoryNotes,
            };
          });
          setCategories(groupedNotes);
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    fetchNotes();
  }, [shouldRefreshNotes, categories]); // Added categories to dependency array to reflect potential category changes

  const handleAddCategory = (newCategoryName: string) => {
    if (!newCategoryName.trim()) return;
    setCategories([...categories, { name: newCategoryName.trim(), notes: [] }]);
  };

  // Function to handle video selection
  const handleVideoSelect = (url: string, title: string) => {
    setVideoUrl(url);
    setVideoTitle(title);
  };

  // Listen for messages from the Chrome extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (
        event.data &&
        event.data.type === "REFRESH_NOTES" &&
        event.data.source === "video_summarizer"
      ) {
        refreshNotes();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [refreshNotes]); // Added refreshNotes to dependency array

  
function getVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : "";
}

// Helper function to parse timestamp string to seconds (like in extension)
function parseTimestamp(timestampString: string): number {
  const parts = timestampString.split(":").map(Number);
  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // H:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return 0;
}

// Helper function to extract video timestamp from ISO string or return as-is if already formatted
function formatTimestamp(timestamp: string): string {
  // If it's already in HH:MM:SS or MM:SS, return as is
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(timestamp)) return timestamp;
  
  // If it's an ISO string, try to extract the time part
  if (timestamp.includes('T') && timestamp.includes('Z')) {
    // Extract time from ISO string like "2025-05-28T17:08:13.936Z"
    const timePart = timestamp.split('T')[1]?.split('.')[0]; // Gets "17:08:13"
    if (timePart) {
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      // Convert to MM:SS format (or H:MM:SS if needed)
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      } else {
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      }
    }
  }
  
  // If it's a number (seconds), format as MM:SS
  const seconds = Number(timestamp);
  if (!isNaN(seconds)) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }
  
  return timestamp;
}

function seekToTimestamp(timestamp: string) {
  const iframe = document.querySelector("iframe");
  if (iframe) {
    // Format the timestamp first, then parse it to seconds
    const formattedTimestamp = formatTimestamp(timestamp);
    const seconds = parseTimestamp(formattedTimestamp);
    iframe.contentWindow?.postMessage(
      JSON.stringify({
        event: "command",
        func: "seekTo",
        args: [seconds, true],
      }),
      "*"
    );
  }
}

  // Function to add a new note with duplicate checking
  const addNewNote = async (newNote: Note) => {
    try {
      // Check if the video already exists in any category
      const videoExists = categories.some((category) =>
        category.notes.some((note) => note.videoUrl === newNote.videoUrl)
      );

      if (!videoExists) {
        // If video doesn't exist, add the new note
        const response = await axios.post(
          "http://localhost:5000/api/videos/notes",
          newNote
        );
        if (response.data) {
          refreshNotes();
        }
      } else {
        // If video exists, just add the note to the existing video
        const response = await axios.post(
          "http://localhost:5000/api/videos/notes",
          {
            ...newNote,
            videoTitle:
              categories
                .flatMap((cat) => cat.notes)
                .find((note) => note.videoUrl === newNote.videoUrl)
                ?.videoTitle || newNote.videoTitle,
          }
        );
        if (response.data) {
          refreshNotes();
        }
      }
    } catch (error) {
      console.error("Error adding note:", error);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        notebooks={categories}
        onAddNotebook={handleAddCategory}
        onSelectNotebook={setSelectedCategory}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onSelectVideo={handleVideoSelect}
      />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Video Title */}
        <div className="video-title">
          <h1>{videoTitle || "No video selected"}</h1>
        </div>

        {/* Video Player */}
        <div className="video-container">
          {videoUrl ? (
            <iframe
              width="100%"
              height="500"
              src={`https://www.youtube.com/embed/${getVideoId(videoUrl)}`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          ) : (
            <div className="no-video">
              <p>No video selected</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes Panel */}
      <div className="notes-panel">
        <h2>Notes</h2>
        <div className="notes-container">
          {categories
            .find((cat) => cat.name === selectedCategory)
            ?.notes.filter((note) => note.videoUrl === videoUrl)
            .map((note, index) => (
              <div key={index} className="content-item">
                <div className="content-area">
                  {note.content.startsWith('data:image/') ? (
                    <img 
                      src={note.content} 
                      alt="Screenshot" 
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }}
                    />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: note.content }} />
                  )}
                </div>
                {note.timestamp ? (
                  <div className="timestamp-container">
                    <button
                      className="clickable-timestamp"
                      onClick={() => seekToTimestamp(note.timestamp)}
                    >
                      <span className="timestamp-play-icon">▶</span>
                      <span className="timestamp-text">{formatTimestamp(note.timestamp)}</span>
                    </button>
                  </div>
                ) : (
                  "No Timestamp"
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// Helper function to extract video ID from URL
function getVideoId(url: string): string {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : "";
}

export default App;

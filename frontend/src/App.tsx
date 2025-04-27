import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.tsx";
import axios from "axios";

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
  }, [shouldRefreshNotes]);

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
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        notebooks={categories}
        onAddNotebook={handleAddCategory}
        onSelectNotebook={setSelectedCategory}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        onSelectVideo={function (url: string, title: string): void {
          throw new Error("Function not implemented.");
        }}
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
                <div className="content-area">{note.content}</div>
                {note.timestamp && (
                  <div className="timestamp-container">
                    <button className="clickable-timestamp">
                      <span className="material-symbols-outlined">
                        play_arrow
                      </span>
                      <span>{note.timestamp}</span>
                    </button>
                  </div>
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

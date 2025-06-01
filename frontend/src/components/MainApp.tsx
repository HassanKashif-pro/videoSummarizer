import { useState, useEffect } from "react";
import Sidebar from "./Sidebar.tsx";
import UserDropdown from "./UserDropdown.tsx";
import axios from "axios";

// Add these type declarations at the top of the file, after the imports
declare global {
  interface Window {
    YT: {
      Player: new (element: Element, options: any) => any;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Note {
  _id?: string; // MongoDB document ID
  category: string;
  videoId: string;
  videoTitle: string;
  videoUrl: string;
  content: string;
  timestamp: string;
  isPinned: boolean;
  contentType: string;
}

interface Category {
  name: string;
  notes: Note[];
}

interface MainAppProps {
  user: { name: string; email: string };
  onSignOut: () => void;
}

function MainApp({ user, onSignOut }: MainAppProps) {
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
  const [player, setPlayer] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Function to refresh notes
  const refreshNotes = () => {
    setShouldRefreshNotes((prev) => prev + 1);
  };

  // Load saved notes from backend with optimizations
  useEffect(() => {
    const fetchNotes = async () => {
      console.log("🔄 Fetching notes from backend...");
      const startTime = Date.now();
      
      try {
        // First, fetch notes without content for faster loading
        const response = await axios.get(
          "http://localhost:3001/api/videos/notes",
          {
            params: {
              limit: 100, // Limit to 100 notes max
              includeContent: false, // Exclude content for faster loading
              page: 1
            },
            timeout: 15000 // 15 second timeout
          }
        );
        
        const fetchTime = Date.now() - startTime;
        console.log(`✅ Received ${response.data?.notes?.length || 0} notes in ${fetchTime}ms`);
        
        if (response.data?.notes) {
          // Group notes by category
          setCategories((prevCategories) => {
            return prevCategories.map((category) => {
              const categoryNotes = response.data.notes.filter(
                (note: Note) => note.category === category.name
              );
              return {
                ...category,
                notes: categoryNotes,
              };
            });
          });
          console.log("✅ Categories updated successfully");
        }
      } catch (error: any) {
        console.error("❌ Error fetching notes:", error);
        
        // More specific error handling
        if (error.code === 'ECONNABORTED') {
          console.error("❌ Request timed out - backend may be slow");
        } else if (error.response?.status === 408) {
          console.error("❌ Server timeout - database query took too long");
        } else if (error.response?.status >= 500) {
          console.error("❌ Server error - check backend logs");
        }
      }
    };

    fetchNotes();
  }, [shouldRefreshNotes]); // Removed categories from dependency array to prevent infinite loop

  const handleAddCategory = (newCategoryName: string) => {
    if (!newCategoryName.trim()) return;
    setCategories([...categories, { name: newCategoryName.trim(), notes: [] }]);
  };

  // Function to delete a note
  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await axios.delete(
        `http://localhost:3001/api/videos/notes/${noteId}`
      );
      if (response.status === 200) {
        // Refresh notes after successful deletion
        refreshNotes();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
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

  // Update the YouTube iframe API initialization
  useEffect(() => {
    console.log("Initializing YouTube player for video:", videoUrl);
    
    // Load the YouTube iframe API
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // Initialize the player when the API is ready
    window.onYouTubeIframeAPIReady = () => {
      console.log("YouTube API is ready, initializing player...");
      const iframe = document.querySelector("iframe");
      if (iframe) {
        const newPlayer = new window.YT.Player(iframe, {
          events: {
            'onReady': (event: any) => {
              console.log("YouTube player is ready!");
              setPlayer(event.target);
              setIsPlayerReady(true);
            },
            'onStateChange': (event: any) => {
              console.log("Player state changed:", event.data);
            },
            'onError': (event: any) => {
              console.error("YouTube player error:", event.data);
            }
          }
        });
      } else {
        console.error("Could not find iframe element");
      }
    };

    return () => {
      console.log("Cleaning up YouTube player");
      if (player) {
        player.destroy();
        setPlayer(null);
        setIsPlayerReady(false);
      }
    };
  }, [videoUrl]); // Re-initialize when video URL changes

  // Update the seekToTimestamp function to use URL parameters
  function seekToTimestamp(timestamp: string) {
    try {
      // Format the timestamp first, then parse it to seconds
      const formattedTimestamp = formatTimestamp(timestamp);
      const seconds = parseTimestamp(formattedTimestamp);
      console.log("Seeking to seconds:", seconds);
      
      // Get the current video ID
      const videoId = getVideoId(videoUrl);
      if (!videoId) {
        console.error("No video ID found");
        return;
      }

      // Create a new URL with the timestamp parameter
      const newUrl = `https://www.youtube.com/embed/${videoId}?start=${seconds}&autoplay=1`;
      
      // Update the iframe src
      const iframe = document.querySelector("iframe");
      if (iframe) {
        iframe.src = newUrl;
      }
    } catch (error) {
      console.error("Error seeking to timestamp:", error);
    }
  }

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

  // Function to add a new note with optimizations
  const addNewNote = async (newNote: Note) => {
    try {
      const startTime = Date.now();
      console.log("🔄 Adding new note...");

      // Check if the video already exists in any category
      const videoExists = categories.some((category) =>
        category.notes.some((note) => note.videoUrl === newNote.videoUrl)
      );

      // Prepare optimized payload
      const payload = {
        ...newNote,
        videoId: getVideoId(newNote.videoUrl), // Extract and send video ID
        videoTitle: newNote.videoTitle, // Send title to avoid API call
      };

      if (!videoExists) {
        // If video doesn't exist, add the new note
        const response = await axios.post(
          "http://localhost:3001/api/videos/notes",
          payload,
          { timeout: 30000 } // 30 second timeout for uploads
        );
        
        const saveTime = Date.now() - startTime;
        console.log(`✅ Note saved in ${saveTime}ms`);
        
        if (response.data?.success) {
          refreshNotes();
        }
      } else {
        // If video exists, just add the note to the existing video
        const existingNote = categories
          .flatMap((cat) => cat.notes)
          .find((note) => note.videoUrl === newNote.videoUrl);
          
        const response = await axios.post(
          "http://localhost:3001/api/videos/notes",
          {
            ...payload,
            videoTitle: existingNote?.videoTitle || newNote.videoTitle,
          },
          { timeout: 30000 } // 30 second timeout for uploads
        );
        
        const saveTime = Date.now() - startTime;
        console.log(`✅ Note saved in ${saveTime}ms`);
        
        if (response.data?.success) {
          refreshNotes();
        }
      }
    } catch (error: any) {
      console.error("❌ Error adding note:", error);
      
      if (error.code === 'ECONNABORTED') {
        console.error("❌ Upload timed out - file may be too large");
      }
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
              src={`https://www.youtube.com/embed/${getVideoId(videoUrl)}?autoplay=0`}
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
        <div className="notes-panel-header">
          <UserDropdown userName={user.name} onSignOut={onSignOut} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2>Notes</h2>
          <button
            onClick={refreshNotes}
            style={{
              padding: '5px 10px',
              fontSize: '0.8em',
              backgroundColor: 'var(--yt-red)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
        <div className="notes-container">
          {categories
            .find((cat) => cat.name === selectedCategory)
            ?.notes.filter((note) => note.videoUrl === videoUrl)
            .map((note, index) => {
              // Create a lazy loading component for note content
              const NoteContent = () => {
                const [fullNote, setFullNote] = useState<Note | null>(null);
                const [loading, setLoading] = useState(false);

                useEffect(() => {
                  // If note doesn't have content, fetch it
                  if (!note.content && note._id) {
                    setLoading(true);
                    axios.get(`http://localhost:3001/api/videos/notes/${note._id}`, {
                      timeout: 10000
                    })
                    .then(response => {
                      setFullNote(response.data);
                    })
                    .catch(error => {
                      console.error("Error fetching note content:", error);
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                  } else {
                    setFullNote(note);
                  }
                }, []);

                if (loading) {
                  return <div className="loading">Loading content...</div>;
                }

                const noteToRender = fullNote || note;

                if (noteToRender.contentType === "image+annotation") {
                  const { image, annotation } = JSON.parse(noteToRender.content || '{}');
                  return (
                    <div className="content-area">
                      {image && <img src={image} alt="Screenshot" loading="lazy" />}
                      <div>{annotation}</div>
                    </div>
                  );
                } else if (noteToRender.contentType === "image" || noteToRender.content?.startsWith('data:image/')) {
                  return (
                    <div className="content-area">
                      {noteToRender.content && <img src={noteToRender.content} alt="Screenshot" loading="lazy" />}
                    </div>
                  );
                } else {
                  return (
                    <div className="content-area">
                      <div dangerouslySetInnerHTML={{ __html: noteToRender.content || '' }} />
                    </div>
                  );
                }
              };

              return (
                <div key={note._id || index} className="content-item">
                  <NoteContent />
                  <div className="note-actions">
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
                      <span className="no-timestamp">No Timestamp</span>
                    )}
                    {note._id && (
                      <button
                        className="delete-note-btn"
                        onClick={() => handleDeleteNote(note._id!)}
                        title="Delete note"
                      >
                        <i className="fas fa-trash category-icon" style={{paddingLeft: '6px'}}></i>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

export default MainApp; 
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
  const [selectedCategory, setSelectedCategory] = useState("Entertainment");
  const [videoUrl, setVideoUrl] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved notes from backend
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/api/videos/notes"
        );
        if (response.data) {
          // Group notes by category
          const groupedNotes = response.data.reduce(
            (acc: Category[], note: Note) => {
              const category = acc.find(
                (cat) => cat.name === note.category
              ) || { name: note.category, notes: [] };
              category.notes.push(note);
              return acc;
            },
            categories
          );
          setCategories(groupedNotes);
        }
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    fetchNotes();
  }, []);

  const handleAddNote = async () => {
    if (!newNote.trim() || !videoUrl.trim()) return;

    try {
      setIsLoading(true);
      const response = await axios.post(
        "http://localhost:5000/api/videos/save",
        {
          videoUrl,
          content: newNote,
          category: selectedCategory,
          isPinned: false,
        }
      );

      if (response.data) {
        const updatedCategories = categories.map((category) => {
          if (category.name === selectedCategory) {
            return {
              ...category,
              notes: [...category.notes, response.data],
            };
          }
          return category;
        });

        setCategories(updatedCategories);
        setNewNote("");
        setVideoUrl("");
      }
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = (newCategoryName: string) => {
    if (!newCategoryName.trim()) return;
    setCategories([...categories, { name: newCategoryName.trim(), notes: [] }]);
  };

  return (
    <div className="app-container">
      {/* Sidebar Component */}
      <Sidebar
        notebooks={categories}
        onAddNotebook={handleAddCategory}
        onSelectNotebook={setSelectedCategory}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <h1>YouTube Video Notes</h1>
        <div className="input-container">
          <input
            type="text"
            placeholder="Enter YouTube URL"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="url-input"
          />
        </div>

        {/* Notes List in Main Content */}
        <div>
          <h3>Notes in {selectedCategory}</h3>
          <ul>
            {categories
              .find((cat) => cat.name === selectedCategory)
              ?.notes.map((note, index) => (
                <li key={index} className="note-item">
                  <p className="note-title">{note.videoTitle}</p>
                  <a
                    href={note.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Watch Video
                  </a>
                  <p className="note-content">{note.content}</p>
                  <p className="note-timestamp">
                    {new Date(note.timestamp).toLocaleString()}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      </div>

      {/* Notes Panel */}
      <div className="notes-panel">
        <h2>Notes</h2>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category.name} value={category.name}>
              {category.name}
            </option>
          ))}
        </select>
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
        />
        <button onClick={handleAddNote} disabled={isLoading}>
          {isLoading ? "Saving..." : "Add Note"}
        </button>
      </div>
    </div>
  );
}

export default App;

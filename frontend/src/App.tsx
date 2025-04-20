import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.tsx";

interface Note {
  videoId: string;
  videoTitle: string;
  content: string;
  timestamp: string;
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
  const [videoTitle, setVideoTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Load saved notes from localStorage
  useEffect(() => {
    const savedCategories = localStorage.getItem("youtubeNotes");
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  // Save notes to localStorage whenever categories change
  useEffect(() => {
    localStorage.setItem("youtubeNotes", JSON.stringify(categories));
  }, [categories]);

  const handleAddNote = () => {
    if (!newNote.trim() || !videoTitle.trim()) return;

    const updatedCategories = categories.map((category) => {
      if (category.name === selectedCategory) {
        return {
          ...category,
          notes: [
            ...category.notes,
            {
              videoId: `vid_${Date.now()}`,
              videoTitle,
              content: newNote,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }
      return category;
    });

    setCategories(updatedCategories);
    setNewNote("");
    setVideoTitle("");
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
            placeholder="Enter Video Title"
            value={videoTitle}
            onChange={(e) => setVideoTitle(e.target.value)}
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
        <button onClick={handleAddNote}>Add Note</button>
      </div>
    </div>
  );
}

export default App;

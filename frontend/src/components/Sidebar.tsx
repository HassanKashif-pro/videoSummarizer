import React, { useState, useEffect, useRef } from "react";

// Load Font Awesome
const loadFontAwesome = () => {
  const link = document.createElement("link");
  link.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
  link.rel = "stylesheet";
  document.head.appendChild(link);
};

interface Note {
  videoId: string;
  videoTitle: string;
  content: string;
  timestamp: string;
}

interface Notebook {
  name: string;
  notes: Note[];
}

interface SidebarProps {
  notebooks: Notebook[];
  onAddNotebook: (name: string) => void;
  onSelectNotebook: (name: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  notebooks,
  onAddNotebook,
  onSelectNotebook,
  isOpen,
  setIsOpen,
}) => {
  const [newNotebookName, setNewNotebookName] = useState("");
  const [isAddingNotebook, setIsAddingNotebook] = useState(false);
  const [expandedNotebook, setExpandedNotebook] = useState<string | null>(
    "Entertainment"
  );
  const [openOptionsNotebook, setOpenOptionsNotebook] = useState<string | null>(
    null
  );
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  // Load Font Awesome on component mount
  useEffect(() => {
    loadFontAwesome();
  }, []);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleAddNotebook = () => {
    if (!newNotebookName.trim()) return;
    onAddNotebook(newNotebookName.trim());
    setNewNotebookName("");
    setIsAddingNotebook(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddNotebook();
    }
  };

  const toggleNotebook = (notebookName: string) => {
    setExpandedNotebook(
      expandedNotebook === notebookName ? null : notebookName
    );
    onSelectNotebook(notebookName);
  };

  const handleOptionsClick = (notebookName: string) => {
    setOpenOptionsNotebook(
      openOptionsNotebook === notebookName ? null : notebookName
    );
  };

  const handleOptionClick = (option: string, notebookName: string) => {
    console.log(`${option} clicked for notebook: ${notebookName}`);
    setOpenOptionsNotebook(null); // Close the options menu after clicking an option
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      optionsMenuRef.current &&
      !optionsMenuRef.current.contains(event.target as Node)
    ) {
      setOpenOptionsNotebook(null);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [optionsMenuRef]);

  // Define a mapping of category names to Font Awesome icons
  const categoryIcons: { [key: string]: string } = {
    "Science & Technology": "fa-flask",
    Education: "fa-graduation-cap",
    Gaming: "fa-gamepad",
    Entertainment: "fa-film",
    Uncategorized: "fa-folder-open", // You can choose a different icon
    // Add more categories and their corresponding icons here
  };

  return (
    <div className="sidebar-container">
      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="sidebar-content">
          {/* Header with Title and Toggle Icon - Always Visible */}
          <div className="sidebar-header">
            <h1>{isOpen ? "SUMMIFY" : ""}</h1>
            <div className="sidebar-toggle-icon">
              <i
                className={`fas ${isOpen ? "fa-times" : "fa-bars"}`}
                onClick={toggleSidebar}
              ></i>
            </div>
          </div>

          {/* Sidebar Content - Only Visible When Open */}
          {isOpen && (
            <>
              <h2>YouTube Categories</h2>
              <ul className="notebook-list">
                {notebooks.map((notebook, index) => (
                  <li key={index} className="notebook-item">
                    <div className="notebook-header">
                      <span
                        className="notebook-toggle"
                        onClick={() => toggleNotebook(notebook.name)}
                      >
                        <i
                          className={`fas ${
                            expandedNotebook === notebook.name
                              ? "fa-chevron-down"
                              : "fa-chevron-right"
                          }`}
                        ></i>
                        {/* Add the icon here */}
                        {categoryIcons[notebook.name] && (
                          <i
                            className={`fas ${
                              categoryIcons[notebook.name]
                            } category-icon`}
                          ></i>
                        )}
                        {notebook.name}
                      </span>
                      <div className="notebook-options">
                        <i
                          className="fas fa-ellipsis-v options-icon"
                          onClick={() => handleOptionsClick(notebook.name)}
                        ></i>
                        {openOptionsNotebook === notebook.name && (
                          <div
                            className="options-menu open"
                            ref={optionsMenuRef}
                          >
                            <button
                              onClick={() =>
                                handleOptionClick("Rename", notebook.name)
                              }
                            >
                              Rename
                            </button>
                            <button
                              onClick={() =>
                                handleOptionClick("Delete", notebook.name)
                              }
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {expandedNotebook === notebook.name && (
                      <ul className="notes-list">
                        {notebook.notes.map((note, noteIndex) => (
                          <li key={noteIndex} className="note-item">
                            <p className="note-title">{note.videoTitle}</p>
                            <p className="note-content">{note.content}</p>
                            <p className="note-timestamp">
                              {new Date(note.timestamp).toLocaleString()}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              {/* Add New Notebook Section - Sticky at Bottom */}
              <div className="add-notebook-sticky">
                {isAddingNotebook ? (
                  <div className="add-notebook-form">
                    <input
                      type="text"
                      placeholder="New notebook name"
                      value={newNotebookName}
                      onChange={(e) => setNewNotebookName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingNotebook(true)}
                    className="add-notebook-button"
                  >
                    + Add New Notebook
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

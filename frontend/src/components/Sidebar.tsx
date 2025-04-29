import React, { useState, useEffect, useRef } from "react";
import "../styles.css"; // Import the CSS file

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
  videoUrl: string;
  content: string;
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
  onSelectVideo: (url: string, title: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  notebooks,
  onAddNotebook,
  onSelectNotebook,
  isOpen,
  setIsOpen,
  onSelectVideo,
}) => {
  const [newNotebookName, setNewNotebookName] = useState("");
  const [isAddingNotebook, setIsAddingNotebook] = useState(false);
  const [expandedNotebook, setExpandedNotebook] = useState<string | null>(null);
  const [openOptionsNotebook, setOpenOptionsNotebook] = useState<string | null>(
    null
  );
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);

  // Load Font Awesome when component mounts
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

  const handleOptionsClick = (e: React.MouseEvent, notebookName: string) => {
    e.stopPropagation();
    setOpenOptionsNotebook(
      openOptionsNotebook === notebookName ? null : notebookName
    );
  };

  const handleOptionClick = (option: string, notebookName: string) => {
    console.log(`${option} clicked for notebook: ${notebookName}`);
    setOpenOptionsNotebook(null);
  };

  // Close options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        optionsMenuRef.current &&
        !optionsMenuRef.current.contains(event.target as Node)
      ) {
        setOpenOptionsNotebook(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const categoryIcons: { [key: string]: string } = {
    "Science & Technology": "fa-flask",
    Education: "fa-graduation-cap",
    Gaming: "fa-gamepad",
    Entertainment: "fa-film",
    Uncategorized: "fa-folder-open",
  };

  // Initialize expanded notebook
  useEffect(() => {
    if (isOpen && notebooks.length > 0 && expandedNotebook === null) {
      setExpandedNotebook(notebooks[0].name);
      onSelectNotebook(notebooks[0].name);
    }
  }, [isOpen, notebooks, expandedNotebook, onSelectNotebook]);

  const handleVideoClick = (url: string, title: string) => {
    onSelectVideo(url, title);
  };

  return (
    <div className="sidebar-container">
      <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
        <div className="sidebar-content">
          <div className="sidebar-header">
            <h1>{isOpen ? "SUMMIFY" : ""}</h1>
            <div className="sidebar-toggle-icon">
              <i
                className={`fas ${isOpen ? "fa-times" : "fa-bars"}`}
                onClick={toggleSidebar}
              ></i>
            </div>
          </div>

          {isOpen && (
            <>
              <h2>Videos</h2>
              <ul className="notebook-list">
                {notebooks.map((notebook) => (
                  <li key={notebook.name} className="notebook-item">
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
                          onClick={(e) => handleOptionsClick(e, notebook.name)}
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
                              <i className="fas fa-edit"></i>
                              Rename
                            </button>
                            <button
                              onClick={() =>
                                handleOptionClick("Delete", notebook.name)
                              }
                            >
                              <i className="fas fa-trash"></i>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {expandedNotebook === notebook.name && (
                      <ul className="notes-list">
                        {Object.entries(
                          notebook.notes.reduce((acc, note) => {
                            if (!acc[note.videoUrl]) acc[note.videoUrl] = [];
                            acc[note.videoUrl].push(note);
                            return acc;
                          }, {} as Record<string, Note[]>)
                        ).map(([videoUrl, notesForVideo]) => (
                          <li
                            key={videoUrl}
                            className="note-item video-title-item"
                            onClick={() =>
                              handleVideoClick(
                                videoUrl,
                                notesForVideo[0].videoTitle
                              )
                            }
                          >
                            <div className="note-title">
                              <img
                                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIyLjUxMDUgNi42NjQ5MUMyMi4zODMyIDYuMTk0NjggMjIuMTM1IDUuNzY1OTggMjEuNzkwNSA1LjQyMTUyQzIxLjQ0NjEgNS4wNzcwNiAyMS4wMTc0IDQuODI4ODUgMjAuNTQ3MSA0LjcwMTZDMTguODI1NyA0LjIzMjEyIDExLjg5NzIgNC4yMzIxMiAxMS44OTcyIDQuMjMyMTJDMTEuODk3MiA0LjIzMjEyIDQuOTY4NzUgNC4yNDYzNCAzLjI0NzMgNC43MTU4M0MyLjc3NzA3IDQuODQzMDcgMi4zNDgzOCA1LjA5MTI4IDIuMDAzOTIgNS40MzU3NUMxLjY1OTQ1IDUuNzgwMjEgMS40MTEyNCA2LjIwODkgMS4yODQgNi42NzkxM0MwLjc2MzI5NiA5LjczNzkxIDAuNTYxMjc1IDE0LjM5ODYgMS4yOTgyMyAxNy4zMzVDMS40MjU0NyAxNy44MDUzIDEuNjczNjggMTguMjM0IDIuMDE4MTQgMTguNTc4NEMyLjM2MjYxIDE4LjkyMjkgMi43OTEzIDE5LjE3MTEgMy4yNjE1MyAxOS4yOTgzQzQuOTgyOTggMTkuNzY3OCAxMS45MTE1IDE5Ljc2NzggMTEuOTExNSAxOS43Njc4QzExLjkxMTUgMTkuNzY3OCAxOC44Mzk5IDE5Ljc2NzggMjAuNTYxNCAxOS4yOTgzQzIxLjAzMTYgMTkuMTcxMSAyMS40NjAzIDE4LjkyMjkgMjEuODA0OCAxOC41Nzg0QzIyLjE0OTIgMTguMjM0IDIyLjM5NzQgMTcuODA1MyAyMi41MjQ3IDE3LjMzNUMyMy4wNzM4IDE0LjI3MiAyMy4yNDMxIDkuNjE0MTMgMjIuNTEwNSA2LjY2NDkxWiIgZmlsbD0iI0ZGMDAwMCIvPgo8cGF0aCBkPSJNOS42OTE4OSAxNS4zMjkxTDE1LjQzOTUgMTJMOS42OTE4OSA4LjY3MDlWMTUuMzI5MVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yMi41MTg1IDYuOTMxNzVDMjIuMzkzNCA2LjQ2OTI4IDIyLjE0OTMgNi4wNDc2NyAyMS44MTA1IDUuNzA4ODlDMjEuNDcxNyA1LjM3MDEyIDIxLjA1MDEgNS4xMjYgMjAuNTg3NiA1LjAwMDg2QzE4Ljg5NDYgNC41MzkxMiAxMi4wODA1IDQuNTM5MTIgMTIuMDgwNSA0LjUzOTEyQzEyLjA4MDUgNC41MzkxMiA1LjI2NjQyIDQuNTUzMTIgMy41NzMzOSA1LjAxNDg1QzMuMTEwOTIgNS4xMzk5OSAyLjY4OTMxIDUuMzg0MTEgMi4zNTA1MyA1LjcyMjg4QzIuMDExNzYgNi4wNjE2NiAxLjc2NzY0IDYuNDgzMjggMS42NDI1IDYuOTQ1NzRDMS4xMzAzOSA5Ljk1NDAyIDAuOTMxNzA2IDE0LjUzNzggMS42NTY0OSAxNy40MjU3QzEuNzgxNjMgMTcuODg4MiAyLjAyNTc1IDE4LjMwOTggMi4zNjQ1MiAxOC42NDg2QzIuNzAzMyAxOC45ODc0IDMuMTI0OTEgMTkuMjMxNSAzLjU4NzM4IDE5LjM1NjZDNS4yODA0MSAxOS44MTg0IDEyLjA5NDUgMTkuODE4NCAxMi4wOTQ1IDE5LjgxODRDMTIuMDk0NSAxOS44MTg0IDE4LjkwODYgMTkuODE4NCAyMC42MDE2IDE5LjM1NjZDMjEuMDY0MSAxOS4yMzE1IDIxLjQ4NTcgMTguOTg3NCAyMS44MjQ1IDE4LjY0ODZDMjIuMTYzMyAxOC4zMDk4IDIyLjQwNzQgMTcuODg4MiAyMi41MzI1IDE3LjQyNTdDMjMuMDcyNiAxNC40MTMzIDIzLjIzOTEgOS44MzIyOSAyMi41MTg1IDYuOTMxNzVaIiBmaWxsPSIjRkYwMDAwIi8+CjxwYXRoIGQ9Ik05LjkxMTg3IDE1LjQ1MjhMMTUuNTY0NiAxMi4xNzg3TDkuOTExODcgOC45MDQ2VjE1LjQ1MjhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K"
                                alt="YouTube"
                                className="video-icon"
                              />
                              <span className="video-title-text">
                                {notesForVideo[0].videoTitle}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>

              <div className="add-notebook-sticky">
                {isAddingNotebook ? (
                  <div className="add-notebook-form">
                    <input
                      type="text"
                      placeholder="New category name"
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
                    <i className="fas fa-plus"></i>
                    Add New Category
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

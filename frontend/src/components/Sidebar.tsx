import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
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
  onRefreshNotes?: () => void; // Add optional refresh callback
}

const Sidebar: React.FC<SidebarProps> = ({
  notebooks,
  onAddNotebook,
  onSelectNotebook,
  isOpen,
  setIsOpen,
  onSelectVideo,
  onRefreshNotes,
}) => {
  const [newNotebookName, setNewNotebookName] = useState("");
  const [isAddingNotebook, setIsAddingNotebook] = useState(false);
  const [expandedNotebook, setExpandedNotebook] = useState<string | null>(null);
  const [openOptionsNotebook, setOpenOptionsNotebook] = useState<string | null>(
    null
  );
  const [openVideoOptions, setOpenVideoOptions] = useState<string | null>(null);
  const [draggedVideo, setDraggedVideo] = useState<{url: string, title: string} | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const optionsMenuRef = useRef<HTMLDivElement | null>(null);
  const videoOptionsMenuRef = useRef<HTMLDivElement | null>(null);

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

  const handleVideoOptionsClick = (e: React.MouseEvent, videoUrl: string) => {
    e.stopPropagation();
    
    const wasOpen = openVideoOptions === videoUrl;
    setOpenVideoOptions(wasOpen ? null : videoUrl);
    
    if (!wasOpen) {
      // Calculate position for the menu
      setTimeout(() => {
        const menu = document.querySelector('.video-options-menu') as HTMLElement;
        if (menu) {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          menu.style.top = `${rect.bottom + 5}px`;
          menu.style.left = `${Math.max(10, rect.left - 150)}px`; // Ensure it doesn't go off-screen
        }
      }, 10);
    }
  };

  const handleVideoOptionClick = (option: string, videoUrl: string, videoTitle: string) => {
    console.log(`${option} clicked for video: ${videoTitle}`);
    
    if (option === "Remove" || option === "Delete") {
      // TODO: Implement remove video functionality
      console.log("Remove video functionality to be implemented");
    } else if (option === "Copy Link" || option === "Share") {
      // Copy video URL to clipboard
      navigator.clipboard.writeText(videoUrl).then(() => {
        console.log("Video URL copied to clipboard");
        // TODO: Show toast notification that link was copied
      });
    } else if (option === "Open in New Tab" || option === "Export") {
      // Open video in new tab
      window.open(videoUrl, '_blank');
    } else if (option === "Rename") {
      // TODO: Implement rename functionality
      console.log("Rename video functionality to be implemented");
    } else if (option === "Move") {
      // TODO: Implement move to category functionality (or keep drag & drop)
      console.log("Move video functionality to be implemented");
    }
    
    setOpenVideoOptions(null);
  };

  // Drag and Drop Functions
  const handleDragStart = (e: React.DragEvent, videoUrl: string, videoTitle: string) => {
    e.stopPropagation();
    console.log("🟢 DRAG START:", { videoUrl, videoTitle });
    setDraggedVideo({ url: videoUrl, title: videoTitle });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", videoUrl);
    
    // Add visual feedback to the dragged item
    const target = e.target as HTMLElement;
    target.style.opacity = "0.5";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    console.log("🔴 DRAG END");
    setDraggedVideo(null);
    setDragOverCategory(null);
    
    // Reset visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = "1";
  };

  const handleDragOver = (e: React.DragEvent, categoryName: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    console.log("🟡 DRAG OVER:", categoryName);
    setDragOverCategory(categoryName);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🟠 DRAG LEAVE");
    // Only clear if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      setDragOverCategory(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("🎯 DROP EVENT TRIGGERED!");
    console.log("Target Category:", targetCategory);
    console.log("Dragged Video:", draggedVideo);
    
    if (!draggedVideo) {
      console.log("❌ No dragged video found!");
      return;
    }

    // Find the current category of the dragged video
    const currentCategory = notebooks.find(notebook => 
      notebook.notes.some(note => note.videoUrl === draggedVideo.url)
    )?.name;

    console.log("Current Category:", currentCategory);

    // Don't do anything if dropping on the same category
    if (currentCategory === targetCategory) {
      console.log("⚠️ Dropping on same category, no action needed");
      setDraggedVideo(null);
      setDragOverCategory(null);
      return;
    }

    try {
      console.log(`🔄 Moving video "${draggedVideo.title}" from "${currentCategory}" to "${targetCategory}"`);
      
      // Call API to update video category
      const response = await axios.put("http://localhost:3001/api/videos/update-category", {
        videoUrl: draggedVideo.url,
        newCategory: targetCategory
      });

      console.log("API Response:", response.data);

      if (response.data.success) {
        console.log(`✅ Successfully moved video to ${targetCategory}`);
        
        // Refresh notes to update the UI
        if (onRefreshNotes) {
          console.log("🔄 Calling refresh notes...");
          onRefreshNotes();
        } else {
          console.log("⚠️ No refresh function available");
        }
        
        // Show success feedback
        const categoryElement = e.currentTarget as HTMLElement;
        categoryElement.style.backgroundColor = "#d4edda";
        setTimeout(() => {
          categoryElement.style.backgroundColor = "";
        }, 1000);
      } else {
        console.log("❌ API returned unsuccessful response");
      }
    } catch (error) {
      console.error("❌ Error moving video:", error);
      
      // Show more detailed error info
      if (axios.isAxiosError(error)) {
        console.error("Axios Error Details:", {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
      }
      
      // Show error feedback
      const categoryElement = e.currentTarget as HTMLElement;
      categoryElement.style.backgroundColor = "#f8d7da";
      setTimeout(() => {
        categoryElement.style.backgroundColor = "";
      }, 1000);
    } finally {
      setDraggedVideo(null);
      setDragOverCategory(null);
    }
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
      
      if (
        videoOptionsMenuRef.current &&
        !videoOptionsMenuRef.current.contains(event.target as Node)
      ) {
        setOpenVideoOptions(null);
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

  // Function to get icon for any category, with default folder icon for custom categories
  const getCategoryIcon = (categoryName: string): string => {
    return categoryIcons[categoryName] || "fa-folder"; // Default folder icon for custom categories
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
                    <div
                      className={`notebook-header ${dragOverCategory === notebook.name ? 'drag-over' : ''}`}
                      onClick={() => toggleNotebook(notebook.name)}
                      onDragOver={(e) => handleDragOver(e, notebook.name)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, notebook.name)}
                      style={{ 
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        backgroundColor: dragOverCategory === notebook.name ? "rgba(204, 0, 0, 0.1)" : ""
                      }}
                    >
                      <span className="notebook-toggle">
                        <i
                          className={`fas ${
                            expandedNotebook === notebook.name
                              ? "fa-chevron-down"
                              : "fa-chevron-right"
                          }`}
                        ></i>
                        <i
                          className={`fas ${getCategoryIcon(notebook.name)} category-icon`}
                        ></i>
                        {notebook.name}
                        
                      </span>
                      <div
                        className="notebook-options"
                        onClick={(e) => e.stopPropagation()}
                      >
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOptionClick("Rename", notebook.name);
                              }}
                            >
                              <i className="fas fa-edit"></i>
                              Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOptionClick("Delete", notebook.name);
                              }}
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
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, videoUrl, notesForVideo[0].videoTitle)}
                            onDragEnd={handleDragEnd}
                            onClick={() =>
                              handleVideoClick(
                                videoUrl,
                                notesForVideo[0].videoTitle
                              )
                            }
                            style={{
                              cursor: "grab",
                              transition: "all 0.2s ease",
                              position: "relative",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between"
                            }}
                          >
                            <div className="note-title" style={{ flex: 1, display: "flex", alignItems: "center" }}>
                              <i className="fas fa-grip-vertical" style={{ 
                                marginRight: "8px", 
                                color: "var(--yt-text-tertiary)",
                                fontSize: "0.8em"
                              }}></i>
                              <img
                                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIyLjUxMDUgNi42NjQ5MUMyMi4zODMyIDYuMTk0NjggMjIuMTM1IDUuNzY1OTggMjEuNzkwNSA1LjQyMTUyQzIxLjQ0NjEgNS4wNzcwNiAyMS4wMTc0IDQuODI4ODUgMjAuNTQ3MSA0LjcwMTZDMTguODI1NyA0LjIzMjEyIDExLjg5NzIgNC4yMzIxMiAxMS44OTcyIDQuMjMyMTJDMTEuODk3MiA0LjIzMjEyIDQuOTY4NzUgNC4yNDYzNCAzLjI0NzMgNC43MTU4M0MyLjc3NzA3IDQuODQzMDcgMi4zNDgzOCA1LjA5MTI4IDIuMDAzOTIgNS40MzU3NUMxLjY1OTQ1IDUuNzgwMjEgMS40MTEyNCA2LjIwODkgMS4yODQgNi42NzkxM0MwLjc2MzI5NiA5LjczNzkxIDAuNTYxMjc1IDE0LjM5ODYgMS4yOTgyMyAxNy4zMzVDMS40MjU0NyAxNy44MDUzIDEuNjczNjggMTguMjM0IDIuMDE4MTQgMTguNTc4NEMyLjM2MjYxIDE4LjkyMjkgMi43OTEzIDE5LjE3MTEgMy4yNjE1MyAxOS4yOTgzQzQuOTgyOTggMTkuNzY3OCAxMS45MTE1IDE5Ljc2NzggMTEuOTExNSAxOS43Njc4QzExLjkxMTUgMTkuNzY3OCAxOC44Mzk5IDE5Ljc2NzggMjAuNTYxNCAxOS4yOTgzQzIxLjAzMTYgMTkuMTcxMSAyMS40NjAzIDE4LjkyMjkgMjEuODA0OCAxOC41Nzg0QzIyLjE0OTIgMTguMjM0IDIyLjM5NzQgMTcuODA1MyAyMi41MjQ3IDE3LjMzNUMyMy4wNzM4IDE0LjI3MiAyMy4yNDMxIDkuNjE0MTMgMjIuNTEwNSA2LjY2NDkxWiIgZmlsbD0iI0ZGMDAwMCIvPgo8cGF0aCBkPSJNOS42OTE4OSAxNS4zMjkxTDE1LjQzOTUgMTJMOS42OTE4OSA4LjY3MDlWMTUuMzI5MVoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0yMi41MTg1IDYuOTMxNzVDMjIuMzkzNCA2LjQ2OTI4IDIyLjE0OTMgNi4wNDc2NyAyMS44MTA1IDUuNzA4ODlDMjEuNDcxNyA1LjM3MDEyIDIxLjA1MDEgNS4xMjYgMjAuNTg3NiA1LjAwMDg2QzE4Ljg5NDYgNC41MzkxMiAxMi4wODA1IDQuNTM5MTIgMTIuMDgwNSA0LjUzOTEyQzEyLjA4MDUgNC41MzkxMiA1LjI2NjQyIDQuNTUzMTIgMy41NzMzOSA1LjAxNDg1QzMuMTEwOTIgNS4xMzk5OSAyLjY4OTMxIDUuMzg0MTEgMi4zNTA1MyA1LjcyMjg4QzIuMDExNzYgNi4wNjE2NiAxLjc2NzY0IDYuNDgzMjggMS42NDI1IDYuOTQ1NzRDMS4xMzAzOSA5Ljk1NDAyIDAuOTMxNzA2IDE0LjUzNzggMS42NTY0OSAxNy40MjU3QzEuNzgxNjMgMTcuODg4MiAyLjAyNTc1IDE4LjMwOTggMi4zNjQ1MiAxOC42NDg2QzIuNzAzMyAxOC45ODc0IDMuMTI0OTEgMTkuMjMxNSAzLjU4NzM4IDE5LjM1NjZDNS4yODA0MSAxOS44MTg0IDEyLjA5NDUgMTkuODE4NCAxMi4wOTQ1IDE5LjgxODRDMTIuMDk0NSAxOS44MTg0IDE4LjkwODYgMTkuODE4NCAyMC42MDE2IDE5LjM1NjZDMjEuMDY0MSAxOS4yMzE1IDIxLjQ4NTcgMTguOTg3NCAyMS44MjQ1IDE4LjY0ODZDMjIuMTYzMyAxOC4zMDk4IDIyLjQwNzQgMTcuODg4MiAyMi41MzI1IDE3LjQyNTdDMjMuMDcyNiAxNC40MTMzIDIzLjIzOTEgOS44MzIyOSAyMi41MTg1IDYuOTMxNzVaIiBmaWxsPSIjRkYwMDAwIi8+CjxwYXRoIGQ9Ik05LjkxMTg3IDE1LjQ1MjhMMTUuNTY0NiAxMi4xNzg3TDkuOTExODcgOC45MDQ2VjE1LjQ1MjhaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K"
                                alt="YouTube"
                                className="video-icon"
                              />
                              <span className="video-title-text">
                                {notesForVideo[0].videoTitle}
                              </span>
                            </div>
                            
                            {/* Three dot menu for each video */}
                            <div
                              className="video-options"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                marginLeft: "8px"
                              }}
                            >
                              <i
                                className="fas fa-ellipsis-v video-options-icon"
                                onClick={(e) => handleVideoOptionsClick(e, videoUrl)}
                                style={{
                                  cursor: "pointer",
                                  fontSize: "1em",
                                  color: "var(--yt-text-secondary)",
                                  padding: "6px",
                                  borderRadius: "50%",
                                  transition: "all 0.2s ease",
                                  opacity: "0.7"
                                }}
                              ></i>
                              {openVideoOptions === videoUrl && (
                                <div
                                  className="video-options-menu"
                                  ref={videoOptionsMenuRef}
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVideoOptionClick("Rename", videoUrl, notesForVideo[0].videoTitle);
                                    }}
                                  >
                                    <i className="fas fa-edit"></i>
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVideoOptionClick("Share", videoUrl, notesForVideo[0].videoTitle);
                                    }}
                                  >
                                    <i className="fas fa-share"></i>
                                    Share
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVideoOptionClick("Move", videoUrl, notesForVideo[0].videoTitle);
                                    }}
                                  >
                                    <i className="fas fa-arrows-alt"></i>
                                    Move
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVideoOptionClick("Open in New Tab", videoUrl, notesForVideo[0].videoTitle);
                                    }}
                                  >
                                    <i className="fas fa-external-link-alt"></i>
                                    Export
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVideoOptionClick("Remove", videoUrl, notesForVideo[0].videoTitle);
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                    Delete
                                  </button>
                                </div>
                              )}
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

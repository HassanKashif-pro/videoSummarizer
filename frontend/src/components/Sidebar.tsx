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
  const [videoOptionsAnchor, setVideoOptionsAnchor] = useState<HTMLElement | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameVideoData, setRenameVideoData] = useState<{url: string, title: string} | null>(null);
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportCategoryData, setExportCategoryData] = useState<{name: string, videos: any[]} | null>(null);
  const [exportFormat, setExportFormat] = useState("pdf");
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
    
    if (option === "Edit") {
      // TODO: Implement category rename functionality
      showToast("Category rename coming soon!");
    } else if (option === "Export") {
      // Open export modal with category data
      const categoryVideos = notebooks.find(nb => nb.name === notebookName)?.notes || [];
      if (categoryVideos.length === 0) {
        showToast("No videos to export in this category");
        return;
      }
      
      setExportCategoryData({ name: notebookName, videos: categoryVideos });
      setShowExportModal(true);
    } else if (option === "Delete") {
      // TODO: Implement category deletion
      showToast("Category deletion coming soon!");
    }
    
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
      // Delete without confirmation
      deleteVideo(videoUrl);
    } else if (option === "Copy Link" || option === "Share") {
      // Copy video URL to clipboard
      navigator.clipboard.writeText(videoUrl).then(() => {
        // Show temporary success message
        showToast("Video link copied to clipboard!");
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = videoUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast("Video link copied to clipboard!");
      });
    } else if (option === "Open in New Tab" || option === "Export") {
      // Open video in new tab
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    } else if (option === "Rename") {
      // Open rename modal
      setRenameVideoData({ url: videoUrl, title: videoTitle });
      setNewVideoTitle(videoTitle);
      setShowRenameModal(true);
    }
    
    setOpenVideoOptions(null);
  };

  // Helper function to show temporary toast messages
  const showToast = (message: string) => {
    // Create toast element
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--yt-red);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: inherit;
      font-size: 0.9em;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  // Function to delete a video
  const deleteVideo = async (videoUrl: string) => {
    try {
      const deleteResponse = await axios.delete(`http://localhost:3001/api/videos/${encodeURIComponent(videoUrl)}`);

      if (deleteResponse.data.success) {
        showToast("Video deleted successfully!");
        if (onRefreshNotes) {
          onRefreshNotes();
        }
      } else {
        showToast("Failed to delete video");
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      showToast("Error deleting video");
    }
  };

  // Function to handle rename modal
  const handleRenameSubmit = async () => {
    if (!renameVideoData || !newVideoTitle.trim() || newVideoTitle === renameVideoData.title) {
      return;
    }

    try {
      const renameResponse = await axios.put(`http://localhost:3001/api/videos/rename`, {
        videoUrl: renameVideoData.url,
        newTitle: newVideoTitle.trim()
      });

      if (renameResponse.data.success) {
        showToast("Video renamed successfully!");
        if (onRefreshNotes) {
          onRefreshNotes();
        }
        setShowRenameModal(false);
        setRenameVideoData(null);
        setNewVideoTitle("");
      } else {
        showToast("Failed to rename video");
      }
    } catch (error) {
      console.error("Error renaming video:", error);
      showToast("Error renaming video");
    }
  };

  const handleRenameCancel = () => {
    setShowRenameModal(false);
    setRenameVideoData(null);
    setNewVideoTitle("");
  };

  // Export modal handlers
  const handleExportCancel = () => {
    setShowExportModal(false);
    setExportCategoryData(null);
    setExportFormat("pdf");
  };

  const handleExportSubmit = () => {
    if (!exportCategoryData) return;

    const { name, videos } = exportCategoryData;

    try {
      if (exportFormat === "pdf") {
        exportAsPDF(name, videos);
      } else if (exportFormat === "markdown-local") {
        exportAsMarkdown(name, videos, true);
      } else if (exportFormat === "markdown-cloud") {
        exportAsMarkdown(name, videos, false);
      } else if (exportFormat === "json") {
        exportAsJSON(name, videos);
      } else if (exportFormat === "txt") {
        exportAsText(name, videos);
      }

      showToast(`Exported ${videos.length} videos from ${name}`);
      handleExportCancel();
    } catch (error) {
      console.error("Export error:", error);
      showToast("Failed to export data");
    }
  };

  // Export format functions
  const exportAsPDF = (categoryName: string, videos: any[]) => {
    // For now, create a simple text file (PDF generation would require a library like jsPDF)
    const content = `# ${categoryName} - Video Notes\n\n` +
      videos.map(video => 
        `## ${video.videoTitle}\n` +
        `**URL:** ${video.videoUrl}\n` +
        `**Category:** ${video.category}\n` +
        `**Timestamp:** ${video.timestamp}\n` +
        `**Content:** ${video.content}\n` +
        `**Created:** ${new Date(video.createdAt).toLocaleDateString()}\n\n---\n\n`
      ).join('');

    downloadFile(content, `${categoryName}_notes.txt`, 'text/plain');
    showToast("PDF export coming soon! Downloaded as text file for now.");
  };

  const exportAsMarkdown = (categoryName: string, videos: any[], localImages: boolean) => {
    const imageType = localImages ? 'local' : 'cloud';
    const content = `# ${categoryName} - Video Notes\n\n` +
      videos.map(video => 
        `## [${video.videoTitle}](${video.videoUrl})\n\n` +
        `- **Category:** ${video.category}\n` +
        `- **Timestamp:** ${video.timestamp}\n` +
        `- **Created:** ${new Date(video.createdAt).toLocaleDateString()}\n\n` +
        `### Content\n${video.content}\n\n---\n\n`
      ).join('');

    downloadFile(content, `${categoryName}_notes_${imageType}.md`, 'text/markdown');
  };

  const exportAsJSON = (categoryName: string, videos: any[]) => {
    const data = {
      category: categoryName,
      exportDate: new Date().toISOString(),
      videoCount: videos.length,
      videos: videos.map(video => ({
        title: video.videoTitle,
        url: video.videoUrl,
        category: video.category,
        timestamp: video.timestamp,
        content: video.content,
        contentType: video.contentType,
        createdAt: video.createdAt,
        isPinned: video.isPinned
      }))
    };

    downloadFile(JSON.stringify(data, null, 2), `${categoryName}_notes.json`, 'application/json');
  };

  const exportAsText = (categoryName: string, videos: any[]) => {
    const content = `${categoryName.toUpperCase()} - VIDEO NOTES\n` +
      `=${'='.repeat(categoryName.length + 15)}\n\n` +
      videos.map((video, index) => 
        `${index + 1}. ${video.videoTitle}\n` +
        `   URL: ${video.videoUrl}\n` +
        `   Category: ${video.category}\n` +
        `   Timestamp: ${video.timestamp}\n` +
        `   Content: ${video.content}\n` +
        `   Created: ${new Date(video.createdAt).toLocaleDateString()}\n\n`
      ).join('');

    downloadFile(content, `${categoryName}_notes.txt`, 'text/plain');
  };

  // Helper function to download files
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Function to show move dialog
  const showMoveDialog = (videoUrl: string, videoTitle: string) => {
    const categories = notebooks.map(nb => nb.name);
    const currentCategory = notebooks.find(notebook => 
      notebook.notes.some(note => note.videoUrl === videoUrl)
    )?.name;

    const availableCategories = categories.filter(cat => cat !== currentCategory);
    
    if (availableCategories.length === 0) {
      showToast("No other categories available");
      return;
    }

    // Create a simple selection dialog
    const categoryList = availableCategories.map((cat, index) => `${index + 1}. ${cat}`).join('\n');
    const selection = window.prompt(
      `Move "${videoTitle}" to which category?\n\n${categoryList}\n\nEnter the number (1-${availableCategories.length}):`
    );

    if (selection) {
      const index = parseInt(selection) - 1;
      if (index >= 0 && index < availableCategories.length) {
        moveVideo(videoUrl, availableCategories[index]);
      } else {
        showToast("Invalid selection");
      }
    }
  };

  // Function to move a video to another category
  const moveVideo = async (videoUrl: string, targetCategory: string) => {
    try {
      const response = await axios.put("http://localhost:3001/api/videos/update-category", {
        videoUrl,
        newCategory: targetCategory
      });

      if (response.data.success) {
        showToast(`Video moved to ${targetCategory}!`);
        if (onRefreshNotes) {
          onRefreshNotes();
        }
      } else {
        showToast("Failed to move video");
      }
    } catch (error) {
      console.error("Error moving video:", error);
      showToast("Error moving video");
    }
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
                        {openOptionsNotebook === notebook.name && (
                          <div
                            className="options-menu open"
                            ref={optionsMenuRef}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOptionClick("Edit", notebook.name);
                              }}
                            >
                              <i className="fas fa-edit"></i>
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOptionClick("Export", notebook.name);
                              }}
                            >
                              <i className="fas fa-external-link-alt"></i>
                              Export
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

      {/* Rename Modal */}
      {showRenameModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.2em',
                fontWeight: '600',
                color: 'var(--yt-text-primary)'
              }}>
                Rename video
              </h3>
              <button
                onClick={handleRenameCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5em',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
            
            <div style={{
              marginBottom: '20px'
            }}>
              <input
                type="text"
                value={newVideoTitle}
                onChange={(e) => setNewVideoTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '1em',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--yt-red)'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameSubmit();
                  } else if (e.key === 'Escape') {
                    handleRenameCancel();
                  }
                }}
                autoFocus
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={handleRenameCancel}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontFamily: 'inherit',
                  color: '#666',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                disabled={!newVideoTitle.trim() || newVideoTitle === renameVideoData?.title}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: newVideoTitle.trim() && newVideoTitle !== renameVideoData?.title ? 'var(--yt-red)' : '#ccc',
                  color: 'white',
                  cursor: newVideoTitle.trim() && newVideoTitle !== renameVideoData?.title ? 'pointer' : 'not-allowed',
                  fontSize: '0.9em',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--yt-red-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = 'var(--yt-red)';
                  }
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && exportCategoryData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.2em',
                fontWeight: '600',
                color: 'var(--yt-text-primary)'
              }}>
                Export notes from "{exportCategoryData.name}"
              </h3>
              <button
                onClick={handleExportCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5em',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '4px',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>
            
            <div style={{
              marginBottom: '20px'
            }}>
              <p style={{
                color: '#666',
                fontSize: '0.9em',
                marginBottom: '16px',
                margin: '0 0 16px 0'
              }}>
                How would you like to export your notes?
              </p>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="pdf"
                    checked={exportFormat === "pdf"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      marginRight: '8px',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <span style={{ fontSize: '0.9em', color: '#333' }}>PDF file</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="markdown-local"
                    checked={exportFormat === "markdown-local"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      marginRight: '8px',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <span style={{ fontSize: '0.9em', color: '#333' }}>Markdown file (local images)</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="markdown-cloud"
                    checked={exportFormat === "markdown-cloud"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      marginRight: '8px',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <span style={{ fontSize: '0.9em', color: '#333' }}>Markdown file (cloud images)</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === "json"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      marginRight: '8px',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <span style={{ fontSize: '0.9em', color: '#333' }}>JSON file (structured data)</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '6px',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="txt"
                    checked={exportFormat === "txt"}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      marginRight: '8px',
                      transform: 'scale(1.2)'
                    }}
                  />
                  <span style={{ fontSize: '0.9em', color: '#333' }}>Text file (simple format)</span>
                </label>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={handleExportCancel}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontFamily: 'inherit',
                  color: '#666',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                Cancel
              </button>
              <button
                onClick={handleExportSubmit}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: 'var(--yt-red)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--yt-red-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--yt-red)'}
              >
                Export notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;

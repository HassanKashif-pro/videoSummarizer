import { useState } from "react";

interface Notebook {
  name: string;
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

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleAddNotebook = () => {
    if (!newNotebookName.trim()) return;
    onAddNotebook(newNotebookName.trim());
    setNewNotebookName("");
    setIsAddingNotebook(false);
  };

  return (
    <div className="sidebar-container">
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className={`sidebar-toggle ${
          isOpen ? "sidebar-toggle-open" : "sidebar-toggle-closed"
        }`}
      >
        {isOpen ? "Close" : "Open"}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
        {isOpen && (
          <>
            <h1>Video Notebook</h1>
            <h2>YouTube Categories</h2>
            <ul>
              {notebooks.map((notebook, index) => (
                <li key={index} onClick={() => onSelectNotebook(notebook.name)}>
                  {notebook.name}
                </li>
              ))}
            </ul>

            {/* Add New Notebook Section */}
            <div>
              {isAddingNotebook ? (
                <div className="add-notebook-form">
                  <input
                    type="text"
                    placeholder="New notebook name"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                  />
                  <div className="add-notebook-buttons">
                    <button onClick={handleAddNotebook}>Add</button>
                    <button onClick={() => setIsAddingNotebook(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingNotebook(true)}
                  className="add-notebook-link"
                >
                  + Add new notebook
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;

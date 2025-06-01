import { useState, useRef, useEffect } from 'react';
import './UserDropdown.css';

interface UserDropdownProps {
  userName: string;
  onSignOut: () => void;
}

function UserDropdown({ userName, onSignOut }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut();
  };

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button 
        className="user-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {userName.split(' ').map(name => name[0]).join('').toUpperCase()}
        </div>
        <span className="user-name">{userName}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-item user-info">
            <div className="user-avatar-large">
              {userName.split(' ').map(name => name[0]).join('').toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-name-large">{userName}</div>
              <div className="user-email">john.doe@example.com</div>
            </div>
          </div>
          <div className="dropdown-divider"></div>
          <button className="dropdown-item" onClick={handleSignOut}>
            <span className="dropdown-icon">🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

export default UserDropdown; 
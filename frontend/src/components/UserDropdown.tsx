import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './UserDropdown.css';

interface UserDropdownProps {
  userName: string;
  onSignOut: () => void;
}

function UserDropdown({ userName, onSignOut }: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isGuest = userName === 'Guest User';

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

  const handleSignIn = () => {
    setIsOpen(false);
    navigate('/signin');
  };

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button 
        className="user-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="user-name">{userName}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          {isGuest ? (
            <button className="dropdown-item" onClick={handleSignIn}>
              <i className="fa-solid fa-right-to-bracket"></i>
              Sign In
            </button>
          ) : (
            <button className="dropdown-item" onClick={handleSignOut}>
              <i className="fa-solid fa-right-from-bracket"></i>
              Sign Out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UserDropdown; 
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

  const getInitials = (name: string) => {
    if (name === 'Guest User') return 'G';
    return name.split(' ').map(name => name[0]).join('').toUpperCase();
  };

  const getUserEmail = () => {
    if (isGuest) return 'Not signed in';
    return 'john.doe@example.com';
  };

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button 
        className="user-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {getInitials(userName)}
        </div>
        <span className="user-name">{userName}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-item user-info">
            <div className="user-avatar-large">
              {getInitials(userName)}
            </div>
            <div className="user-details">
              <div className="user-name-large">{userName}</div>
              <div className="user-email">{getUserEmail()}</div>
            </div>
          </div>
          <div className="dropdown-divider"></div>
          {isGuest ? (
            <button className="dropdown-item" onClick={handleSignIn}>
              <span className="dropdown-icon">🔑</span>
              Sign In
            </button>
          ) : (
            <button className="dropdown-item" onClick={handleSignOut}>
              <span className="dropdown-icon">🚪</span>
              Sign Out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UserDropdown; 
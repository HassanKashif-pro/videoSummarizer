import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, User } from '../services/authService';
import './UserDashboard.css';

interface UserDashboardProps {
  onSignOut: () => void;
}

function UserDashboard({ onSignOut }: UserDashboardProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    username: '',
    email: ''
  });
  const [stats, setStats] = useState<{ totalUsers: number; currentUser: User | null }>({ totalUsers: 0, currentUser: null });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setEditForm({
        name: currentUser.name,
        username: currentUser.username,
        email: currentUser.email
      });
    }
    
    const userStats = authService.getUserStats();
    setStats(userStats);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const result = await authService.updateProfile({
        name: editForm.name,
        username: editForm.username,
        email: editForm.email
      });

      if (result.success && result.user) {
        setUser(result.user);
        setIsEditing(false);
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(result.message || 'Failed to update profile');
      }
    } catch (error) {
      setMessage('An error occurred while updating profile');
    }
  };

  const handleSignOut = () => {
    authService.signOut();
    onSignOut();
  };

  const exportData = () => {
    const data = authService.exportUserData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `videoSummarizer_user_data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h2>No user data found</h2>
          <button onClick={onSignOut} className="signin-btn">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h1>Video Summarizer Dashboard</h1>
          <div className="header-buttons">
            <button onClick={() => navigate('/')} className="home-btn">
              Return To Home
            </button>
            <button onClick={handleSignOut} className="signout-btn">
              Sign Out
            </button>
          </div>
        </div>

        {message && (
          <div className="message success-message">
            {message}
          </div>
        )}

        <div className="dashboard-content">
          {/* User Profile Section */}
          <div className="profile-section">
            <h2>User Profile</h2>
            
            {!isEditing ? (
              <div className="profile-display">
                <div className="profile-avatar">
                  <span>{user.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="profile-info">
                  <div className="info-item">
                    <label>Name:</label>
                    <span>{user.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Username:</label>
                    <span>@{user.username}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{user.email}</span>
                  </div>
                  <div className="info-item">
                    <label>User ID:</label>
                    <span className="user-id">{user.id}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="edit-btn"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="edit-form">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={editForm.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="button-group">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="save-btn">
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Information */}
          <div className="account-section">
            <h2>Account Information</h2>
            <div className="account-info">
              <div className="info-item">
                <label>Account Created:</label>
                <span>{formatDate(user.createdAt)}</span>
              </div>
              <div className="info-item">
                <label>Last Login:</label>
                <span>{formatDate(user.lastLoginAt)}</span>
              </div>
              <div className="info-item">
                <label>Total Users:</label>
                <span>{stats.totalUsers}</span>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="preferences-section">
            <h2>Preferences</h2>
            <div className="preferences-info">
              <div className="info-item">
                <label>Theme:</label>
                <span className="theme-badge">{user.preferences?.theme || 'dark'}</span>
              </div>
              <div className="info-item">
                <label>Language:</label>
                <span>{user.preferences?.language || 'en'}</span>
              </div>
              <div className="info-item">
                <label>Notifications:</label>
                <span className={`status-badge ${user.preferences?.notifications ? 'enabled' : 'disabled'}`}>
                  {user.preferences?.notifications ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="data-section">
            <h2>Data Management</h2>
            <div className="data-actions">
              <button onClick={exportData} className="export-btn">
                Export User Data
              </button>
              <p className="data-info">
                Export your user data in JSON format for backup or portability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserDashboard; 
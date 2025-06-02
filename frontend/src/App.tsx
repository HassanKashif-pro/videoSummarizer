import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import MainApp from "./components/MainApp.tsx";
import SignIn from "./components/SignIn.tsx";
import UserDashboard from "./components/UserDashboard";
import "./styles.css";
import { authService } from './services/authService';

// Authentication Context Component
function AuthWrapper() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState({ name: 'Guest User', email: 'guest@example.com' });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing authentication on app load
  useEffect(() => {
    const savedAuth = localStorage.getItem('videoSummarizerAuth');
    const savedUser = localStorage.getItem('videoSummarizerUser');
    
    if (savedAuth === 'true' && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  // Sign in handler
  const handleSignIn = async (email: string, password: string) => {
    // Simple demo authentication - any email/password works
    const userData = { name: 'John Doe', email };
    setUser(userData);
    setIsAuthenticated(true);
    
    // Persist authentication state
    localStorage.setItem('videoSummarizerAuth', 'true');
    localStorage.setItem('videoSummarizerUser', JSON.stringify(userData));
    
    // Navigate to main app
    navigate('/');
  };

  // Sign out handler
  const handleSignOut = () => {
    setIsAuthenticated(false);
    setUser({ name: 'Guest User', email: 'guest@example.com' });
    
    // Clear authentication state
    localStorage.removeItem('videoSummarizerAuth');
    localStorage.removeItem('videoSummarizerUser');
    
    // Navigate to sign-in
    navigate('/signin');
  };

  if (isLoading) {
  return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'inherit'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

                  return (
    <Routes>
      <Route 
        path="/signin" 
        element={<SignIn onSignIn={handleSignIn} />} 
      />
      <Route 
        path="/" 
        element={<MainApp user={user} onSignOut={handleSignOut} />} 
      />
      {/* Redirect any unknown routes to home page */}
      <Route 
        path="*" 
        element={<Navigate to="/" replace />} 
      />
    </Routes>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on app start
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      setIsAuthenticated(authenticated);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleSignIn = (email: string, password: string) => {
    console.log('User signed in:', { email, user: authService.getCurrentUser() });
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    console.log('User signed out');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <Router>
      {isAuthenticated ? (
        <UserDashboard onSignOut={handleSignOut} />
      ) : (
        <AuthWrapper />
      )}
    </Router>
  );
}

export default App;

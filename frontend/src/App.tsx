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
    const authenticated = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();
    
    if (authenticated && currentUser) {
      setIsAuthenticated(true);
      setUser({ 
        name: currentUser.name || currentUser.username, 
        email: currentUser.email 
      });
    }
    setIsLoading(false);
  }, []);

  // Sign in handler
  const handleSignIn = async (email: string, password: string) => {
    // Use authService for authentication
    const result = await authService.signIn({ email, password });
    
    if (result.success && result.user) {
      const userData = { 
        name: result.user.name || result.user.username, 
        email: result.user.email 
      };
      setUser(userData);
      setIsAuthenticated(true);
      
      // Navigate to main app
      navigate('/');
    } else {
      console.error('Sign in failed:', result.message);
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    authService.signOut();
    setIsAuthenticated(false);
    setUser({ name: 'Guest User', email: 'guest@example.com' });
    
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
        path="/dashboard" 
        element={<UserDashboard onSignOut={handleSignOut} />} 
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
      <Routes>
        <Route 
          path="/signin" 
          element={
            isAuthenticated ? 
            <Navigate to="/" replace /> : 
            <SignIn onSignIn={handleSignIn} />
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? 
            <UserDashboard onSignOut={handleSignOut} /> : 
            <Navigate to="/signin" replace />
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated ? 
            <AuthWrapper /> : 
            <Navigate to="/signin" replace />
          } 
        />
        {/* Redirect any unknown routes */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/" : "/signin"} replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;

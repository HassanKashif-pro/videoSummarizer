import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import MainApp from "./components/MainApp.tsx";
import SignIn from "./components/SignIn.tsx";
import UserDashboard from "./components/UserDashboard";
import "./styles.css";
import { authService } from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on app start
    const checkAuth = () => {
      const authenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      
      if (authenticated && currentUser) {
        setIsAuthenticated(true);
        setUser({ 
          name: currentUser.name || currentUser.username, 
          email: currentUser.email 
        });
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
      
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const result = await authService.signIn({ email, password });
      
      if (result.success && result.user) {
        const userData = { 
          name: result.user.name || result.user.username, 
          email: result.user.email 
        };
        setUser(userData);
        setIsAuthenticated(true);
        console.log('User signed in successfully:', userData);
      } else {
        console.error('Sign in failed:', result.message);
        // Handle sign-in error - could show error message to user
      }
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  const handleSignOut = () => {
    authService.signOut();
    setIsAuthenticated(false);
    setUser(null);
    console.log('User signed out');
  };

  if (isLoading) {
    return (
      <div className="app-loading" style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'inherit'
      }}>
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
            isAuthenticated && user ? 
            <UserDashboard onSignOut={handleSignOut} /> : 
            <Navigate to="/signin" replace />
          } 
        />
        <Route 
          path="/" 
          element={
            isAuthenticated && user ? 
            <MainApp user={user} onSignOut={handleSignOut} /> : 
            <Navigate to="/signin" replace />
          } 
        />
        {/* Redirect any unknown routes to sign-in for unauthenticated users */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/" : "/signin"} replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;

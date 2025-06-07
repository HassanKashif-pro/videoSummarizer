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
      console.log('🔍 Checking authentication state on app start...');
      
      // First, check what's in localStorage
      const savedToken = localStorage.getItem('videoSummarizer_token');
      const savedUser = localStorage.getItem('videoSummarizer_user');
      console.log('🗂️ Raw localStorage data:', {
        tokenExists: !!savedToken,
        userExists: !!savedUser,
        token: savedToken,
        user: savedUser
      });
      
      const authenticated = authService.isAuthenticated();
      const currentUser = authService.getCurrentUser();
      
      console.log('🔐 AuthService results:', {
        authenticated: authenticated,
        currentUser: currentUser
      });
      
      if (authenticated && currentUser) {
        setIsAuthenticated(true);
        setUser({ 
          name: currentUser.name || currentUser.username, 
          email: currentUser.email 
        });
        
        console.log('✅ User is authenticated, notifying Chrome extension');
        
        // Store auth state in a way Chrome extension can access it
        storeAuthForExtension(true, currentUser);
        
        // Notify Chrome extension about existing authentication
        window.postMessage({
          type: 'AUTH_STATUS',
          authenticated: true,
          user: { 
            name: currentUser.name || currentUser.username, 
            email: currentUser.email 
          },
          source: 'main_app'
        }, '*');
        
      } else {
        setIsAuthenticated(false);
        setUser(null);
        
        console.log('❌ User is not authenticated, notifying Chrome extension');
        
        // Clear auth state for Chrome extension
        storeAuthForExtension(false, null);
        
        // Notify Chrome extension that user is not authenticated
        window.postMessage({
          type: 'AUTH_STATUS',
          authenticated: false,
          source: 'main_app'
        }, '*');
      }
      
      setIsLoading(false);
    };

    // Function to store auth state for Chrome extension
    const storeAuthForExtension = (authenticated: boolean, user: any) => {
      try {
        // Store in localStorage with a special key the extension can check
        const authData = {
          authenticated,
          user: user ? {
            id: user.id,
            name: user.name || user.username,
            email: user.email
          } : null,
          timestamp: Date.now()
        };
        
        localStorage.setItem('videoSummarizer_extensionAuth', JSON.stringify(authData));
        console.log('💾 Stored auth data for extension:', authData);
        
        // Also try to use Chrome extension storage if available
        if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.storage) {
          (window as any).chrome.storage.local.set({
            'videoSummarizer_auth': authData
          }, () => {
            console.log('💾 Stored auth data in Chrome storage');
          });
        }
      } catch (error) {
        console.log('⚠️ Could not store auth data for extension:', error);
      }
    };

    checkAuth();

    // Listen for authentication requests from Chrome extension
    const handleMessage = (event: MessageEvent) => {
      console.log("📨 Main app received message:", event.data);
      
      if (event.data.source === 'chrome_extension') {
        if (event.data.type === 'TEST_MESSAGE') {
          console.log('🧪 Test message from Chrome extension:', event.data.message);
          // Respond to test
          window.postMessage({
            type: 'TEST_RESPONSE',
            source: 'main_app',
            message: 'Hello from main app! Communication is working.'
          }, '*');
        } else if (event.data.type === 'AUTH_REQUEST') {
          console.log('📨 Received auth request from Chrome extension:', event.data);
          
          const authenticated = authService.isAuthenticated();
          const currentUser = authService.getCurrentUser();
          
          console.log('🔍 Current auth state check:', {
            authenticated,
            currentUser: currentUser ? { name: currentUser.name, email: currentUser.email } : null
          });
          
          // Update stored auth data
          storeAuthForExtension(authenticated, currentUser);
          
          // Respond to the Chrome extension
          const response = {
            type: 'AUTH_RESPONSE',
            requestId: event.data.requestId,
            authenticated: authenticated,
            user: authenticated && currentUser ? {
              name: currentUser.name || currentUser.username,
              email: currentUser.email,
              id: currentUser.id
            } : null,
            source: 'main_app'
          };
          
          console.log('📤 Sending auth response to Chrome extension:', response);
          window.postMessage(response, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Starting sign-in process for:', email);
      const result = await authService.signIn({ email, password });
      
      console.log('📋 Sign-in result:', result);
      
      if (result.success && result.user) {
        const userData = { 
          name: result.user.name || result.user.username, 
          email: result.user.email 
        };
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ User signed in successfully:', userData);
        
        // Verify localStorage after sign-in
        const savedToken = localStorage.getItem('videoSummarizer_token');
        const savedUser = localStorage.getItem('videoSummarizer_user');
        console.log('🔍 localStorage verification after sign-in:', {
          tokenExists: !!savedToken,
          userExists: !!savedUser,
          token: savedToken,
          user: savedUser
        });
        
        // Notify Chrome extension about authentication success
        window.postMessage({
          type: 'AUTH_SUCCESS',
          user: userData,
          source: 'main_app'
        }, '*');
        
      } else {
        console.error('❌ Sign in failed:', result.message);
        // Handle sign-in error - could show error message to user
      }
    } catch (error) {
      console.error('💥 Sign in error:', error);
    }
  };

  const handleSignOut = () => {
    authService.signOut();
    setIsAuthenticated(false);
    setUser(null);
    console.log('User signed out');
    
    // Notify Chrome extension about sign out
    window.postMessage({
      type: 'AUTH_SIGNOUT',
      source: 'main_app'
    }, '*');
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

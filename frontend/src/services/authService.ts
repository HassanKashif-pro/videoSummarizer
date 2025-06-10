import { oauthService, OAuthResult } from './oauthService';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string;
  preferences?: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

class AuthService {
  private baseUrl = 'http://localhost:3001/api/auth'; // Update with your backend URL
  private storageKey = 'videoSummarizer_user';
  private tokenKey = 'videoSummarizer_token';

  // 🆕 CLEAN: Sign up using backend only (with timeout)
  async signUp(userData: SignUpData): Promise<AuthResponse> {
    try {
      console.log('🆕 Creating user in backend namespace...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.baseUrl}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (result.success) {
        // Save user data and session to localStorage for frontend state
        this.saveUserToLocal(result.user, result.sessionId);
        localStorage.setItem('videoSummarizer_sessionId', result.sessionId);
        console.log(`✅ User created in namespace: ${result.user.username} (Session: ${result.sessionId})`);
        return result;
      } else {
        return result;
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Signup timeout - request took too long');
        return {
          success: false,
          message: 'Sign up timed out. Please try again.'
        };
      }
      
      console.error('❌ Backend signup error:', error);
      return {
        success: false,
        message: 'Backend connection failed. Please check if the server is running.'
      };
    }
  }

  // 🆕 CLEAN: Sign in using backend only (with timeout)
  async signIn(credentials: SignInData): Promise<AuthResponse> {
    try {
      console.log('🆕 Signing in to backend namespace...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.baseUrl}/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (result.success) {
        // Save user data and session to localStorage for frontend state
        this.saveUserToLocal(result.user, result.sessionId);
        localStorage.setItem('videoSummarizer_sessionId', result.sessionId);
        console.log(`✅ User signed in to namespace: ${result.user.username} (Session: ${result.sessionId})`);
        return result;
      } else {
        return result;
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('❌ Signin timeout - request took too long');
        return {
          success: false,
          message: 'Sign in timed out. Please try again.'
        };
      }
      
      console.error('❌ Backend signin error:', error);
      return {
        success: false,
        message: 'Backend connection failed. Please check if the server is running.'
      };
    }
  }

  // 🗑️ REMOVED: Local storage methods (backend-only now)

  // Get current user
  getCurrentUser(): User | null {
    const userData = localStorage.getItem(this.storageKey);
    return userData ? JSON.parse(userData) : null;
  }

  // Get auth token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!(this.getCurrentUser() && this.getToken());
  }

  // Sign out
  signOut(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenKey);
  }

  // 🗑️ REMOVED: Profile update method (implement backend-only version if needed)

  // 🗑️ REMOVED: Email/username checking (backend handles validation now)

  // Helper methods
  private saveUserToLocal(user: User, token: string): void {
    console.log('💾 Saving user to localStorage:', {
      user: user,
      token: token,
      storageKey: this.storageKey,
      tokenKey: this.tokenKey
    });
    
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    localStorage.setItem(this.tokenKey, token);
    
    // Verify it was saved
    const savedUser = localStorage.getItem(this.storageKey);
    const savedToken = localStorage.getItem(this.tokenKey);
    
    console.log('✅ Verification - Saved to localStorage:', {
      userSaved: !!savedUser,
      tokenSaved: !!savedToken,
      savedUser: savedUser,
      savedToken: savedToken
    });
  }

  // 🗑️ REMOVED: localStorage utility methods (backend-only now)

  // Export user data
  exportUserData(): string {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return '';
    
    return JSON.stringify({
      user: currentUser,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  // 🆕 Clear all old localStorage data
  clearAllData(): void {
    console.log('🧹 Clearing all old localStorage data...');
    
    // Remove all videoSummarizer related data
    const keysToRemove = [
      'videoSummarizer_token',
      'videoSummarizer_user', 
      'videoSummarizer_extensionAuth',
      'videoSummarizer_allUsers',
      'videoSummarizer_passwords'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    });
    
    console.log('✅ All old data cleared. Ready for backend-only authentication.');
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<{ success: boolean; message?: string; user?: any; error?: string }> {
    try {
      console.log('🚀 Starting Google OAuth sign-in...');
      
      const oauthResult: OAuthResult = await oauthService.signInWithGoogle();
      
      if (!oauthResult.success) {
        return {
          success: false,
          error: oauthResult.error || 'OAuth authentication failed'
        };
      }

      // Store user data in localStorage
      if (oauthResult.user) {
        localStorage.setItem('videoSummarizer_user', JSON.stringify(oauthResult.user));
        localStorage.setItem('videoSummarizer_token', oauthResult.accessToken || 'oauth_token');
        
        console.log('✅ Google OAuth successful:', oauthResult.user);
        
        return {
          success: true,
          message: 'Successfully signed in with Google',
          user: oauthResult.user
        };
      }

      return {
        success: false,
        error: 'No user data received from Google'
      };

    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google sign-in failed'
      };
    }
  }
}

export const authService = new AuthService(); 
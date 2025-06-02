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

  // Sign up new user
  async signUp(userData: SignUpData): Promise<AuthResponse> {
    try {
      // Check if username already exists locally
      if (this.checkUsernameExists(userData.username)) {
        return {
          success: false,
          message: 'Username already exists. Please choose a different username.'
        };
      }

      // Check if email already exists locally
      if (this.checkEmailExists(userData.email)) {
        return {
          success: false,
          message: 'Email already registered. Please use a different email or sign in.'
        };
      }

      // Try backend first, fallback to local storage
      try {
        const response = await fetch(`${this.baseUrl}/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          throw new Error('Backend not available');
        }

        const result = await response.json();
        
        if (result.success) {
          this.saveUserToLocal(result.user, result.token);
          return result;
        } else {
          return result;
        }
      } catch (error) {
        // Fallback to local storage
        console.log('Backend not available, using local storage');
        return this.signUpLocal(userData);
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        message: 'An error occurred during sign up. Please try again.'
      };
    }
  }

  // Sign in existing user
  async signIn(credentials: SignInData): Promise<AuthResponse> {
    try {
      // Try backend first, fallback to local storage
      try {
        const response = await fetch(`${this.baseUrl}/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          throw new Error('Backend not available');
        }

        const result = await response.json();
        
        if (result.success) {
          this.saveUserToLocal(result.user, result.token);
          // Update last login
          result.user.lastLoginAt = new Date().toISOString();
          this.saveUserToLocal(result.user, result.token);
          return result;
        } else {
          return result;
        }
      } catch (error) {
        // Fallback to local storage
        console.log('Backend not available, using local storage');
        return this.signInLocal(credentials);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        message: 'An error occurred during sign in. Please try again.'
      };
    }
  }

  // Local storage sign up
  private signUpLocal(userData: SignUpData): AuthResponse {
    const users = this.getAllUsersFromLocal();
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === userData.email || u.username === userData.username);
    if (existingUser) {
      return {
        success: false,
        message: existingUser.email === userData.email ? 'Email already registered' : 'Username already taken'
      };
    }

    // Create new user
    const newUser: User = {
      id: this.generateId(),
      username: userData.username,
      email: userData.email,
      name: userData.name,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true
      }
    };

    // Save user data locally
    users.push(newUser);
    localStorage.setItem('videoSummarizer_allUsers', JSON.stringify(users));
    
    // Save password separately (in real app, this should be hashed)
    const passwords = JSON.parse(localStorage.getItem('videoSummarizer_passwords') || '{}');
    passwords[newUser.id] = userData.password; // In production, hash this!
    localStorage.setItem('videoSummarizer_passwords', JSON.stringify(passwords));

    // Generate token and save current user
    const token = this.generateToken();
    this.saveUserToLocal(newUser, token);

    return {
      success: true,
      user: newUser,
      token: token,
      message: 'Account created successfully!'
    };
  }

  // Local storage sign in
  private signInLocal(credentials: SignInData): AuthResponse {
    const users = this.getAllUsersFromLocal();
    const passwords = JSON.parse(localStorage.getItem('videoSummarizer_passwords') || '{}');
    
    // Find user by email
    const user = users.find(u => u.email === credentials.email);
    if (!user) {
      return {
        success: false,
        message: 'Email not found. Please check your email or sign up.'
      };
    }

    // Check password
    if (passwords[user.id] !== credentials.password) {
      return {
        success: false,
        message: 'Incorrect password. Please try again.'
      };
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    const updatedUsers = users.map(u => u.id === user.id ? user : u);
    localStorage.setItem('videoSummarizer_allUsers', JSON.stringify(updatedUsers));

    // Generate token and save current user
    const token = this.generateToken();
    this.saveUserToLocal(user, token);

    return {
      success: true,
      user: user,
      token: token,
      message: 'Signed in successfully!'
    };
  }

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

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<AuthResponse> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, message: 'No user logged in' };
    }

    try {
      // Try backend first
      const token = this.getToken();
      const response = await fetch(`${this.baseUrl}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const result = await response.json();
        this.saveUserToLocal(result.user, token!);
        return result;
      }
    } catch (error) {
      console.log('Backend not available, updating locally');
    }

    // Fallback to local update
    const updatedUser = { ...currentUser, ...userData };
    const users = this.getAllUsersFromLocal();
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);
    localStorage.setItem('videoSummarizer_allUsers', JSON.stringify(updatedUsers));
    this.saveUserToLocal(updatedUser, this.getToken()!);

    return {
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully!'
    };
  }

  // Check if email exists (public method)
  checkEmailExists(email: string): boolean {
    const users = this.getAllUsersFromLocal();
    return users.some(u => u.email === email);
  }

  // Check if username exists (public method)  
  checkUsernameExists(username: string): boolean {
    const users = this.getAllUsersFromLocal();
    return users.some(u => u.username === username);
  }

  // Helper methods
  private saveUserToLocal(user: User, token: string): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    localStorage.setItem(this.tokenKey, token);
  }

  private getAllUsersFromLocal(): User[] {
    return JSON.parse(localStorage.getItem('videoSummarizer_allUsers') || '[]');
  }

  private generateId(): string {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateToken(): string {
    return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16);
  }

  // Get user statistics
  getUserStats(): { totalUsers: number; currentUser: User | null } {
    return {
      totalUsers: this.getAllUsersFromLocal().length,
      currentUser: this.getCurrentUser()
    };
  }

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
}

export const authService = new AuthService(); 
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, SignUpData, SignInData } from '../services/authService';
import './SignIn.css';

interface SignInProps {
  onSignIn: (email: string, password: string) => void;
}

function SignIn({ onSignIn }: SignInProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'password' | 'name' | 'username'>('email');
  const [previousStep, setPreviousStep] = useState<'email' | 'password' | 'name' | 'username' | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [validationErrors, setValidationErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear main error when user starts typing
    if (error) setError('');
    
    // Real-time validation
    validateField(name, value);
  };

  const validateField = (fieldName: string, value: string) => {
    let fieldError = '';
    
    switch (fieldName) {
      case 'username':
        if (value.length > 0 && value.length < 3) {
          fieldError = 'Username must be at least 3 characters long';
        } else if (value.length > 0 && !/^[a-zA-Z0-9_]+$/.test(value)) {
          fieldError = 'Username can only contain letters, numbers, and underscores';
        }
        break;
      case 'email':
        if (value.length > 0) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            fieldError = 'Please enter a valid email address';
          }
        }
        break;
      case 'password':
        if (isSignUp && value.length > 0 && value.length < 6) {
          fieldError = 'Password must be at least 6 characters long';
        }
        // Also validate confirm password when password changes
        if (isSignUp && formData.confirmPassword.length > 0) {
          setTimeout(() => validateField('confirmPassword', formData.confirmPassword), 0);
        }
        break;
      case 'confirmPassword':
        if (isSignUp && value.length > 0 && value !== formData.password) {
          fieldError = 'Passwords do not match';
        }
        break;
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [fieldName]: fieldError
    }));
  };

  // Smooth step transition with animation
  const transitionToStep = (newStep: 'email' | 'password' | 'name' | 'username') => {
    if (newStep === currentStep) return;
    
    setIsTransitioning(true);
    setPreviousStep(currentStep);
    
    setTimeout(() => {
      setCurrentStep(newStep);
      setTimeout(() => {
        setIsTransitioning(false);
        setPreviousStep(null);
      }, 50);
    }, 200);
  };

  // Check if username is valid
  const isUsernameValid = () => {
    return formData.username.length >= 3 && 
           /^[a-zA-Z0-9_]+$/.test(formData.username) && 
           !validationErrors.username;
  };

  // Check if email is valid
  const isEmailValid = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(formData.email) && !validationErrors.email;
  };

  // Check if password is valid
  const isPasswordValid = () => {
    if (isSignUp) {
      return formData.password.length >= 6 && 
             !validationErrors.password && 
             formData.confirmPassword.length > 0 && 
             !validationErrors.confirmPassword &&
             formData.password === formData.confirmPassword;
    }
    return formData.password.length > 0;
  };

  // Handle ENTER key press for all inputs
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep === 'email') {
        handleEmailSubmit(e as any);
      } else if (currentStep === 'username') {
        handleUsernameSubmit(e as any);
      } else if (currentStep === 'name') {
        handleNameSubmit(e as any);
      } else if (currentStep === 'password') {
        handlePasswordSubmit(e as any);
      }
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!isEmailValid()) {
      setIsLoading(false);
      return;
    }

    if (isSignUp) {
      // For sign up, continue to username (backend will check for duplicates)
      transitionToStep('username');
    } else {
      // For sign in, continue to password (backend will validate email existence)
      transitionToStep('password');
    }
    
    setIsLoading(false);
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUsernameValid()) {
      transitionToStep('name');
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name.trim()) {
      setError('Please enter your full name');
      return;
    }

    transitionToStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      if (!formData.password.trim()) {
        setError('Please enter your password');
        setIsLoading(false);
        return;
      }

      if (isSignUp) {
        // Password validation for sign up
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setIsLoading(false);
          return;
        }

        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match!');
          setIsLoading(false);
          return;
        }

        // Sign up
        const signUpData: SignUpData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          name: formData.name
        };

        const result = await authService.signUp(signUpData);
        
        if (result.success) {
          setSuccess(result.message || 'Account created successfully!');
          setTimeout(() => {
            onSignIn(formData.email, formData.password);
          }, 1500);
        } else {
          setError(result.message || 'Failed to create account');
        }
      } else {
        // Sign in
        const signInData: SignInData = {
          email: formData.email,
          password: formData.password
        };

        const result = await authService.signIn(signInData);
        
        if (result.success) {
          setSuccess(result.message || 'Signed in successfully!');
          setTimeout(() => {
            onSignIn(formData.email, formData.password);
          }, 1000);
        } else {
          setError(result.message || 'Failed to sign in');
        }
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // Simulate Google sign in with demo data
      const googleUser: SignUpData = {
        username: 'googleuser_' + Date.now(),
        email: 'user@gmail.com',
        password: 'google-auth-token',
        name: 'Google User'
      };

      const result = await authService.signUp(googleUser);
      if (result.success) {
        setSuccess('Signed in with Google successfully!');
        setTimeout(() => {
          onSignIn(googleUser.email, googleUser.password);
        }, 1000);
      }
    } catch (error) {
      setError('Google sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    setError('');
    if (currentStep === 'password') {
      if (isSignUp) {
        transitionToStep('name');
      } else {
        transitionToStep('email');
      }
    } else if (currentStep === 'name') {
      transitionToStep('username');
    } else if (currentStep === 'username') {
      transitionToStep('email');
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setCurrentStep('email');
    setPreviousStep(null);
    setIsTransitioning(false);
    setFormData({ username: '', name: '', email: '', password: '', confirmPassword: '' });
    setError('');
    setSuccess('');
    setValidationErrors({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const getStepTitle = () => {
    if (currentStep === 'email') {
      return isSignUp ? 'Create your account' : 'Sign in to your account';
    } else if (currentStep === 'username') {
      return 'Choose a username';
    } else if (currentStep === 'name') {
      return 'What\'s your name?';
    } else {
      return 'Enter your password';
    }
  };

  const getStepSubtitle = () => {
    if (currentStep === 'email') {
      return 'Enter your email to continue';
    } else if (currentStep === 'username') {
      return 'This will be your unique identifier';
    } else if (currentStep === 'name') {
      return 'This will be displayed in your profile';
    } else {
      if (isSignUp) {
        return 'Create a secure password for your account';
      }
      return `Welcome back, ${formData.name || 'User'}!`;
    }
  };

  const getSubmitButtonText = () => {
    if (currentStep === 'email' || currentStep === 'username' || currentStep === 'name') {
      return 'Continue';
    } else {
      if (isLoading) {
        return isSignUp ? 'Creating Account...' : 'Signing in...';
      }
      return isSignUp ? 'Create Account' : 'Sign In';
    }
  };

  // Get CSS classes for dynamic sizing
  const getCardClasses = () => {
    const baseClass = 'signin-card';
    const stepClass = `step-${currentStep}`;
    const modeClass = isSignUp ? 'signup-mode' : 'signin-mode';
    return `${baseClass} ${stepClass} ${modeClass}`;
  };

  const getContainerClasses = () => {
    const baseClass = 'form-container';
    const stepClass = `step-${currentStep}`;
    const modeClass = isSignUp ? 'signup-mode' : 'signin-mode';
    return `${baseClass} ${stepClass} ${modeClass}`;
  };

  return (
    <div className="signin-container">
      <div className={getCardClasses()}>
        <div className="signin-header">
          <h1>Video Summarizer</h1>
          <p className="step-title">{getStepTitle()}</p>
          <p className="step-subtitle">{getStepSubtitle()}</p>
          {currentStep !== 'email' && (
            <div className="user-email-display">
              <span>{formData.email}</span>
              <button onClick={() => transitionToStep('email')} className="change-email-btn">
                Change
              </button>
            </div>
          )}
          
          {/* Error and Success Messages */}
          {error && (
            <div className="message error-message">
              {error}
            </div>
          )}
          {success && (
            <div className="message success-message">
              {success}
            </div>
          )}
        </div>
        
        <div className={getContainerClasses()}>
          {/* Email Step */}
          <div className={`form-step ${currentStep === 'email' ? 'active' : ''}`}>
            <form onSubmit={handleEmailSubmit} className="signin-form">
              <div className="form-content">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    required
                    placeholder="Enter your email"
                    autoFocus={currentStep === 'email'}
                    className={validationErrors.email ? 'error' : ''}
                  />
                  {validationErrors.email && (
                    <small className="validation-error">{validationErrors.email}</small>
                  )}
                </div>
              </div>
              
              <button type="submit" className="signin-btn" disabled={!isEmailValid() || isLoading}>
                {isLoading && currentStep === 'email' ? 'Checking...' : getSubmitButtonText()}
              </button>
            </form>
          </div>

          {/* Username Step (only for sign up) */}
          <div className={`form-step ${currentStep === 'username' ? 'active' : ''}`}>
            <form onSubmit={handleUsernameSubmit} className="signin-form">
              <div className="form-content">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    required
                    placeholder="Choose a unique username"
                    autoFocus={currentStep === 'username'}
                    className={validationErrors.username ? 'error' : ''}
                  />
                  {validationErrors.username && (
                    <small className="validation-error">{validationErrors.username}</small>
                  )}
                  {!validationErrors.username && (
                    <small className="input-help">3+ characters, letters, numbers, and underscores only</small>
                  )}
                </div>
              </div>
              
              <div className="button-group">
                <button type="button" onClick={goBack} className="back-btn">
                  Back
                </button>
                <button type="submit" className="signin-btn" disabled={!isUsernameValid()}>
                  {getSubmitButtonText()}
                </button>
              </div>
            </form>
          </div>

          {/* Name Step */}
          <div className={`form-step ${currentStep === 'name' ? 'active' : ''}`}>
            <form onSubmit={handleNameSubmit} className="signin-form">
              <div className="form-content">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    required
                    placeholder="Enter your full name"
                    autoFocus={currentStep === 'name'}
                  />
                </div>
              </div>
              
              <div className="button-group">
                <button type="button" onClick={goBack} className="back-btn">
                  Back
                </button>
                <button type="submit" className="signin-btn" disabled={!formData.name.trim()}>
                  {getSubmitButtonText()}
                </button>
              </div>
            </form>
          </div>

          {/* Password Step */}
          <div className={`form-step ${currentStep === 'password' ? 'active' : ''}`}>
            <form onSubmit={handlePasswordSubmit} className="signin-form">
              <div className="form-content">
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    required
                    placeholder={isSignUp ? "Create a password (6+ characters)" : "Enter your password"}
                    autoFocus={currentStep === 'password'}
                    className={validationErrors.password ? 'error' : ''}
                  />
                  {validationErrors.password && (
                    <small className="validation-error">{validationErrors.password}</small>
                  )}
                </div>

                {isSignUp && (
                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      required
                      placeholder="Confirm your password"
                      className={validationErrors.confirmPassword ? 'error' : ''}
                    />
                    {validationErrors.confirmPassword && (
                      <small className="validation-error">{validationErrors.confirmPassword}</small>
                    )}
                  </div>
                )}
              </div>
              
              <div className="button-group">
                <button type="button" onClick={goBack} className="back-btn">
                  Back
                </button>
                <button 
                  type="submit" 
                  className="signin-btn"
                  disabled={isLoading || !isPasswordValid()}
                >
                  {getSubmitButtonText()}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="signin-footer">
          
          <button 
            onClick={handleGoogleSignIn}
            className="google-btn"
            disabled={isLoading}
          >
            <i className="fab fa-google" style={{ color: 'var(--yt-red)' }}></i>
            Continue with Google
          </button>

          <p>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={toggleMode} className="toggle-btn">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignIn; 
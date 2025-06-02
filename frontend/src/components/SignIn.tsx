import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignIn.css';

interface SignInProps {
  onSignIn: (email: string, password: string) => void;
}

function SignIn({ onSignIn }: SignInProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [currentStep, setCurrentStep] = useState<'email' | 'password' | 'name'>('email');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle ENTER key press for all inputs
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (currentStep === 'email') {
        handleEmailSubmit(e as any);
      } else if (currentStep === 'name') {
        handleNameSubmit(e as any);
      } else if (currentStep === 'password') {
        handlePasswordSubmit(e as any);
      }
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.email.trim()) {
      if (isSignUp) {
        setCurrentStep('name');
      } else {
        setCurrentStep('password');
      }
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      setCurrentStep('password');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isSignUp && formData.password !== formData.confirmPassword) {
        alert('Passwords do not match!');
        setIsLoading(false);
        return;
      }
      await onSignIn(formData.email, formData.password);
    } catch (error) {
      console.error('Authentication error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    onSignIn('user@gmail.com', 'google-auth');
  };

  const goBack = () => {
    if (currentStep === 'password') {
      if (isSignUp) {
        setCurrentStep('name');
      } else {
        setCurrentStep('email');
      }
    } else if (currentStep === 'name') {
      setCurrentStep('email');
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setCurrentStep('email');
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
  };

  const getStepTitle = () => {
    if (currentStep === 'email') {
      return isSignUp ? 'Create your account' : 'Sign in to your account';
    } else if (currentStep === 'name') {
      return 'What\'s your name?';
    } else {
      return 'Enter your password';
    }
  };

  const getStepSubtitle = () => {
    if (currentStep === 'email') {
      return 'Enter your email to continue';
    } else if (currentStep === 'name') {
      return 'This will be displayed in your profile';
    } else {
      return `Welcome ${isSignUp ? formData.name || 'back' : 'back'}!`;
    }
  };

  const getSubmitButtonText = () => {
    if (currentStep === 'email') {
      return 'Continue';
    } else if (currentStep === 'name') {
      return 'Continue';
    } else {
      if (isLoading) {
        return isSignUp ? 'Creating Account...' : 'Signing in...';
      }
      return isSignUp ? 'Create Account' : 'Sign In';
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        <div className="signin-header">
          <h1>Video Summarizer</h1>
          <p className="step-title">{getStepTitle()}</p>
          <p className="step-subtitle">{getStepSubtitle()}</p>
          {currentStep !== 'email' && (
            <div className="user-email-display">
              <span>{formData.email}</span>
              <button onClick={() => setCurrentStep('email')} className="change-email-btn">
                Change
              </button>
            </div>
          )}
        </div>
        
        <div className="form-container">
          <div className={`form-step ${currentStep === 'email' ? 'active' : ''}`}>
            {currentStep === 'email' && (
              <form onSubmit={handleEmailSubmit} className="signin-form">
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
                    autoFocus
                  />
                </div>
                
                <button type="submit" className="submit-btn" disabled={!formData.email.trim()}>
                  {getSubmitButtonText()}
                </button>
              </form>
            )}
          </div>

          <div className={`form-step ${currentStep === 'name' ? 'active' : ''}`}>
            {currentStep === 'name' && (
              <form onSubmit={handleNameSubmit} className="signin-form">
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
                    autoFocus
                  />
                </div>
                
                <div className="button-group">
                  <button type="button" onClick={goBack} className="back-btn">
                    Back
                  </button>
                  <button type="submit" className="submit-btn" disabled={!formData.name.trim()}>
                    {getSubmitButtonText()}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className={`form-step ${currentStep === 'password' ? 'active' : ''}`}>
            {currentStep === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="signin-form">
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
                    placeholder="Enter your password"
                    autoFocus
                  />
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
                    />
                  </div>
                )}
                
                <div className="button-group">
                  <button type="button" onClick={goBack} className="back-btn">
                    Back
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading || !formData.password.trim() || (isSignUp && !formData.confirmPassword.trim())}
                  >
                    {getSubmitButtonText()}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        
        <div className="signin-footer">

          <button 
            onClick={handleGoogleSignIn}
            className="google-btn"
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
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Session = require('../models/Session');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Rate limiting for auth operations
const authRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 5;

const checkRateLimit = (identifier) => {
  const now = Date.now();
  const attempts = authRateLimit.get(identifier) || [];
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    return false;
  }
  
  recentAttempts.push(now);
  authRateLimit.set(identifier, recentAttempts);
  return true;
};

// 🔧 Utility functions
const generateSessionId = () => {
  return 'session_' + Date.now().toString() + Math.random().toString(36).substr(2, 12);
};

// 🆕 CREATE USER AND SESSION (MongoDB)
const signUp = async (req, res) => {
  try {
    const { username, email, password, name } = req.body;
    
    if (!username || !email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
      });
    }
    
    // Create new user
    const newUser = new User({
      username,
      email,
      name,
      password, // Will be hashed by the pre-save middleware
      isActive: true,
      notes: []
    });
    
    await newUser.save();
    console.log(`✅ User created in database: ${username} (${email})`);
    
    // Create session for this user
    const sessionId = generateSessionId();
    const session = new Session({
      sessionId,
      userId: newUser._id,
      user: {
        id: newUser._id.toString(),
        username: newUser.username,
        email: newUser.email,
        name: newUser.name
      },
      lastActivity: new Date(),
      isActive: true
    });
    
    await session.save();
    console.log(`✅ Session created: ${sessionId}`);
    
    res.json({
      success: true,
      message: 'Account created successfully',
      user: session.user,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('SignUp error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// 🆕 SIGN IN USER AND CREATE SESSION (MongoDB)
const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user in database
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Update last login (no need to hash password again)
    user.updatedAt = new Date();
    await user.save();
    
    console.log(`✅ User authenticated: ${user.username} (${user.email})`);
    
    // Create NEW session for this user
    const sessionId = generateSessionId();
    const session = new Session({
      sessionId,
      userId: user._id,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name
      },
      lastActivity: new Date(),
      isActive: true
    });
    
    await session.save();
    console.log(`✅ Session created: ${sessionId}`);
    
    res.json({
      success: true,
      message: 'Sign in successful',
      user: session.user,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('SignIn error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// 🆕 CHECK ANY ACTIVE SESSIONS (MongoDB)
const checkUserNamespace = async (req, res) => {
  try {
    console.log('🔍 Checking for active user sessions in database...');
    
    // Find all active sessions
    const activeSessions = await Session.find({ isActive: true })
      .sort({ lastActivity: -1 })
      .populate('userId', 'username email name isActive');
    
    if (activeSessions.length > 0) {
      // Return the most recent session
      const latestSession = activeSessions[0];
      
      // Update last activity
      latestSession.lastActivity = new Date();
      await latestSession.save();
      
      const user = latestSession.userId;
      
      if (user && user.isActive) {
        console.log(`✅ Found active session for: ${user.username}`);
        
        // Get total user count
        const totalUsers = await User.countDocuments();
        
        res.json({
          success: true,
          authenticated: true,
          user: latestSession.user,
          sessionId: latestSession.sessionId,
          namespace: {
            totalUsers,
            activeSessions: activeSessions.length,
            userCreatedAt: user.createdAt,
            lastLoginAt: user.updatedAt
          }
        });
      } else {
        console.log('❌ User not found or inactive');
        
        res.json({
          success: true,
          authenticated: false,
          message: 'User not found or inactive'
        });
      }
    } else {
      console.log('❌ No active sessions found');
      
      res.json({
        success: true,
        authenticated: false,
        message: 'No active sessions'
      });
    }
    
  } catch (error) {
    console.error('CheckUserNamespace error:', error);
    res.status(500).json({
      success: false,
      authenticated: false,
      message: 'Internal server error'
    });
  }
};

// 🆕 SIGN OUT - Remove specific session (MongoDB)
const signOut = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId) {
      const session = await Session.findOne({ sessionId });
      
      if (session) {
        console.log(`✅ User signed out: ${session.user.username} (session: ${sessionId})`);
        await Session.deleteOne({ sessionId });
      }
    } else {
      // Sign out all sessions if no specific sessionId provided
      console.log(`✅ All sessions cleared`);
      await Session.deleteMany({});
    }
    
    res.json({
      success: true,
      message: 'Sign out successful'
    });
    
  } catch (error) {
    console.error('SignOut error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// 🆕 GET NAMESPACE INFO (MongoDB)
const getNamespaceInfo = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeSessions = await Session.countDocuments({ isActive: true });
    
    const users = await User.find({}, 'username email name createdAt updatedAt isActive')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      namespace: {
        totalUsers,
        activeSessions,
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          lastLoginAt: user.updatedAt,
          isActive: user.isActive,
          notesCount: user.notes ? user.notes.length : 0
        }))
      }
    });
    
  } catch (error) {
    console.error('GetNamespaceInfo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// OAuth token exchange
const exchangeOAuthToken = async (req, res) => {
  try {
    const { code, clientId, redirectUri } = req.body;

    if (!code || !clientId || !redirectUri) {
      return res.status(400).json({
        success: false,
        message: 'Missing required OAuth parameters'
      });
    }

    // Check rate limiting
    const clientIp = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(`oauth_${clientIp}`)) {
      return res.status(429).json({
        success: false,
        message: 'Too many OAuth attempts. Please try again later.'
      });
    }

    console.log('🔄 Exchanging OAuth code for token...');

    // Exchange authorization code for access token with Google
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: process.env.GOOGLE_CLIENT_SECRET, // You'll need to add this to your .env
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        message: 'Failed to obtain access token'
      });
    }

    // Get user info from Google
    const userResponse = await axios.get(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`);
    const googleUser = userResponse.data;

    console.log('👤 Google user info:', googleUser);

    // Check if user exists in our database
    let user = await User.findOne({ email: googleUser.email });
    let isNewUser = false;

    if (!user) {
      // Create new user with shorter username
      // Take last 8 digits of Google ID + random 4 digits to ensure uniqueness within 30 char limit
      const googleIdSuffix = googleUser.id.slice(-8);
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const username = `g_${googleIdSuffix}_${randomSuffix}`;
      
      user = new User({
        username,
        email: googleUser.email,
        name: googleUser.name || googleUser.email,
        password: 'oauth_google', // OAuth users don't have passwords - will be hashed automatically
        authProvider: 'google',
        googleId: googleUser.id,
        profilePicture: googleUser.picture,
        isActive: true
      });

      await user.save();
      isNewUser = true;
      console.log('✅ New OAuth user created:', user.email);
    } else {
      // Update existing user with Google info if not already set
      if (!user.googleId) {
        user.googleId = googleUser.id;
        user.authProvider = 'google';
        if (googleUser.picture && !user.profilePicture) {
          user.profilePicture = googleUser.picture;
        }
        await user.save();
      }
      console.log('✅ Existing user signed in via OAuth:', user.email);
    }

    // Create session
    const sessionId = uuidv4();
    const session = new Session({
      sessionId,
      userId: user._id.toString(), // Use MongoDB _id
      email: user.email,
      username: user.username,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await session.save();

    // Return success with user data and appropriate message
    const message = isNewUser 
      ? 'Account created successfully with Google!' 
      : 'Welcome back! Signed in with Google.';
    
    res.json({
      success: true,
      message: message,
      accessToken: access_token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture
      },
      sessionId,
      isNewUser: isNewUser
    });

  } catch (error) {
    console.error('❌ OAuth token exchange error:', error);
    
    if (error.response) {
      console.error('Google API Error:', error.response.data);
    }

    // More specific error messages
    let errorMessage = 'OAuth authentication failed';
    if (error.message.includes('validation')) {
      errorMessage = 'User data validation failed';
    } else if (error.message.includes('duplicate')) {
      errorMessage = 'User already exists with different provider';
    } else if (error.response?.status === 400) {
      errorMessage = 'Invalid authorization code';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Add missing methods
const verifyAuth = async (req, res) => {
  res.json({
    success: true,
    authenticated: true,
    message: 'Authentication verified'
  });
};

const healthCheck = async (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString()
  });
};

const checkSession = async (req, res) => {
  try {
    const activeSessions = await Session.countDocuments();
    res.json({
      success: true,
      authenticated: activeSessions > 0,
      message: `Found ${activeSessions} active sessions`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Session check failed'
    });
  }
};

module.exports = {
  signUp,
  signIn,
  signOut,
  verifyAuth,
  healthCheck,
  checkSession,
  checkUserNamespace,
  getNamespaceInfo,
  exchangeOAuthToken
}; 
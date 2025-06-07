const express = require('express');
const { signUp, signIn, signOut, checkUserNamespace, getNamespaceInfo } = require('../controllers/authController');

const router = express.Router();

// 🆕 CLEAN Authentication routes
router.post('/signup', signUp);
router.post('/signin', signIn);
router.post('/signout', signOut);

// 🆕 NEW: Namespace checking (used by Chrome extension)
router.get('/check-namespace', checkUserNamespace);

// 🆕 Debug/Admin routes
router.get('/namespace-info', getNamespaceInfo);

// Health check endpoint for authentication service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 
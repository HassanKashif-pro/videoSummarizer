const express = require('express');
const authController = require('../controllers/authController');
const { signUp, signIn, signOut, checkUserNamespace, getNamespaceInfo, exchangeOAuthToken, checkSession, verifyAuth, healthCheck } = authController;

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
router.get('/health', healthCheck);

// Verification endpoint
router.get('/verify', verifyAuth);

// New OAuth routes
router.post('/oauth/token', exchangeOAuthToken);
router.get('/check-session', checkSession);

module.exports = router; 
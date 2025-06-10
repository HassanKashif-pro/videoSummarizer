export const GOOGLE_OAUTH_CONFIG = {
  clientId: '600722405825-mdi2i744lrosd1teupdv4r9flepsst79.apps.googleusercontent.com',
  redirectUri: 'http://localhost:5173/callback',
  scope: 'openid email profile',
  responseType: 'code',
  accessType: 'offline',
  prompt: 'select_account'
};

export const OAUTH_ENDPOINTS = {
  authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
  token: 'https://oauth2.googleapis.com/token',
  userInfo: 'https://www.googleapis.com/oauth2/v2/userinfo'
}; 
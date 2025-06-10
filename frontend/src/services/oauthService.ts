import { GOOGLE_OAUTH_CONFIG, OAUTH_ENDPOINTS } from '../config/oauth';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export interface OAuthResult {
  success: boolean;
  user?: GoogleUserInfo;
  accessToken?: string;
  error?: string;
}

class OAuthService {
  
  /**
   * Initiates Google OAuth flow with popup window
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      console.log('🚀 Starting Google OAuth flow...');
      
      // Create OAuth URL
      const authUrl = this.buildAuthUrl();
      console.log('🔗 OAuth URL:', authUrl);
      
      // Open popup window
      const popup = this.openPopup(authUrl);
      
      // Wait for OAuth completion
      const result = await this.waitForOAuthCompletion(popup);
      return result;
      
    } catch (error) {
      console.error('❌ OAuth error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth failed'
      };
    }
  }

  /**
   * Build Google OAuth authorization URL
   */
  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
      scope: GOOGLE_OAUTH_CONFIG.scope,
      response_type: GOOGLE_OAUTH_CONFIG.responseType,
      access_type: GOOGLE_OAUTH_CONFIG.accessType,
      prompt: GOOGLE_OAUTH_CONFIG.prompt
    });

    return `${OAUTH_ENDPOINTS.authorize}?${params.toString()}`;
  }

  /**
   * Open OAuth popup window
   */
  private openPopup(url: string): Window {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      url,
      'google_oauth',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      throw new Error('Failed to open OAuth popup. Please allow popups for this site.');
    }

    return popup;
  }

  /**
   * Wait for OAuth completion and handle the result
   */
  private async waitForOAuthCompletion(popup: Window): Promise<OAuthResult> {
    return new Promise((resolve) => {
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          resolve({
            success: false,
            error: 'OAuth cancelled by user'
          });
        }
      }, 1000);

      // Listen for messages from popup
      const messageHandler = async (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data.type === 'OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();

          try {
            // Exchange authorization code for access token
            const tokenResult = await this.exchangeCodeForToken(event.data.code);
            
            if (tokenResult.success && tokenResult.accessToken) {
              // Get user info
              const userInfo = await this.getUserInfo(tokenResult.accessToken);
              resolve({
                success: true,
                user: userInfo,
                accessToken: tokenResult.accessToken
              });
            } else {
              resolve({
                success: false,
                error: 'Failed to exchange authorization code'
              });
            }
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Token exchange failed'
            });
          }
        } else if (event.data.type === 'OAUTH_ERROR') {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          popup.close();
          resolve({
            success: false,
            error: event.data.error || 'OAuth failed'
          });
        }
      };

      window.addEventListener('message', messageHandler);
    });
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      const response = await fetch('http://localhost:3001/api/auth/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          clientId: GOOGLE_OAUTH_CONFIG.clientId,
          redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri
        })
      });

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          accessToken: data.accessToken
        };
      } else {
        return {
          success: false,
          error: data.message || 'Token exchange failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get user information from Google API
   */
  private async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(`${OAUTH_ENDPOINTS.userInfo}?access_token=${accessToken}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch user information');
    }

    return await response.json();
  }

  /**
   * Handle OAuth callback (for the popup window)
   */
  handleOAuthCallback(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      window.opener?.postMessage({
        type: 'OAUTH_ERROR',
        error: error
      }, window.location.origin);
    } else if (code) {
      window.opener?.postMessage({
        type: 'OAUTH_SUCCESS',
        code: code
      }, window.location.origin);
    } else {
      window.opener?.postMessage({
        type: 'OAUTH_ERROR',
        error: 'No authorization code received'
      }, window.location.origin);
    }

    window.close();
  }
}

export const oauthService = new OAuthService(); 
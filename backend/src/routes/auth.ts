import { Router, Request, Response } from 'express';
import { TwitterApi } from 'twitter-api-v2';
import { config } from '../config/index.js';

// Extend Express Session
interface TwitterSession {
  twitter?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    user: {
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
      description?: string;
    };
  };
}

const router = Router();

// Store OAuth state temporarily (in production, use Redis or database)
const oauthStates = new Map<string, any>();

/**
 * OAuth 2.0 Flow for Twitter/X
 * Initiate OAuth authentication
 */
router.get('/twitter/login', async (req: Request, res: Response) => {
  try {
    const client = new TwitterApi({
      clientId: config.twitter.clientId,
      clientSecret: config.twitter.clientSecret,
    });

    // Generate OAuth 2.0 authorization URL
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      config.twitter.callbackUrl,
      {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']
      }
    );

    // Store codeVerifier and state temporarily
    oauthStates.set(state, {
      codeVerifier,
      timestamp: Date.now()
    });

    // Clean up old states (older than 10 minutes)
    for (const [key, value] of oauthStates.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        oauthStates.delete(key);
      }
    }

    res.json({ authUrl: url });
  } catch (error: any) {
    console.error('Error initiating Twitter OAuth:', error);
    res.status(500).json({
      error: 'Failed to initiate OAuth',
      message: error.message
    });
  }
});

/**
 * OAuth callback endpoint
 */
router.get('/twitter/callback', async (req: Request, res: Response) => {
  try {
    const { state, code } = req.query;

    if (!state || !code) {
      return res.status(400).send('Missing state or code parameter');
    }

    // Retrieve stored OAuth data
    const oauthData = oauthStates.get(state as string);
    if (!oauthData) {
      return res.status(400).send('Invalid or expired state parameter');
    }

    const { codeVerifier } = oauthData;

    // Create client and exchange code for tokens
    const client = new TwitterApi({
      clientId: config.twitter.clientId,
      clientSecret: config.twitter.clientSecret,
    });

    const {
      client: loggedClient,
      accessToken,
      refreshToken,
      expiresIn
    } = await client.loginWithOAuth2({
      code: code as string,
      codeVerifier,
      redirectUri: config.twitter.callbackUrl,
    });

    // Get user information
    const { data: userObject } = await loggedClient.v2.me({
      'user.fields': ['profile_image_url', 'description', 'username']
    });

    // Clean up used state
    oauthStates.delete(state as string);

    // Store tokens in session
    (req.session as TwitterSession).twitter = {
      accessToken,
      refreshToken,
      expiresIn,
      user: userObject
    };

    // Send success HTML that closes popup
    const successHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Successful</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .checkmark {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">✓</div>
        <h1>Authentication Successful!</h1>
        <p>Welcome, @${userObject.username}</p>
        <p>This window will close automatically...</p>
    </div>
    <script>
        // Close window after 2 seconds
        setTimeout(() => {
            window.close();
        }, 2000);
    </script>
</body>
</html>`;
    
    res.send(successHtml);
  } catch (error: any) {
    console.error('Error in Twitter OAuth callback:', error);
    
    const errorHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Authentication Failed</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">✗</div>
        <h1>Authentication Failed</h1>
        <p>${error.message}</p>
        <p>This window will close automatically...</p>
    </div>
    <script>
        setTimeout(() => {
            window.close();
        }, 3000);
    </script>
</body>
</html>`;
    
    res.send(errorHtml);
  }
});

/**
 * Get current user info
 */
router.get('/twitter/user', async (req: Request, res: Response) => {
  try {
    const twitterData = (req.session as TwitterSession).twitter;
    
    if (!twitterData || !twitterData.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      authenticated: true,
      user: twitterData.user
    });
  } catch (error: any) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * Logout endpoint
 */
router.post('/twitter/logout', (req: Request, res: Response) => {
  (req.session as TwitterSession).twitter = undefined;
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Refresh access token
 */
router.post('/twitter/refresh', async (req: Request, res: Response) => {
  try {
    const twitterData = (req.session as TwitterSession).twitter;
    
    if (!twitterData || !twitterData.refreshToken) {
      return res.status(401).json({ error: 'No refresh token available' });
    }

    const client = new TwitterApi({
      clientId: config.twitter.clientId,
      clientSecret: config.twitter.clientSecret,
    });

    const {
      client: refreshedClient,
      accessToken,
      refreshToken,
      expiresIn
    } = await client.refreshOAuth2Token(twitterData.refreshToken);

    // Update session with new tokens
    (req.session as TwitterSession).twitter = {
      ...twitterData,
      accessToken,
      refreshToken: refreshToken || twitterData.refreshToken,
      expiresIn
    };

    res.json({ success: true, message: 'Token refreshed successfully' });
  } catch (error: any) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Failed to refresh token',
      message: error.message
    });
  }
});

export default router;

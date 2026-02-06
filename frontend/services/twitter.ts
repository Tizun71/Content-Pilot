// Twitter OAuth via Backend Server
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
// --- Auth Flow via Backend ---

export const loginWithTwitter = async (): Promise<{ authenticated: boolean; user: any }> => {
  try {
    // 1. Get auth URL from backend
    const response = await fetch(`${BACKEND_URL}/auth/twitter/login`, {
      credentials: 'include' // Important for cookies/session
    });

    if (!response.ok) {
      throw new Error('Failed to initiate OAuth');
    }

    const { authUrl } = await response.json();

    // 2. Open popup for Twitter auth
    return new Promise((resolve, reject) => {
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        authUrl,
        'Connect to X',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        reject(new Error('Popup blocked. Please allow popups.'));
        return;
      }

      // 3. Poll for popup completion
      const pollTimer = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollTimer);
          
          // Check if auth was successful
          try {
            const userResponse = await fetch(`${BACKEND_URL}/auth/twitter/user`, {
              credentials: 'include'
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              resolve(userData);
            } else {
              reject(new Error('Authentication was not completed'));
            }
          } catch (error) {
            reject(new Error('Failed to verify authentication'));
          }
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        if (!popup.closed) {
          popup.close();
        }
        reject(new Error('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
};

// Check if user is currently authenticated
export const checkAuthStatus = async (): Promise<{ authenticated: boolean; user?: any }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/twitter/user`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      return await response.json();
    }
    
    return { authenticated: false };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authenticated: false };
  }
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    await fetch(`${BACKEND_URL}/auth/twitter/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// --- API Interaction via Backend ---

export const postTweet = async (content: string, imageBase64?: string): Promise<{ id: string; url: string }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/twitter/tweet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ text: content })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to post tweet');
    }

    const data = await response.json();
    const tweetId = data.tweet.id;
    
    return {
      id: tweetId,
      url: `https://twitter.com/i/web/status/${tweetId}`
    };
  } catch (error: any) {
    console.error('Post tweet error:', error);
    throw error;
  }
};

// Get user timeline
export const getUserTimeline = async (): Promise<any[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/twitter/timeline`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch timeline');
    }

    const data = await response.json();
    return data.tweets || [];
  } catch (error: any) {
    console.error('Timeline error:', error);
    throw error;
  }
};

// Search tweets
export const searchTweets = async (query: string, maxResults: number = 10): Promise<any[]> => {
  try {
    const params = new URLSearchParams({
      query,
      maxResults: maxResults.toString()
    });

    const response = await fetch(`${BACKEND_URL}/api/twitter/search?${params}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to search tweets');
    }

    const data = await response.json();
    return data.tweets || [];
  } catch (error: any) {
    console.error('Search error:', error);
    throw error;
  }
};
import { Router, Request, Response } from 'express';
import { TwitterApi } from 'twitter-api-v2';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

const router = Router();

/**
 * Middleware to verify JWT token and extract Twitter credentials
 */
const authenticateJWT = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret as string) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Get authenticated Twitter client from JWT
 */
const getTwitterClient = (req: Request): TwitterApi => {
  const userData = (req as any).user;
  const { accessToken } = userData.twitter;
  return new TwitterApi(accessToken);
};

/**
 * Post a tweet
 */
/**
 * Post a tweet
 */
router.post('/tweet', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Tweet text is required' });
    }

    const client = getTwitterClient(req);
    const tweet = await client.v2.tweet(text);

    res.json({
      success: true,
      tweet: tweet.data
    });
  } catch (error: any) {
    console.error('Error posting tweet:', error);
    res.status(500).json({
      error: 'Failed to post tweet',
      message: error.message
    });
  }
});

/**
 * Get user timeline
 */
router.get('/timeline', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const client = getTwitterClient(req);
    const userData = (req as any).user;
    const user = userData.twitter.user;

    const timeline = await client.v2.userTimeline(user.id, {
      max_results: 10,
      'tweet.fields': ['created_at', 'public_metrics']
    });

    res.json({
      success: true,
      tweets: timeline.data.data
    });
  } catch (error: any) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch timeline',
      message: error.message
    });
  }
});

/**
 * Search tweets
 */
router.get('/search', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { query, maxResults = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const client = getTwitterClient(req);
    const searchResults = await client.v2.search(query as string, {
      max_results: parseInt(maxResults as string),
      'tweet.fields': ['created_at', 'public_metrics', 'author_id']
    });

    res.json({
      success: true,
      tweets: searchResults.data.data
    });
  } catch (error: any) {
    console.error('Error searching tweets:', error);
    res.status(500).json({
      error: 'Failed to search tweets',
      message: error.message
    });
  }
});

/**
 * Delete a tweet
 */
router.delete('/tweet/:id', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const client = getTwitterClient(req);

    await client.v2.deleteTweet(id);

    res.json({
      success: true,
      message: 'Tweet deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting tweet:', error);
    res.status(500).json({
      error: 'Failed to delete tweet',
      message: error.message
    });
  }
});

/**
 * Get user profile
 */
router.get('/profile/:username', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const client = getTwitterClient(req);

    const user = await client.v2.userByUsername(username, {
      'user.fields': ['description', 'public_metrics', 'profile_image_url', 'created_at']
    });

    res.json({
      success: true,
      user: user.data
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      error: 'Failed to fetch profile',
      message: error.message
    });
  }
});

export default router;

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Twitter OAuth 2.0
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    callbackUrl: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3001/auth/twitter/callback',
    
    // OAuth 1.0a (optional)
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
  },
  
  session: {
    secret: process.env.SESSION_SECRET || 'your-random-session-secret',
  }
};

export const validateConfig = () => {
  const requiredVars = [
    'TWITTER_CLIENT_ID',
    'TWITTER_CLIENT_SECRET',
    'SESSION_SECRET'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Warning: Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please create a .env file based on .env.example');
  }
};

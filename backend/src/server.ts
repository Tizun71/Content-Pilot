import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/index.js';
import geminiRoutes from './routes/gemini.js';

const app = express();

// Validate config on startup
validateConfig();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint (MUST be before other routes)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: config.port,
    nodeEnv: config.nodeEnv
  });
});

// API Routes
app.use('/api/gemini', geminiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Content Pilot API',
    status: 'running',
    version: '1.0.0'
  });
});

// Start server
const startServer = () => {
  const PORT = Number(config.port);
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`CORS enabled for: ${config.frontendUrl}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  // Handle errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
};

startServer();

export default app;

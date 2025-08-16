
// Import config first to validate environment variables
import { config } from './config.js';
import express from 'express';
import mongoose from 'mongoose';
import authRouter from './routers/auth.js';

const app = express();
const PORT = config.PORT;

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic middleware for logging requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Mount OAuth routes
app.use('/auth', authRouter);

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the HubSpot Integration API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

async function connectToMongoDB() {
  try {
    await mongoose.connect(config.MONGO_CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Handle MongoDB connection events
mongoose.connection.on('error', (error) => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

async function startServer() {
  console.log('Starting HubSpot Integration Server...');
  const mongoConnected = await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API available at: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);

    if (config.CLIENT_ID && config.SCOPES && config.REDIRECT_URI) {
      const authUrl =
        'https://app.hubspot.com/oauth/authorize' +
        `?client_id=${encodeURIComponent(config.CLIENT_ID)}` +
        `&scope=${encodeURIComponent(config.SCOPES)}` +
        `&redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}`;

      console.log(`Authorization URL: ${authUrl}`);
    } else {
      console.log('OAuth configuration incomplete - check your .env file');
    }
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
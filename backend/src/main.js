
// Import config first to validate environment variables
import { config } from './config.js';
import express from 'express';
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

// Routes
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

app.post('/api/hubspot/contacts', (req, res) => {
  res.json({
    success: true,
    message: 'HubSpot contact creation endpoint - to be implemented',
    data: null
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const authUrl =
  'https://app.hubspot.com/oauth/authorize' +
  `?client_id=${encodeURIComponent(config.CLIENT_ID)}` +
  `&scope=${encodeURIComponent(config.SCOPES)}` +
  `&redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}`

console.log(`Authorization URL: ${authUrl}`);
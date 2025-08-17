import { config } from './config.js';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import authRouter from './routers/auth.js';
import userRouter from './routers/user.js';
import hubspotRouter from './routers/hubspot.js';
import webhookRouter from './routers/webhook.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT: number = Number(config.PORT);

// Middleware that should apply to all routes
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic middleware for logging requests
app.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', express.json(), authRouter);
app.use('/api/users', express.json(), userRouter);
app.use('/api/hubspot', express.json(), hubspotRouter);
// Webhook route with raw body parsing for signature validation
app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);

app.get('/', (req: Request, res: Response): void => {
  try {
    const htmlPath = join(__dirname, 'templates', 'index.html');
    const html = readFileSync(htmlPath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    // Fallback to JSON if HTML file can't be read
    console.warn("Could not read index.html, falling back to JSON response:", error);
    res.json({
      message: 'Welcome to the HubSpot Integration API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      github: 'https://github.com/LokeshShelva/hubspot-integration'
    });
  }
});

app.get('/health', (req: Request, res: Response): void => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};

app.use(errorHandler);

async function connectToMongoDB(): Promise<boolean> {
  try {
    await mongoose.connect(config.MONGO_CONNECTION_STRING as string);
    console.log('Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Handle MongoDB connection events
mongoose.connection.on('error', (error: Error): void => {
  console.error('MongoDB connection error:', error);
});

mongoose.connection.on('disconnected', (): void => {
  console.log('MongoDB disconnected');
});

async function startServer(): Promise<void> {
  console.log('Starting HubSpot Integration Server...');
  await connectToMongoDB();
  
  app.listen(PORT, (): void => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API available at: http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

startServer().catch((error: Error): void => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

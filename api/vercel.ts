import { config } from './config.js';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import authRouter from './routers/auth.js';
import userRouter from './routers/user.js';
import hubspotRouter from './routers/hubspot.js';
import webhookRouter from './routers/webhook.js';

const app = express();

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
  res.json({
    message: 'Welcome to the HubSpot Integration API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
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

// MongoDB connection for Vercel (connection pooling)
let isConnected = false;

async function connectToMongoDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(config.MONGO_CONNECTION_STRING as string, {
      bufferCommands: false,
    });
    isConnected = true;
    console.log('Connected to MongoDB successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Vercel handler function
export default async (req: Request, res: Response) => {
  await connectToMongoDB();
  return app(req, res);
};

import { config } from './config.js';
import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';
import authRouter from './routers/auth.js';
import userRouter from './routers/user.js';
import hubspotRouter from './routers/hubspot.js';

const app = express();
const PORT: number = Number(config.PORT);

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Basic middleware for logging requests
app.use((req: Request, res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Application Routes
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/hubspot', hubspotRouter);

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

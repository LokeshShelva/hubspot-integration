import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import User from '../models/user.js';

// Extend the Express Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        lastLogin: Date | null;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token in the Authorization header'
      });
      return;
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Find the user
    const user = await (User as any).findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found or inactive'
      });
      return;
    }

    // Add user info to request
    req.user = {
      userId: user._id.toString(),
      username: user.username,
      lastLogin: user.lastLogin
    };

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    
    if (error.message === 'Token has expired') {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your access token has expired. Please refresh your token.'
      });
      return;
    }
    
    if (error.message === 'Invalid token') {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Token verification failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthentication = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      const user = await (User as any).findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: user._id.toString(),
          username: user.username,
          lastLogin: user.lastLogin
        };
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional authentication
    next();
  }
};

/**
 * Middleware to check if user is active
 */
export const requireActiveUser = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
    return;
  }
  
  next();
};

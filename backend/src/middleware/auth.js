import { verifyToken, extractTokenFromHeader } from '../utils/jwt.js';
import { User } from '../models/index.js';

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid access token in the Authorization header'
      });
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Find the user
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'User not found or inactive'
      });
    }

    // Add user info to request
    req.user = {
      userId: user._id,
      username: user.username,
      lastLogin: user.lastLogin
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.message === 'Token has expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your access token has expired. Please refresh your token.'
      });
    }
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Token verification failed'
    });
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: user._id,
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
export const requireActiveUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in to access this resource'
    });
  }
  
  next();
};

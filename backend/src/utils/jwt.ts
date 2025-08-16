import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { IUserDocument, UserForToken } from '../types/user.js';

// Define interfaces for better type safety
interface TokenPayload {
  userId: string;
  username: string;
}

interface User {
  _id: string;
  username: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

interface DecodedToken {
  userId: string;
  username: string;
  iss: string;
  aud: string;
  [key: string]: any;
}

/**
 * Generate access token
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
    issuer: 'hubspot-integration',
    audience: 'hubspot-api'
  } as any);
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (payload: TokenPayload): string => {
  if (!config.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    issuer: 'hubspot-integration',
    audience: 'hubspot-api'
  } as any);
};

/**
 * Verify token
 */
export const verifyToken = (token: string): DecodedToken => {
  try {
    if (!config.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'hubspot-integration',
      audience: 'hubspot-api'
    }) as DecodedToken;
    
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

/**
 * Generate token pair (access + refresh)
 */
export const generateTokenPair = (user: User | IUserDocument | UserForToken): TokenPair => {
  const payload: TokenPayload = {
    userId: user._id.toString(), // Always convert to string
    username: user.username
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    expiresIn: config.JWT_EXPIRES_IN
  };
};

/**
 * Extract token from authorization header
 */
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1] || null;
};

// Export types for use in other files
export type { TokenPayload, User, TokenPair, DecodedToken, IUserDocument, UserForToken };

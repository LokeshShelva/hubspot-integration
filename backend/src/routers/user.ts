import express, { Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import UserService from '../services/userService.js';

const router = express.Router();
const userService = new UserService();

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, user_account_id } = req.body;

    if (!username || !password || !user_account_id) {
      res.status(400).json({
        success: false,
        error: 'Username, password, and user_account_id are required'
      });
      return;
    }

    const result = await userService.createUser({ username, password, user_account_id });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    
    if (error.code === 'USER_EXISTS' || error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Username already exists',
        message: error.message
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: 'Signup failed',
      message: error.message || 'An error occurred while creating your account'
    });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }
    
    const result = await userService.loginUser({ username, password });

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });

  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: error.message
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: 'Login failed',
      message: error.message || 'An error occurred while logging in'
    });
  }
});

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
      return;
    }

    try {
      verifyToken(refreshToken);
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'The refresh token is invalid or expired'
      });
      return;
    }

    const result = await userService.refreshUserTokens(refreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: result
    });

  } catch (error: any) {
    console.error('Token refresh error:', error);
    
    if (error.code === 'INVALID_REFRESH_TOKEN') {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: error.message
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message || 'An error occurred while refreshing tokens'
    });
  }
});

export default router;

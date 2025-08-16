import express from 'express';
import { verifyToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';
import UserService from '../services/userService.js';

const router = express.Router();
const userService = new UserService();

router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await userService.createUser({ username, password });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.code === 'USER_EXISTS' || error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists',
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      error: 'Signup failed',
      message: error.message || 'An error occurred while creating your account'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await userService.loginUser({ username, password });

    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      error: 'Login failed',
      message: error.message || 'An error occurred while logging in'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    try {
      verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'The refresh token is invalid or expired'
      });
    }

    const result = await userService.refreshUserTokens(refreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: result
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.code === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: error.message
      });
    }

    res.status(400).json({
      success: false,
      error: 'Token refresh failed',
      message: error.message || 'An error occurred while refreshing tokens'
    });
  }
});

export default router;

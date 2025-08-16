import express from 'express';
import { User } from '../models/index.js';
import { generateTokenPair, verifyToken } from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Username and password are required'
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Invalid username',
        message: 'Username must be between 3 and 50 characters'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password',
        message: 'Password must be at least 6 characters long'
      });
    }

    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this username already exists'
      });
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password
    });

    await user.save();

    const tokens = generateTokenPair(user);
    await user.addRefreshToken(tokens.refreshToken);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        tokens
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists',
        message: 'This username is already taken'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Signup failed',
      message: 'An error occurred while creating your account'
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid username or password'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid username or password'
      });
    }

    const tokens = generateTokenPair(user);
    
    await user.addRefreshToken(tokens.refreshToken);
    await user.updateLastLogin();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        tokens
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'An error occurred while logging in'
    });
  }
});

// Refresh token endpoint
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        message: 'Please provide a refresh token'
      });
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'The refresh token is invalid or expired'
      });
    }

    const user = await User.findByRefreshToken(refreshToken);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Refresh token not found or user inactive'
      });
    }

    if (user.id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not allowed to refresh this token'
      });
    }

    const tokens = generateTokenPair(user);
    
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(tokens.refreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: 'An error occurred while refreshing tokens'
    });
  }
});

export default router;

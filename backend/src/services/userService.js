import { User } from '../models/index.js';
import { generateTokenPair } from '../utils/jwt.js';

class UserService {
  /**
   * Create a new user account
   * @param {Object} userData - User registration data
   * @param {string} userData.username - Username
   * @param {string} userData.password - Password
   * @returns {Object} - Created user and tokens
   */
  async createUser({ username, password }) {
    // Validation
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    if (username.length < 3 || username.length > 50) {
      throw new Error('Username must be between 3 and 50 characters');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      const error = new Error('A user with this username already exists');
      error.code = 'USER_EXISTS';
      throw error;
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase().trim(),
      password
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Add refresh token to user
    await user.addRefreshToken(tokens.refreshToken);

    return {
      user: user.toJSON(),
      tokens
    };
  }

  /**
   * Authenticate user login
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username
   * @param {string} credentials.password - Password
   * @returns {Object} - User and tokens
   */
  async loginUser({ username, password }) {
    // Validation
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    // Find user
    const user = await User.findByUsername(username);
    if (!user) {
      const error = new Error('Invalid username or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error = new Error('Invalid username or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Generate tokens
    const tokens = generateTokenPair(user);
    
    // Add refresh token to user and update last login
    await user.addRefreshToken(tokens.refreshToken);
    await user.updateLastLogin();

    return {
      user: user.toJSON(),
      tokens
    };
  }

  /**
   * Refresh user tokens
   * @param {string} refreshToken - Refresh token
   * @param {string} userId - User ID (for security validation)
   * @returns {Object} - New tokens
   */
  async refreshUserTokens(refreshToken, userId = null) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const user = await User.findByRefreshToken(refreshToken);
    if (!user) {
      const error = new Error('Refresh token not found or user inactive');
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    if (userId && user._id.toString() !== userId) {
      const error = new Error('You are not allowed to refresh this token');
      error.code = 'FORBIDDEN';
      throw error;
    }

    const tokens = generateTokenPair(user);
    
    await user.removeRefreshToken(refreshToken);
    await user.addRefreshToken(tokens.refreshToken);

    return { tokens };
  }
}

export default UserService;

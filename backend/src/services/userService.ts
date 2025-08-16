import User from '../models/user.js';
import { generateTokenPair, type TokenPair } from '../utils/jwt.js';

interface UserData {
  username: string;
  password: string;
  user_account_id: string;
}

interface UserCredentials {
  username: string;
  password: string;
}

interface CreateUserResponse {
  tokens: TokenPair;
}

interface LoginUserResponse {
  tokens: TokenPair;
}

interface RefreshTokensResponse {
  tokens: TokenPair;
}

interface ServiceError extends Error {
  code?: string;
}

class UserService {
  /**
   * Create a new user account
   * @param userData - User registration data
   * @param userData.username - Username
   * @param userData.password - Password
   * @param userData.user_account_id - User account ID from Hubspot
   * @returns Created user and tokens
   */
  async createUser({ username, password, user_account_id }: UserData): Promise<CreateUserResponse> {
    if (!username || !password || !user_account_id) {
      throw new Error('Username, password, and user_account_id are required');
    }

    if (username.length < 3 || username.length > 50) {
      throw new Error('Username must be between 3 and 50 characters');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const existingUser = await (User as any).findByUsername(username);
    if (existingUser) {
      const error: ServiceError = new Error('A user with this username already exists');
      error.code = 'USER_EXISTS';
      throw error;
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      user_account_id
    });

    await user.save();
    const tokens = generateTokenPair(user as any);
    await (user as any).addRefreshToken(tokens.refreshToken);

    return {
      tokens
    };
  }

  /**
   * Authenticate user login
   * @param credentials - Login credentials
   * @param credentials.username - Username
   * @param credentials.password - Password
   * @returns User and tokens
   */
  async loginUser({ username, password }: UserCredentials): Promise<LoginUserResponse> {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const user = await (User as any).findByUsername(username);
    if (!user) {
      const error: ServiceError = new Error('Invalid username or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      const error: ServiceError = new Error('Invalid username or password');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const tokens = generateTokenPair(user);
    await user.addRefreshToken(tokens.refreshToken);
    await user.updateLastLogin();

    return {
      tokens
    };
  }

  /**
   * Refresh user tokens
   * @param refreshToken - Refresh token
   * @param userId - User ID (for security validation)
   * @returns New tokens
   */
  async refreshUserTokens(refreshToken: string, userId: string | null = null): Promise<RefreshTokensResponse> {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const user = await (User as any).findByRefreshToken(refreshToken);
    if (!user) {
      const error: ServiceError = new Error('Refresh token not found or user inactive');
      error.code = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    if (userId && user._id.toString() !== userId) {
      const error: ServiceError = new Error('You are not allowed to refresh this token');
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
export type { UserData, UserCredentials, CreateUserResponse, LoginUserResponse, RefreshTokensResponse, ServiceError };

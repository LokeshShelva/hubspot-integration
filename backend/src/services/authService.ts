import Auth from "../models/auth.js";
import { config } from "../config.js";
import CryptoJS from "crypto-js";
import type { 
  IAuthDocument, 
  IAuthModel, 
  TokenData, 
  EncryptedTokenData, 
  HubSpotTokenResponse, 
  DecryptedAuthData 
} from "../types/auth.js";

class AuthService {
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private redirectUri: string | undefined;
  private tokenUrl: string | undefined;
  private encryptionKey: string | undefined;

  constructor() {
    this.clientId = config.CLIENT_ID;
    this.clientSecret = config.CLIENT_SECRET;
    this.redirectUri = config.REDIRECT_URI;
    this.tokenUrl = config.TOKEN_URL;
    this.encryptionKey = config.ENCRYPTION_KEY;
  }

  /**
   * Encrypts sensitive data using AES encryption
   * @param text - The text to encrypt
   * @returns The encrypted text or null if input is falsy
   */
  encryptToken(text: string | null | undefined): string | null {
    try {
      if (!text) return null;
      if (!this.encryptionKey) {
        throw new Error('Encryption key not configured');
      }
      const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypts sensitive data using AES decryption
   * @param encryptedText - The encrypted text to decrypt
   * @returns The decrypted text or null if input is falsy
   */
  decryptToken(encryptedText: string | null | undefined): string | null {
    try {
      if (!encryptedText) return null;
      if (!this.encryptionKey) {
        throw new Error('Encryption key not configured');
      }
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Encrypts token data before saving to database
   * @param tokenData - Object containing access_token and refresh_token
   * @returns Object with encrypted tokens
   */
  encryptTokenData(tokenData: TokenData): EncryptedTokenData {
    const encryptedAccessToken = this.encryptToken(tokenData.access_token);
    const encryptedRefreshToken = this.encryptToken(tokenData.refresh_token);
    
    if (!encryptedAccessToken || !encryptedRefreshToken) {
      throw new Error('Failed to encrypt token data');
    }

    return {
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken
    };
  }

  /**
   * Decrypts token data after retrieving from database
   * @param encryptedTokenData - Object containing encrypted tokens
   * @returns Object with decrypted tokens
   */
  decryptTokenData(encryptedTokenData: EncryptedTokenData): TokenData {
    const decryptedAccessToken = this.decryptToken(encryptedTokenData.access_token);
    const decryptedRefreshToken = this.decryptToken(encryptedTokenData.refresh_token);
    
    if (!decryptedAccessToken || !decryptedRefreshToken) {
      throw new Error('Failed to decrypt token data');
    }

    return {
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken
    };
  }

  /**
   * Creates an access token by exchanging authorization code
   * @param code - Authorization code from OAuth flow
   * @param username - Username to associate the token with
   * @returns Updated auth record with new tokens
   */
  async createAccessToken(code: string, username: string): Promise<IAuthDocument> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri || !this.tokenUrl) {
      throw new Error('OAuth configuration incomplete');
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange authorization code for access token');
    }

    const tokenData = await response.json() as HubSpotTokenResponse;

    if (!tokenData.access_token) {
      throw new Error('Access token not found in response');
    }

    if (!tokenData.refresh_token) {
      throw new Error('Refresh token not found in response');
    }

    if (!tokenData.expires_in) {
      throw new Error('Expiration time not found in response');
    }

    // Encrypt tokens before saving to database
    const encryptedTokenData = this.encryptTokenData({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token
    });

    // Use the createOrUpdate static method to handle upsert
    const authToken = await (Auth as any).createOrUpdate(
      username,
      encryptedTokenData.access_token,
      encryptedTokenData.refresh_token,
      tokenData.expires_in
    );

    return authToken;
  }

  /**
   * Refreshes an access token using the refresh token
   * @param username - The username to refresh tokens for
   * @returns Updated auth record with new tokens
   */
  async refreshAccessToken(username: string): Promise<IAuthDocument> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri || !this.tokenUrl) {
      throw new Error('OAuth configuration incomplete');
    }

    // Find the user's auth record
    const authRecord = await (Auth as any).findByUsername(username);
    
    if (!authRecord) {
      throw new Error('Auth record not found for user');
    }

    // Decrypt the refresh token
    const decryptedRefreshToken = this.decryptToken(authRecord.refresh_token);
    if (!decryptedRefreshToken) {
      throw new Error('Failed to decrypt refresh token');
    }

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: decryptedRefreshToken,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const tokenData = await response.json() as HubSpotTokenResponse;

    if (!tokenData.access_token) {
      throw new Error('Access token not found in refresh response');
    }

    // Encrypt new tokens
    const encryptedTokenData = this.encryptTokenData({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || decryptedRefreshToken // Use new refresh token if provided, otherwise keep the old one
    });

    // Update the tokens using the instance method
    await authRecord.updateTokens(
      encryptedTokenData.access_token,
      encryptedTokenData.refresh_token,
      tokenData.expires_in
    );

    return authRecord;
  }

  /**
   * Gets decrypted auth data for a user
   * @param username - The username to get auth data for
   * @returns Auth record with decrypted tokens
   */
  async getDecryptedAuthData(username: string): Promise<DecryptedAuthData> {
    const authRecord = await (Auth as any).findByUsername(username);
    
    if (!authRecord) {
      throw new Error('Auth record not found for user');
    }

    // Return a plain object with decrypted tokens
    const decryptedData = this.decryptTokenData({
      access_token: authRecord.access_token,
      refresh_token: authRecord.refresh_token
    });

    return {
      ...authRecord.toObject(),
      access_token: decryptedData.access_token,
      refresh_token: decryptedData.refresh_token
    };
  }

  /**
   * Validates if a token is expired and refreshes if needed
   * @param username - The username to validate tokens for
   * @returns Valid auth data with fresh tokens
   */
  async validateAndRefreshToken(username: string): Promise<IAuthDocument> {
    const authRecord = await (Auth as any).findByUsername(username);
    
    if (!authRecord) {
      throw new Error('Auth record not found for user');
    }

    // Check if token is expired
    if (authRecord.isTokenExpired()) {
      console.log(`Token expired for user ${username}, refreshing...`);
      return await this.refreshAccessToken(username);
    }

    return authRecord;
  }
}

export { AuthService };
export default AuthService;

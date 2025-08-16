import { Auth } from "../models/index.js";
import { config } from "../config.js";
import CryptoJS from "crypto-js";

class AuthService {
  constructor() {
    this.clientId = config.CLIENT_ID;
    this.clientSecret = config.CLIENT_SECRET;
    this.redirectUri = config.REDIRECT_URI;
    this.tokenUrl = config.TOKEN_URL;
    this.encryptionKey = config.ENCRYPTION_KEY;
  }

  /**
   * Encrypts sensitive data using AES encryption
   * @param {string} text - The text to encrypt
   * @returns {string} - The encrypted text
   */
  encryptToken(text) {
    try {
      if (!text) return null;
      const encrypted = CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  /**
   * Decrypts sensitive data using AES decryption
   * @param {string} encryptedText - The encrypted text to decrypt
   * @returns {string} - The decrypted text
   */
  decryptToken(encryptedText) {
    try {
      if (!encryptedText) return null;
      const decrypted = CryptoJS.AES.decrypt(encryptedText, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt token');
    }
  }

  /**
   * Encrypts token data before saving to database
   * @param {Object} tokenData - Object containing access_token and refresh_token
   * @returns {Object} - Object with encrypted tokens
   */
  encryptTokenData(tokenData) {
    return {
      ...tokenData,
      access_token: this.encryptToken(tokenData.access_token),
      refresh_token: this.encryptToken(tokenData.refresh_token)
    };
  }

  /**
   * Decrypts token data after retrieving from database
   * @param {Object} encryptedTokenData - Object containing encrypted tokens
   * @returns {Object} - Object with decrypted tokens
   */
  decryptTokenData(encryptedTokenData) {
    return {
      ...encryptedTokenData,
      access_token: this.decryptToken(encryptedTokenData.access_token),
      refresh_token: this.decryptToken(encryptedTokenData.refresh_token)
    };
  }

  async createAccessToken(code, username) {
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

    const tokenData = await response.json();

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
    const authToken = await Auth.createOrUpdate(
      username,
      encryptedTokenData.access_token,
      encryptedTokenData.refresh_token,
      tokenData.expires_in
    );

    return authToken;
  }

  /**
   * Refreshes an access token using the refresh token
   * @param {string} username - The username to refresh tokens for
   * @returns {Object} - Updated auth record with new tokens
   */
  async refreshAccessToken(username) {
    // Find the user's auth record
    const authRecord = await Auth.findByUsername(username);
    
    if (!authRecord) {
      throw new Error('Auth record not found for user');
    }

    // Decrypt the refresh token
    const decryptedRefreshToken = this.decryptToken(authRecord.refresh_token);

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

    const tokenData = await response.json();

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
   * @param {string} username - The username to get auth data for
   * @returns {Object} - Auth record with decrypted tokens
   */
  async getDecryptedAuthData(username) {
    const authRecord = await Auth.findByUsername(username);
    
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
   * @param {string} username - The username to validate tokens for
   * @returns {Object} - Valid auth data with fresh tokens
   */
  async validateAndRefreshToken(username) {
    const authRecord = await Auth.findByUsername(username);
    
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

export {AuthService};
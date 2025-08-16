import { Document, Model, Types } from 'mongoose';

// Define the shape of auth data as stored in MongoDB
export interface IAuth {
  username: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refreshed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IAuthMethods {
  isTokenExpired(): boolean;
  updateTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<IAuthDocument>;
}

export interface IAuthDocument extends Document, IAuth, IAuthMethods {
  _id: Types.ObjectId;
}

export interface IAuthModel extends Model<IAuthDocument> {
  findByUsername(username: string): Promise<IAuthDocument | null>;
  createOrUpdate(
    username: string, 
    accessToken: string, 
    refreshToken: string, 
    expiresIn: number
  ): Promise<IAuthDocument>;
}

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
}

export interface EncryptedTokenData {
  access_token: string;
  refresh_token: string;
}

export interface HubSpotTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
}

export interface DecryptedAuthData extends Omit<IAuth, 'access_token' | 'refresh_token'> {
  access_token: string;
  refresh_token: string;
  _id: Types.ObjectId;
  __v?: number;
}

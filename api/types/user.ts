import { Document, Model, Types } from "mongoose";

export interface IRefreshToken {
  token: string;
  createdAt: Date;
}

export interface IUser {
  username: string;
  password: string;
  user_account_id: string;
  refreshTokens: IRefreshToken[];
  isActive: boolean;
  lastLogin: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  addRefreshToken(token: string): Promise<IUserDocument>;
  removeRefreshToken(token: string): Promise<IUserDocument>;
  removeAllRefreshTokens(): Promise<IUserDocument>;
  updateLastLogin(): Promise<IUserDocument>;
}

export interface IUserDocument extends Document, IUser, IUserMethods {
  _id: Types.ObjectId;
}

export interface IUserModel extends Model<IUserDocument> {
  findByUsername(username: string): Promise<IUserDocument | null>;
  findByRefreshToken(token: string): Promise<IUserDocument | null>;
}

export interface UserForToken {
  _id: string | Types.ObjectId;
  username: string;
}

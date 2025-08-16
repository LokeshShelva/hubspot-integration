import mongoose, { Schema } from 'mongoose';
import { IAuth, IAuthDocument, IAuthModel } from '../types/auth.js';

const authSchema = new Schema<IAuth>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  access_token: {
    type: String,
    required: true,
    trim: true
  },
  refresh_token: {
    type: String,
    required: true,
    trim: true
  },
  expires_in: {
    type: Number,
    required: true,
    min: 0
  },
  refreshed_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false, // We're handling timestamps manually
  collection: 'auth_tokens'
});

// Middleware to update updated_at on save
authSchema.pre('save', function(next) {
  this.updated_at = new Date();
  next();
});

// Middleware to update updated_at on findOneAndUpdate
authSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: new Date() });
  next();
});

// Instance method to check if token is expired
authSchema.methods.isTokenExpired = function(): boolean {
  if (!this.refreshed_at) {
    // If never refreshed, check from created_at
    const expiryTime = new Date(this.created_at.getTime() + (this.expires_in * 1000));
    return new Date() > expiryTime;
  }
  
  // If refreshed, check from refreshed_at
  const expiryTime = new Date(this.refreshed_at.getTime() + (this.expires_in * 1000));
  return new Date() > expiryTime;
};

// Instance method to update tokens
authSchema.methods.updateTokens = function(accessToken: string, refreshToken: string, expiresIn: number) {
  this.access_token = accessToken;
  this.refresh_token = refreshToken;
  this.expires_in = expiresIn;
  this.refreshed_at = new Date();
  this.updated_at = new Date();
  return this.save();
};

// Static method to find user by username
authSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username });
};

// Static method to create or update auth record
authSchema.statics.createOrUpdate = function(username: string, accessToken: string, refreshToken: string, expiresIn: number) {
  return this.findOneAndUpdate(
    { username: username },
    {
      username: username,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      refreshed_at: new Date(),
      updated_at: new Date()
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );
};

// Indexes for performance
authSchema.index({ username: 1 });
authSchema.index({ created_at: 1 });
authSchema.index({ updated_at: 1 });

const Auth = mongoose.model('Auth', authSchema);

export default Auth;
export { Auth };
export type { IAuth, IAuthDocument, IAuthModel };

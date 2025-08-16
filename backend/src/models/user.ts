import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, IUserDocument, IUserModel, IRefreshToken } from '../types/user.js';

const refreshTokenSchema = new Schema<IRefreshToken>({
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30 days in seconds
  }
});

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  refreshTokens: [refreshTokenSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
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
  timestamps: false,
  collection: 'users'
});

userSchema.index({ username: 1 });
userSchema.index({ 'refreshTokens.token': 1 });

// Middleware to update updated_at on save
userSchema.pre('save', async function(next) {
  this.updated_at = new Date();
  
  // Hash password if it's modified
  if (this.isModified('password')) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error as Error);
    }
  }
  
  next();
});

// Middleware to update updated_at on findOneAndUpdate
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: new Date() });
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.addRefreshToken = function(token: string) {
  // Remove old tokens (keep only last 5)
  if (this.refreshTokens.length >= 5) {
    this.refreshTokens = this.refreshTokens.slice(-4);
  }
  
  this.refreshTokens.push({ token, createdAt: new Date() });
  return this.save();
};

userSchema.methods.removeRefreshToken = function(token: string) {
  this.refreshTokens = this.refreshTokens.filter((rt: any) => rt.token !== token);
  return this.save();
};

userSchema.methods.removeAllRefreshTokens = function() {
  this.refreshTokens = [];
  return this.save();
};

userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  this.updated_at = new Date();
  return this.save();
};

userSchema.statics.findByUsername = function(username: string) {
  return this.findOne({ username: username.toLowerCase(), isActive: true });
};

userSchema.statics.findByRefreshToken = function(token: string) {
  return this.findOne({ 
    'refreshTokens.token': token,
    isActive: true 
  });
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete (user as any).password;
  delete (user as any).refreshTokens;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
export { User };
export type { IUser, IUserDocument, IUserModel };

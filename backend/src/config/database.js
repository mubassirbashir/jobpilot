import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobpilot';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('✅ MongoDB connected');
  } catch (err) {
    logger.warn('⚠️  MongoDB not available — running in demo mode (in-memory)');
    // App continues without DB in demo mode
  }
}

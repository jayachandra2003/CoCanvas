import mongoose from 'mongoose';

let isDbConnected = false;

export async function connectDatabase(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('ℹ️  No MONGODB_URI provided. Running with high-performance in-memory room store.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000,
    });
    isDbConnected = true;
    console.log('✅ Connected to MongoDB successfully.');
    return true;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed. Continuing in-memory storage fallback:', (error as Error).message);
    isDbConnected = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return isDbConnected && mongoose.connection.readyState === 1;
}

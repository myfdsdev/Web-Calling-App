import mongoose from 'mongoose';
import { env } from './env.js';

let memoryServer = null;

/**
 * Connect to MongoDB.
 * - If MONGODB_URI is set, use it.
 * - Otherwise (dev/test) spin up an in-memory MongoDB so the app runs with
 *   zero external dependencies. Never used when NODE_ENV=production.
 */
export async function connectDatabase() {
  mongoose.set('strictQuery', true);

  let uri = env.mongoUri;

  if (!uri) {
    if (env.isProd) {
      throw new Error('MONGODB_URI is required in production.');
    }
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri();
    // eslint-disable-next-line no-console
    console.log('🧪 Using in-memory MongoDB (no MONGODB_URI configured).');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}

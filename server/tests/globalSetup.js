import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Start ONE in-memory MongoDB shared by every test file. This is dramatically
 * faster and more reliable than each file booting its own mongod, and the URI is
 * passed to the tests via MONGODB_URI so db.js reuses it instead of spawning more.
 */
export default async function globalSetup() {
  const server = await MongoMemoryServer.create();
  globalThis.__MONGO_SERVER__ = server;
  process.env.MONGODB_URI = server.getUri();
}

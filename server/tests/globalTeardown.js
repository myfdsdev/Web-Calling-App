export default async function globalTeardown() {
  const server = globalThis.__MONGO_SERVER__;
  if (server) await server.stop();
}

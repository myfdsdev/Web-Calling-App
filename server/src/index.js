import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env, geminiEnabled, vapiEnabled } from './config/env.js';

async function main() {
  await connectDatabase();

  const app = createApp();
  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n🚀 API running on http://localhost:${env.port}`);
    // eslint-disable-next-line no-console
    console.log(`   Gemini: ${geminiEnabled() ? 'enabled' : 'disabled (deterministic fallback)'}`);
    // eslint-disable-next-line no-console
    console.log(`   Vapi:   ${vapiEnabled() ? 'enabled' : 'NOT configured (assistant creation will fail)'}\n`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

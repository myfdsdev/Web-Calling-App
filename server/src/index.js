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
    console.log(
      `   BYOK:   ${env.requireByok ? 'STRICT — every workspace must use its own keys (system keys ignored)' : 'off — system keys used as fallback'}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `   Gemini system key: ${geminiEnabled() ? (env.requireByok ? 'set but IGNORED (strict BYOK)' : 'enabled') : 'not set'}`
    );
    // eslint-disable-next-line no-console
    console.log(
      `   Vapi system key:   ${vapiEnabled() ? (env.requireByok ? 'set but IGNORED (strict BYOK)' : 'enabled') : 'not set'}\n`
    );
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err);
  process.exit(1);
});

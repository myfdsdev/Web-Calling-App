import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import agentBuilderRoutes from './routes/agentBuilderRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import billingRoutes from './routes/billingRoutes.js';
import vapiRoutes from './routes/vapiRoutes.js';
import publicRoutes from './routes/publicRoutes.js';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin(origin, cb) {
        // Allow same-origin / server-to-server (no origin) and whitelisted clients.
        if (!origin || env.clientUrls.includes(origin) || env.clientUrls.includes('*')) {
          return cb(null, true);
        }
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  if (!env.isTest) app.use(morgan('dev'));

  app.get('/api/health', (req, res) =>
    res.json({ success: true, message: 'ok', data: { uptime: process.uptime() } })
  );

  app.use('/api/auth', authRoutes);
  app.use('/api/agent-builder', agentBuilderRoutes);
  app.use('/api/agents', agentRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/vapi', vapiRoutes);
  app.use('/api/public', publicRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

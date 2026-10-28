import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './errors.js';
import { authRouter } from './routes/auth.js';
import { bedsRouter } from './routes/beds.js';
import { employeesRouter } from './routes/employees.js';
import { metaRouter } from './routes/meta.js';
import { rosterRouter } from './routes/roster.js';
import { tasksRouter } from './routes/tasks.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/meta', metaRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/employees', employeesRouter);
  app.use('/api/roster', rosterRouter);
  app.use('/api/beds', bedsRouter);
  app.use('/api/tasks', tasksRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}

// Vercel's Express preset serves this module's default export; locally src/index.js starts its own app.
export default createApp();

import express from 'express';
import path from 'node:path';
import dotenv from 'dotenv';
import healthHandler from './api/health.js';
import sessionHandler from './api/me/session.js';
import cloudinarySignHandler from './api/cloudinary/sign.js';
import bootstrapDisabledHandler from './api/auth/bootstrap-accounts.js';
import adminOverviewHandler from './api/admin/overview.js';
import adminActionHandler from './api/admin/action.js';
import commerceActionHandler from './api/commerce/action.js';

dotenv.config();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.all('/api/health', (req, res) => {
    void healthHandler(req, res);
  });

  app.all('/api/auth/bootstrap-accounts', (req, res) => {
    void bootstrapDisabledHandler(req, res);
  });

  app.all('/api/me/session', (req, res) => {
    void sessionHandler(req, res);
  });

  app.all('/api/cloudinary/sign', (req, res) => {
    void cloudinarySignHandler(req, res);
  });

  app.all('/api/admin/overview', (req, res) => {
    void adminOverviewHandler(req, res);
  });

  app.all('/api/admin/action', (req, res) => {
    void adminActionHandler(req, res);
  });

  app.all('/api/commerce/action', (req, res) => {
    void commerceActionHandler(req, res);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { maxAge: '7d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`DROPP local server listening on http://0.0.0.0:${port}`);
  });
}

startServer();

import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { loadConfig, getConfig } from './services/configService.js';
import { shutdownCache } from './services/cacheService.js';

const PORT = process.env.PORT || 8080;

async function bootstrap() {
  await loadConfig();
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/', (req, res) => {
    res.json({
      name: 'Cloud Video Transcoder API',
      config: {
        region: getConfig().region,
        parameterPath: getConfig().parameterPath
      }
    });
  });

  app.use('/api', routes);

  const server = app.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });

  const shutdown = () => {
    console.log('Shutting down server');
    shutdownCache();
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap API', error);
  process.exit(1);
});

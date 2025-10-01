const express = require('express');
const cors = require('cors');
const videoRoutes = require('./routes/videoRoutes');
const { loadConfig } = require('./services/config');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

async function start() {
  try {
    const config = await loadConfig();
    const bodyLimit = `${config.maxUploadSizeMb || 25}mb`;
    app.use(express.json({ limit: bodyLimit }));
    app.use('/api', videoRoutes);
    app.use((err, req, res, next) => {
      console.error('[server] Unhandled error', err);
      res.status(500).json({ message: 'Internal server error' });
    });
    app.listen(port, () => {
      console.log(`Backend API listening on port ${port}`);
    });
  } catch (error) {
    console.error('[server] Failed to start application', error);
    process.exit(1);
  }
}

start();

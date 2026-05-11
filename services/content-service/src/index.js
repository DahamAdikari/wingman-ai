require('dotenv').config();
const express = require('express');
const { initializeTables } = require('./db/init');
const { startConsumer } = require('./events/consumer');
const { regenerateContent } = require('./services/contentService');
const { cacheAsset, updatePostStatus } = require('./db/queries');
const contentRoutes = require('./routes/content');
const { registerService, deregisterService } = require('./consulClient');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'content-service' }));
app.use('/content', contentRoutes);

process.on('SIGTERM', async () => {
  await deregisterService();
  process.exit(0);
});

async function start() {
  await initializeTables();
  await startConsumer({ regenerateContent, cacheAsset, updatePostStatus });
  app.listen(5002, async () => {
    console.log('Content Service running on port 5002');
    await registerService();
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
}

module.exports = app;

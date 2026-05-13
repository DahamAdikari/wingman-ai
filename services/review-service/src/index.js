require('dotenv').config();
const express = require('express');
const { initializeTables } = require('./db/init');
const { startConsumer } = require('./events/consumer');
const { initApprovalState } = require('./services/reviewService');
const reviewRoutes = require('./routes/review');
const { registerService, deregisterService } = require('./consulClient');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'review-service' }));
app.use('/review', reviewRoutes);

process.on('SIGTERM', async () => {
  await deregisterService();
  process.exit(0);
});

async function start() {
  await initializeTables();
  await startConsumer({ onContentCreated: initApprovalState });
  app.listen(5004, async () => {
    console.log('Review Service running on port 5004');
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

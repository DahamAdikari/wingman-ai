require('dotenv').config();
const express = require('express');
const { initializeTables } = require('./db/init');
const { startConsumer } = require('./events/consumer');
const contentRoutes = require('./routes/content');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'content-service' }));
app.use('/content', contentRoutes);

async function start() {
  await initializeTables();
  await startConsumer();
  app.listen(5002, () => console.log('Content Service running on port 5002'));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
}

module.exports = app;

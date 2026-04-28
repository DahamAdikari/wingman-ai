require('dotenv').config();
const express = require('express');
const { initializeTables } = require('./db/init');
const { startConsumer } = require('./events/consumer');
const queryRoutes = require('./routes/query');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'query-service' }));
app.use('/query', queryRoutes);

async function start() {
  await initializeTables();
  await startConsumer();
  app.listen(5005, () => console.log('Query Service running on port 5005'));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
}

module.exports = app;

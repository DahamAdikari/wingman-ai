require('dotenv').config();
const express = require('express');
const initDB = require('./db/init');
const { startConsumer } = require('./events/consumer');
const { startCronJob } = require('./cron/scheduler');
const scheduleRoutes = require('./routes/schedule');
const { registerService, deregisterService } = require('./consulClient');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5008;

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/schedule', scheduleRoutes);

process.on('SIGTERM', async () => {
  await deregisterService();
  process.exit(0);
});

async function start() {
  await initDB();
  await startConsumer();
  startCronJob();
  app.listen(PORT, async () => {
    console.log(`[scheduler-service] Running on port ${PORT}`);
    await registerService();
  });
}

start().catch(err => { console.error(err); process.exit(1); });

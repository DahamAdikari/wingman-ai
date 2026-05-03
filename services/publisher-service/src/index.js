require('dotenv').config();
const express = require('express');
const { startConsumer } = require('./events/consumer');

const app = express();
const PORT = process.env.PORT || 5009;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

async function start() {
  await startConsumer();
  app.listen(PORT, () => console.log(`[publisher-service] Running on port ${PORT}`));
}

start().catch(err => { console.error(err); process.exit(1); });

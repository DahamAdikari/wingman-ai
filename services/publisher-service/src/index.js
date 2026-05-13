require('dotenv').config();

// Docker bridge networks advertise AAAA records but have no IPv6 routing.
// Patching dns.lookup to always request IPv4 before any module uses it,
// so https.request (and node-telegram-bot-api) never try the unreachable IPv6 address.
const dns = require('dns');
const _origLookup = dns.lookup.bind(dns);
dns.lookup = function forcedIPv4Lookup(hostname, optionsOrCb, maybeCb) {
  if (typeof optionsOrCb === 'function') {
    return _origLookup(hostname, { family: 4 }, optionsOrCb);
  }
  return _origLookup(hostname, { ...(optionsOrCb || {}), family: 4 }, maybeCb);
};
const express = require('express');
const { startConsumer } = require('./events/consumer');
const { registerService, deregisterService } = require('./consulClient');

const app = express();
const PORT = process.env.PORT || 5009;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

process.on('SIGTERM', async () => {
  await deregisterService();
  process.exit(0);
});

async function start() {
  await startConsumer();
  app.listen(PORT, async () => {
    console.log(`[publisher-service] Running on port ${PORT}`);
    await registerService();
  });
}

start().catch(err => { console.error(err); process.exit(1); });

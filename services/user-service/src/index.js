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
const cors = require('cors');
const morgan = require('morgan');
const initDB = require('./db/init');
const publisher = require('./events/publisher');
const { registerService, deregisterService } = require('./consulClient');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const db = require('./db/queries');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);

// Internal endpoint for publisher-service (no JWT auth — internal network only)
app.get('/internal/channels/:project_id/:platform', async (req, res) => {
  try {
    const channel = await db.getProjectChannelWithCredentials(req.params.project_id, req.params.platform);
    if (!channel) return res.status(404).json({ error: 'Channel not configured' });
    res.json(channel);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

process.on('SIGTERM', async () => {
  await deregisterService();
  process.exit(0);
});

async function start() {
  await initDB();
  await publisher.connect();
  app.listen(PORT, async () => {
    console.log(`[user-service] Running on port ${PORT}`);
    await registerService();
  });
}

start().catch((err) => {
  console.error('[user-service] Failed to start:', err);
  process.exit(1);
});

require('dotenv').config();
const http = require('http');
const crypto = require('crypto');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { addConnection, removeConnection } = require('./ws/broadcast');
const { startConsumer } = require('./events/consumer');
const { registerService, deregisterService } = require('./consulClient');

const PORT = process.env.PORT || 5006;

// --- HTTP server (health check) ---
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'realtime-service' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

// --- WebSocket server attached to the HTTP server ---
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  let url;
  try {
    url = new URL(req.url, `http://localhost`);
  } catch {
    ws.close(1008, 'Bad request');
    return;
  }

  const token = url.searchParams.get('token');
  if (!token) {
    ws.close(1008, 'Missing token');
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.warn('[WS] Invalid token:', err.message);
    ws.close(1008, 'Invalid token');
    return;
  }

  const { manager_id, user_id, role } = decoded;

  if (!manager_id) {
    ws.close(1008, 'Token missing manager_id');
    return;
  }

  const connId = crypto.randomUUID();
  addConnection(connId, ws, manager_id, user_id, role);

  ws.send(JSON.stringify({
    type: 'CONNECTED',
    payload: { message: 'Connected to realtime service' },
    timestamp: new Date().toISOString(),
  }));

  ws.on('close', () => removeConnection(connId));
  ws.on('error', (err) => {
    console.error(`[WS] Error on connection ${connId}:`, err.message);
    removeConnection(connId);
  });
});

// --- Startup ---
process.on('SIGTERM', async () => {
  await deregisterService();
  process.exit(0);
});

async function start() {
  await startConsumer();

  server.listen(PORT, async () => {
    console.log(`Realtime Service running on port ${PORT}`);
    await registerService();
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Startup failed:', err);
    process.exit(1);
  });
}

module.exports = server;

const CONSUL_URL = process.env.CONSUL_URL || 'http://consul:8500';
const SERVICE_NAME = process.env.SERVICE_NAME;
const SERVICE_PORT = parseInt(process.env.SERVICE_PORT, 10);

async function registerService() {
  if (!SERVICE_NAME || !SERVICE_PORT) {
    console.warn('[Consul] SERVICE_NAME or SERVICE_PORT not set — skipping registration');
    return;
  }

  await fetch(`${CONSUL_URL}/v1/agent/service/register`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      Name: SERVICE_NAME,
      ID: `${SERVICE_NAME}-1`,
      Address: SERVICE_NAME,   // Docker Compose hostname = service name
      Port: SERVICE_PORT,
      Check: {
        HTTP: `http://${SERVICE_NAME}:${SERVICE_PORT}/health`,
        Interval: '10s',
        DeregisterCriticalServiceAfter: '30s',
      },
    }),
  });

  console.log(`[Consul] Registered ${SERVICE_NAME} at ${SERVICE_NAME}:${SERVICE_PORT}`);
}

async function deregisterService() {
  if (!SERVICE_NAME) return;
  try {
    await fetch(`${CONSUL_URL}/v1/agent/service/deregister/${SERVICE_NAME}-1`, {
      method: 'PUT',
    });
    console.log(`[Consul] Deregistered ${SERVICE_NAME}`);
  } catch (err) {
    console.error(`[Consul] Deregister failed: ${err.message}`);
  }
}

module.exports = { registerService, deregisterService };

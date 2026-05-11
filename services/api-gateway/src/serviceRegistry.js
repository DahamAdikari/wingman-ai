const CONSUL_URL = process.env.CONSUL_URL || 'http://consul:8500';

// Cache resolved URLs for 5 seconds to avoid hitting Consul on every request
const cache = {};
const CACHE_TTL = 5000;

/**
 * Resolve a healthy instance URL for the given service name.
 * Returns a base URL like "http://user-service:5001".
 * Throws if no healthy instances are registered.
 */
async function getServiceUrl(serviceName) {
  const now = Date.now();

  if (cache[serviceName] && now - cache[serviceName].ts < CACHE_TTL) {
    return cache[serviceName].url;
  }

  const res = await fetch(`${CONSUL_URL}/v1/health/service/${serviceName}?passing=true`);
  const instances = await res.json();

  if (!instances || instances.length === 0) {
    throw new Error(`No healthy instances of "${serviceName}" registered in Consul`);
  }

  // Pick a random healthy instance (simple load balancing)
  const { Address, Port } = instances[Math.floor(Math.random() * instances.length)].Service;
  const url = `http://${Address}:${Port}`;

  cache[serviceName] = { url, ts: now };
  return url;
}

module.exports = { getServiceUrl };

const { connectWithRetry } = require('./connect');

const EXCHANGE = 'wingman.events';
let channel = null;

async function initPublisher() {
  const conn = await connectWithRetry(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  console.log('[scheduler-service] Publisher initialized');
}

async function publish(eventName, payload) {
  if (!channel) await initPublisher();
  const message = JSON.stringify({ event: eventName, ...payload, timestamp: new Date().toISOString() });
  channel.publish(EXCHANGE, eventName, Buffer.from(message), { persistent: true });
  console.log(`[scheduler-service] Published ${eventName} for post ${payload.post_id}`);
}

module.exports = { initPublisher, publish };

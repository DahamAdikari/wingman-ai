const { connectWithRetry } = require('./connect');
const { handleEvent } = require('../services/notificationService');

const EXCHANGE = 'wingman.events';
const QUEUE    = 'notification-service-queue';

// Routing keys this service cares about
const ROUTING_KEYS = [
  'CONTENT_CREATED',
  'MANAGER_APPROVED',
  'CLIENT_FEEDBACK',
  'CONTENT_APPROVED',
  'CONTENT_REJECTED',
  'POST_PUBLISHED',
];

async function startConsumer() {
  const conn    = await connectWithRetry(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();

  // Declare the topic exchange (idempotent)
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  // Declare our durable queue
  await channel.assertQueue(QUEUE, { durable: true });

  // Bind the queue to each individual routing key for clarity
  for (const key of ROUTING_KEYS) {
    await channel.bindQueue(QUEUE, EXCHANGE, key);
    console.log(`[notification-service] Bound queue to routing key: ${key}`);
  }

  // Process one message at a time so a slow Telegram call doesn't pile up
  channel.prefetch(1);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;

    let eventName;
    let payload;

    try {
      eventName = msg.fields.routingKey;
      payload   = JSON.parse(msg.content.toString());

      console.log(`[notification-service] Received event: ${eventName}`, payload);
      await handleEvent(eventName, payload);

      channel.ack(msg);
    } catch (err) {
      console.error(`[notification-service] Error processing event "${eventName}":`, err.message);
      // Nack without requeue to avoid poison-message loops
      channel.nack(msg, false, false);
    }
  });

  console.log('[notification-service] RabbitMQ consumer started');

  // Gracefully reconnect if the connection drops
  conn.on('close', () => {
    console.warn('[notification-service] RabbitMQ connection closed, reconnecting...');
    setTimeout(startConsumer, 5000);
  });

  conn.on('error', (err) => {
    console.error('[notification-service] RabbitMQ connection error:', err.message);
  });
}

module.exports = { startConsumer };

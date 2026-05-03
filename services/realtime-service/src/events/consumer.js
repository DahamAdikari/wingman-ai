const { connectWithRetry } = require('./connect');
const { broadcast } = require('../ws/broadcast');

const EXCHANGE = 'wingman.events';
const QUEUE = 'realtime-service-queue';

async function startConsumer() {
  const conn = await connectWithRetry();
  const channel = await conn.createChannel();

  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });

  // Bind to ALL events using wildcard
  await channel.bindQueue(QUEUE, EXCHANGE, '#');

  channel.consume(QUEUE, (msg) => {
    if (!msg) return;

    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch (err) {
      console.error('[Consumer] Failed to parse message:', err.message);
      channel.nack(msg, false, false);
      return;
    }

    const eventName = payload.event;
    console.log(`[Consumer] Received event: ${eventName}`);

    try {
      broadcast(eventName, payload);
      channel.ack(msg);
    } catch (err) {
      console.error(`[Consumer] Failed to broadcast event ${eventName}:`, err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`[Consumer] Realtime service listening on queue: ${QUEUE} (binding: #)`);
}

module.exports = { startConsumer };

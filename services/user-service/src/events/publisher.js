const { connectWithRetry } = require('./connect');

const EXCHANGE = 'wingman.events';
let channel;

async function connect() {
  const conn = await connectWithRetry();
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
}

async function publish(eventName, payload) {
  channel.publish(
    EXCHANGE,
    eventName,
    Buffer.from(JSON.stringify({ event: eventName, ...payload, timestamp: new Date().toISOString() })),
    { persistent: true }
  );
}

module.exports = { connect, publish };

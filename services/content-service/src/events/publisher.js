const amqp = require('amqplib');

const EXCHANGE = 'wingman.events';
let channel;

async function connect() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
}

async function publish(eventName, payload) {
  if (!channel) await connect();
  channel.publish(
    EXCHANGE,
    eventName,
    Buffer.from(JSON.stringify({ event: eventName, ...payload, timestamp: new Date().toISOString() })),
    { persistent: true }
  );
  console.log(`Event published: ${eventName}`);
}

module.exports = { publish };

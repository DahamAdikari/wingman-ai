const amqp = require('amqplib');

const EXCHANGE = 'wingman.events';
const QUEUE = 'content-service-queue';
const BINDINGS = ['CLIENT_FEEDBACK', 'CONTENT_REJECTED'];

async function startConsumer() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await conn.createChannel();
  await channel.assertExchange(EXCHANGE, 'topic', { durable: true });

  await channel.assertQueue(QUEUE, { durable: true });
  for (const event of BINDINGS) {
    await channel.bindQueue(QUEUE, EXCHANGE, event);
  }

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;
    const payload = JSON.parse(msg.content.toString());
    console.log(`Received event: ${payload.event}`);

    try {
      // Lazy require to avoid circular dependency at module load time
      const { regenerateContent } = require('../services/contentService');
      await regenerateContent({
        post_id: payload.post_id,
        manager_id: payload.manager_id,
        revision_notes: payload.feedback_text,
      });
      channel.ack(msg);
    } catch (err) {
      console.error('Failed to handle event:', payload.event, err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`Content service consumer listening on queue: ${QUEUE}`);
}

module.exports = { startConsumer };

const { connectWithRetry } = require('./connect');

const EXCHANGE = 'wingman.events';
const QUEUE = 'review-service-queue';
const BINDINGS = ['CONTENT_CREATED'];

// onContentCreated handler is injected from index.js to avoid circular imports.
async function startConsumer({ onContentCreated }) {
  const conn = await connectWithRetry();
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
      if (payload.event === 'CONTENT_CREATED') {
        await onContentCreated({
          post_id: payload.post_id,
          post_version_id: payload.post_version_id,
          project_id: payload.project_id,
          manager_id: payload.manager_id,
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error('Failed to handle event:', payload.event, err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`Review service consumer listening on queue: ${QUEUE}`);
}

module.exports = { startConsumer };

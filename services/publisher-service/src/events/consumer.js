const { connectWithRetry } = require('./connect');
const { publishPost } = require('../services/publisherService');
const { publish } = require('./publisher');

const EXCHANGE = 'wingman.events';
const QUEUE = 'publisher-service-queue';

async function startConsumer() {
  const conn = await connectWithRetry(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();

  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertQueue(QUEUE, { durable: true });
  await ch.bindQueue(QUEUE, EXCHANGE, 'READY_TO_PUBLISH');

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      console.log(`[publisher-service] Publishing post ${payload.post_id} to ${payload.platform}`);

      const result = await publishPost(payload);

      await publish('POST_PUBLISHED', {
        post_id: payload.post_id,
        post_version_id: payload.post_version_id,
        project_id: payload.project_id,
        manager_id: payload.manager_id,
        platform: payload.platform,
        external_post_id: result.external_post_id,
        published_at: new Date().toISOString(),
      });

      ch.ack(msg);
    } catch (err) {
      console.error('[publisher-service] Error publishing post:', err.message);
      ch.nack(msg, false, false); // dead-letter, don't requeue
    }
  });

  console.log('[publisher-service] Consumer started, listening for READY_TO_PUBLISH');
}

module.exports = { startConsumer };

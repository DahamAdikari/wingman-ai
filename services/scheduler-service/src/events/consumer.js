const { connectWithRetry } = require('./connect');
const db = require('../db/queries');

const EXCHANGE = 'wingman.events';
const QUEUE = 'scheduler-service-queue';

async function startConsumer() {
  const conn = await connectWithRetry(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();

  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });
  await ch.assertQueue(QUEUE, { durable: true });
  await ch.bindQueue(QUEUE, EXCHANGE, 'CONTENT_APPROVED');

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      console.log('[scheduler-service] CONTENT_APPROVED received for post:', payload.post_id);

      // Default schedule: 1 hour from now (manager can update via API)
      const scheduled_at = new Date(Date.now() + 60 * 60 * 1000);

      await db.upsertSchedule({
        post_id: payload.post_id,
        post_version_id: payload.post_version_id,
        project_id: payload.project_id,
        manager_id: payload.manager_id,
        platform: payload.platform || null,
        caption_text: payload.caption_text || null,
        image_url: payload.image_url || null,
        scheduled_at,
      });

      console.log(`[scheduler-service] Scheduled post ${payload.post_id} for ${scheduled_at.toISOString()}`);
      ch.ack(msg);
    } catch (err) {
      console.error('[scheduler-service] Error handling CONTENT_APPROVED:', err);
      ch.nack(msg, false, false);
    }
  });

  console.log('[scheduler-service] Consumer started, listening for CONTENT_APPROVED');
}

module.exports = { startConsumer };

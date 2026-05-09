const { connectWithRetry } = require('./connect');

const EXCHANGE = 'wingman.events';
const QUEUE = 'content-service-queue';
const BINDINGS = ['CLIENT_FEEDBACK', 'CONTENT_REJECTED', 'ASSET_UPLOADED', 'MANAGER_APPROVED', 'CONTENT_APPROVED', 'READY_TO_PUBLISH', 'POST_PUBLISHED'];

// Handlers are injected from index.js to avoid circular dependencies at module load time.
async function startConsumer({ regenerateContent, cacheAsset, updatePostStatus }) {
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
      if (payload.event === 'CLIENT_FEEDBACK' || payload.event === 'CONTENT_REJECTED') {
        await regenerateContent({
          post_id: payload.post_id,
          manager_id: payload.manager_id,
          revision_notes: payload.feedback_text,
        });
      } else if (payload.event === 'MANAGER_APPROVED') {
        await updatePostStatus(payload.post_id, payload.manager_id, 'client_review');
      } else if (payload.event === 'CONTENT_APPROVED') {
        await updatePostStatus(payload.post_id, payload.manager_id, 'approved');
      } else if (payload.event === 'READY_TO_PUBLISH') {
        await updatePostStatus(payload.post_id, payload.manager_id, 'scheduled');
      } else if (payload.event === 'POST_PUBLISHED') {
        await updatePostStatus(payload.post_id, payload.manager_id, 'published');
      } else if (payload.event === 'ASSET_UPLOADED') {
        await cacheAsset({
          asset_id: payload.asset_id,
          manager_id: payload.manager_id,
          project_id: payload.project_id,
          type: payload.type,
          file_url: payload.file_url,
        });
      }
      channel.ack(msg);
    } catch (err) {
      console.error('Failed to handle event:', payload.event, err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`Content service consumer listening on queue: ${QUEUE}`);
}

module.exports = { startConsumer };

const { connectWithRetry } = require('./connect');
const {
  onProjectCreated,
  onContentCreated,
  onManagerApproved,
  onClientFeedback,
  onContentApproved,
  onContentRejected,
  onPostPublished,
} = require('../db/queries');

const EXCHANGE = 'wingman.events';
const QUEUE = 'query-service-queue';
const BINDINGS = [
  'PROJECT_CREATED',
  'CONTENT_CREATED',
  'MANAGER_APPROVED',
  'CLIENT_FEEDBACK',
  'CONTENT_APPROVED',
  'CONTENT_REJECTED',
  'POST_PUBLISHED',
];

async function startConsumer() {
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
      switch (payload.event) {
        case 'PROJECT_CREATED':
          await onProjectCreated(payload);
          break;
        case 'CONTENT_CREATED':
          await onContentCreated(payload);
          break;
        case 'MANAGER_APPROVED':
          await onManagerApproved(payload);
          break;
        case 'CLIENT_FEEDBACK':
          await onClientFeedback(payload);
          break;
        case 'CONTENT_APPROVED':
          await onContentApproved(payload);
          break;
        case 'CONTENT_REJECTED':
          await onContentRejected(payload);
          break;
        case 'POST_PUBLISHED':
          await onPostPublished(payload);
          break;
        default:
          console.warn(`Unhandled event: ${payload.event}`);
      }
      channel.ack(msg);
    } catch (err) {
      console.error('Failed to handle event:', payload.event, err.message);
      channel.nack(msg, false, false);
    }
  });

  console.log(`Query service consumer listening on queue: ${QUEUE}`);
}

module.exports = { startConsumer };

const db       = require('../db/queries');
const telegram = require('./telegramService');

const EVENT_TEMPLATES = {
  CONTENT_CREATED: (payload) => ({
    type:    'CONTENT_CREATED',
    title:   'New content ready for review',
    message: 'A new post has been generated and is ready for your review.',
    tg:      `📝 <b>New Content Ready</b>\nPost ID: ${payload.post_id}\nPlatform: ${payload.platform || 'N/A'}\nStatus: Awaiting manager review`,
  }),

  MANAGER_APPROVED: (payload) => ({
    type:    'MANAGER_APPROVED',
    title:   'Manager approved — awaiting client review',
    message: 'The manager has approved the content. It is now waiting for client review.',
    tg:      `✅ <b>Manager Approved</b>\nPost ID: ${payload.post_id}\nNow in: Client Review`,
  }),

  CLIENT_FEEDBACK: (payload) => ({
    type:    'CLIENT_FEEDBACK',
    title:   'Client requested changes',
    message: `Client feedback: "${payload.feedback_text || 'Changes requested'}"`,
    tg:      `💬 <b>Client Feedback</b>\nPost ID: ${payload.post_id}\nFeedback: ${payload.feedback_text || 'Changes requested'}`,
  }),

  CONTENT_APPROVED: (payload) => ({
    type:    'CONTENT_APPROVED',
    title:   'Content fully approved',
    message: 'The post has been approved by both manager and client. Ready to schedule.',
    tg:      `🎉 <b>Content Approved!</b>\nPost ID: ${payload.post_id}\nReady to schedule`,
  }),

  CONTENT_REJECTED: (payload) => ({
    type:    'CONTENT_REJECTED',
    title:   'Content rejected — revision needed',
    message: `Content was rejected: "${payload.feedback_text || 'No reason given'}". Regenerating...`,
    tg:      `❌ <b>Content Rejected</b>\nPost ID: ${payload.post_id}\nReason: ${payload.feedback_text || 'N/A'}`,
  }),

  POST_PUBLISHED: (payload) => ({
    type:    'POST_PUBLISHED',
    title:   'Post published successfully',
    message: `Your post has been published on ${payload.platform || 'the platform'}.`,
    tg:      `🚀 <b>Post Published!</b>\nPost ID: ${payload.post_id}\nPlatform: ${payload.platform || 'N/A'}`,
  }),
};

async function handleEvent(eventName, payload) {
  const template = EVENT_TEMPLATES[eventName];
  if (!template) {
    console.warn(`[notification-service] No template for event: ${eventName}`);
    return;
  }

  const tmpl = template(payload);

  // Persist to DB
  await db.insertNotification({
    manager_id: payload.manager_id,
    user_id:    payload.client_id  || null,
    post_id:    payload.post_id    || null,
    project_id: payload.project_id || null,
    type:       tmpl.type,
    title:      tmpl.title,
    message:    tmpl.message,
  });

  // Send Telegram (non-blocking — failure is logged but won't break the flow)
  if (tmpl.tg) {
    await telegram.sendMessage(tmpl.tg);
  }
}

module.exports = { handleEvent };

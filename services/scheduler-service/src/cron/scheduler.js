const cron = require('node-cron');
const db = require('../db/queries');
const { publish } = require('../events/publisher');

function startCronJob() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const dueSchedules = await db.getDueSchedules();

      for (const schedule of dueSchedules) {
        console.log(`[scheduler-service] Firing READY_TO_PUBLISH for post ${schedule.post_id}`);

        await publish('READY_TO_PUBLISH', {
          post_id: schedule.post_id,
          post_version_id: schedule.post_version_id,
          project_id: schedule.project_id,
          manager_id: schedule.manager_id,
          platform: schedule.platform,
          caption_text: schedule.caption_text,
          image_url: schedule.image_url,
          scheduled_at: schedule.scheduled_at,
        });

        await db.markAsFired(schedule.id);
      }

      if (dueSchedules.length > 0) {
        console.log(`[scheduler-service] Fired ${dueSchedules.length} scheduled post(s)`);
      }
    } catch (err) {
      console.error('[scheduler-service] Cron job error:', err);
    }
  });

  console.log('[scheduler-service] Cron job started (checking every minute)');
}

module.exports = { startCronJob };

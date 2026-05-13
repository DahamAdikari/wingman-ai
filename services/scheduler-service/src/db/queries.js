const pool = require('./pool');

async function upsertSchedule({ post_id, post_version_id, project_id, manager_id, platform, caption_text, image_url, scheduled_at }) {
  const { rows } = await pool.query(`
    INSERT INTO scheduled_posts (post_id, post_version_id, project_id, manager_id, platform, caption_text, image_url, scheduled_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (post_id) DO UPDATE SET
      post_version_id = EXCLUDED.post_version_id,
      platform        = EXCLUDED.platform,
      caption_text    = EXCLUDED.caption_text,
      image_url       = EXCLUDED.image_url,
      scheduled_at    = EXCLUDED.scheduled_at,
      status          = 'pending',
      updated_at      = NOW()
    RETURNING *`,
    [post_id, post_version_id, project_id, manager_id, platform, caption_text, image_url, scheduled_at]
  );
  return rows[0];
}

async function getSchedule(post_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT * FROM scheduled_posts WHERE post_id = $1 AND manager_id = $2`,
    [post_id, manager_id]
  );
  return rows[0];
}

async function updateScheduledAt(post_id, manager_id, scheduled_at) {
  const { rows } = await pool.query(`
    UPDATE scheduled_posts SET scheduled_at = $3, status = 'pending', updated_at = NOW()
    WHERE post_id = $1 AND manager_id = $2 AND status = 'pending'
    RETURNING *`,
    [post_id, manager_id, scheduled_at]
  );
  return rows[0];
}

async function cancelSchedule(post_id, manager_id) {
  const { rows } = await pool.query(`
    UPDATE scheduled_posts SET status = 'cancelled', updated_at = NOW()
    WHERE post_id = $1 AND manager_id = $2
    RETURNING *`,
    [post_id, manager_id]
  );
  return rows[0];
}

async function getDueSchedules() {
  const { rows } = await pool.query(`
    SELECT * FROM scheduled_posts
    WHERE status = 'pending' AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT 50`
  );
  return rows;
}

async function markAsFired(id) {
  await pool.query(`
    UPDATE scheduled_posts SET status = 'fired', fired_at = NOW(), updated_at = NOW()
    WHERE id = $1`,
    [id]
  );
}

// Returns all pending schedules for a project — used by the frontend to show
// 'scheduled' status on posts that are approved but not yet fired.
async function getPendingSchedulesByProject(project_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT post_id, scheduled_at FROM scheduled_posts
     WHERE project_id = $1 AND manager_id = $2 AND status = 'pending'`,
    [project_id, manager_id]
  );
  return rows;
}

module.exports = { upsertSchedule, getSchedule, updateScheduledAt, cancelSchedule, getDueSchedules, markAsFired, getPendingSchedulesByProject };

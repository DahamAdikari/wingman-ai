const pool = require('./pool');

/**
 * Insert a new notification record.
 */
async function insertNotification({ manager_id, user_id, post_id, project_id, type, title, message }) {
  const result = await pool.query(
    `INSERT INTO notifications (manager_id, user_id, post_id, project_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [manager_id, user_id || null, post_id || null, project_id || null, type, title, message]
  );
  return result.rows[0];
}

/**
 * List notifications for a manager, newest first.
 */
async function listNotifications(manager_id, limit = 50) {
  const result = await pool.query(
    `SELECT * FROM notifications
     WHERE manager_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [manager_id, limit]
  );
  return result.rows;
}

/**
 * Mark a single notification as read (scoped to manager for safety).
 */
async function markAsRead(id, manager_id) {
  const result = await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE id = $1 AND manager_id = $2
     RETURNING *`,
    [id, manager_id]
  );
  return result.rows[0];
}

/**
 * Mark all unread notifications for a manager as read.
 */
async function markAllAsRead(manager_id) {
  await pool.query(
    `UPDATE notifications
     SET is_read = true
     WHERE manager_id = $1 AND is_read = false`,
    [manager_id]
  );
}

module.exports = { insertNotification, listNotifications, markAsRead, markAllAsRead };

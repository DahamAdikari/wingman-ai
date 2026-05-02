const pool = require('./pool');

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      manager_id   UUID        NOT NULL,
      user_id      UUID,
      post_id      UUID,
      project_id   UUID,
      type         VARCHAR(50) NOT NULL,
      title        VARCHAR(255) NOT NULL,
      message      TEXT        NOT NULL,
      is_read      BOOLEAN     DEFAULT false,
      created_at   TIMESTAMP   DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_manager
      ON notifications(manager_id, created_at DESC);
  `);
  console.log('[notification-service] Database initialised');
}

module.exports = { initDB };

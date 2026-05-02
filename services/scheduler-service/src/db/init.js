const pool = require('./pool');
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id        UUID        UNIQUE NOT NULL,
      post_version_id UUID       NOT NULL,
      project_id     UUID        NOT NULL,
      manager_id     UUID        NOT NULL,
      platform       VARCHAR(50),
      caption_text   TEXT,
      image_url      TEXT,
      scheduled_at   TIMESTAMP   NOT NULL,
      status         VARCHAR(20) DEFAULT 'pending',
      fired_at       TIMESTAMP,
      created_at     TIMESTAMP   DEFAULT NOW(),
      updated_at     TIMESTAMP   DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_schedule_status ON scheduled_posts(status, scheduled_at);
  `);
  console.log('[scheduler-service] DB initialized');
}
module.exports = initDB;

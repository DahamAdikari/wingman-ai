const pool = require('./pool');

async function initializeTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects_view (
      id                    UUID          PRIMARY KEY,
      manager_id            UUID          NOT NULL,
      project_name          VARCHAR(255),
      total_posts           INTEGER       DEFAULT 0,
      posts_in_review       INTEGER       DEFAULT 0,
      posts_approved        INTEGER       DEFAULT 0,
      posts_published       INTEGER       DEFAULT 0,
      last_post_status      VARCHAR(50),
      last_feedback_snippet TEXT,
      last_updated          TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_projects_view_manager_id ON projects_view(manager_id);
  `);
  console.log('Query DB tables ready');
}

module.exports = { initializeTables };

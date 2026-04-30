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

    -- Lookup table: lets us resolve project_id from post_id for events
    -- that only carry post_id (e.g. POST_PUBLISHED).
    CREATE TABLE IF NOT EXISTS posts_map (
      post_id    UUID  PRIMARY KEY,
      project_id UUID  NOT NULL,
      manager_id UUID  NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_map_manager ON posts_map(manager_id);
  `);
  console.log('Query DB tables ready');
}

module.exports = { initializeTables };

const pool = require('./pool');

async function initializeTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id         UUID        NOT NULL,
      post_version_id UUID        NOT NULL,
      manager_id      UUID        NOT NULL,
      reviewer_id     UUID        NOT NULL,
      reviewer_role   VARCHAR(50) NOT NULL,
      decision        VARCHAR(50) NOT NULL,
      feedback_text   TEXT,
      created_at      TIMESTAMP   DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS approval_state (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id          UUID        UNIQUE NOT NULL,
      project_id       UUID        NOT NULL,
      manager_id       UUID        NOT NULL,
      post_version_id  UUID        NOT NULL,
      current_stage    VARCHAR(50) NOT NULL,
      manager_approved BOOLEAN     DEFAULT FALSE,
      client_approved  BOOLEAN     DEFAULT FALSE,
      updated_at       TIMESTAMP   DEFAULT NOW()
    );
  `);
  console.log('Review DB tables ready');
}

module.exports = { initializeTables };

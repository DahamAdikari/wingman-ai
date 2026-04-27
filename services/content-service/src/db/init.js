const pool = require('./pool');

async function initializeTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id  UUID        NOT NULL,
      manager_id  UUID        NOT NULL,
      platform    VARCHAR(100) NOT NULL,
      status      VARCHAR(50) DEFAULT 'draft',
      created_at  TIMESTAMP   DEFAULT NOW(),
      updated_at  TIMESTAMP   DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS post_versions (
      id             UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id        UUID     REFERENCES posts(id) NOT NULL,
      manager_id     UUID     NOT NULL,
      version_number INTEGER  NOT NULL,
      caption_text   TEXT,
      image_url      TEXT,
      image_prompt   TEXT,
      revision_notes TEXT,
      created_at     TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS templates (
      id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      manager_id UUID         NOT NULL,
      name       VARCHAR(255) NOT NULL,
      structure  TEXT         NOT NULL,
      created_at TIMESTAMP    DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      manager_id  UUID         NOT NULL,
      name        VARCHAR(255) NOT NULL,
      prompt_text TEXT         NOT NULL,
      created_at  TIMESTAMP    DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS asset_cache (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_id    UUID         NOT NULL UNIQUE,
      manager_id  UUID         NOT NULL,
      project_id  UUID,
      type        VARCHAR(100) NOT NULL,
      file_url    TEXT,
      cached_at   TIMESTAMP    DEFAULT NOW()
    );
  `);
  console.log('Content DB tables ready');
}

module.exports = { initializeTables };

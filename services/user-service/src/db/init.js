const pool = require('./pool');

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS managers (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      name          VARCHAR(255)  NOT NULL,
      email         VARCHAR(255)  UNIQUE NOT NULL,
      password_hash VARCHAR(255)  NOT NULL,
      created_at    TIMESTAMP     DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      manager_id    UUID          REFERENCES managers(id) NOT NULL,
      name          VARCHAR(255)  NOT NULL,
      email         VARCHAR(255)  NOT NULL,
      password_hash VARCHAR(255),
      role          VARCHAR(50)   NOT NULL,
      created_at    TIMESTAMP     DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      manager_id    UUID          REFERENCES managers(id) NOT NULL,
      name          VARCHAR(255)  NOT NULL,
      description   TEXT,
      status        VARCHAR(50)   DEFAULT 'active',
      created_at    TIMESTAMP     DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id    UUID          REFERENCES projects(id) NOT NULL,
      user_id       UUID          REFERENCES users(id) NOT NULL,
      manager_id    UUID          REFERENCES managers(id) NOT NULL,
      role          VARCHAR(50)   NOT NULL,
      enrolled_at   TIMESTAMP     DEFAULT NOW()
    );
  `);

  // Handle existing tables that may be missing columns
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_token_expires_at TIMESTAMP;
  `);

  console.log('[user-service] Database tables initialized');
}

module.exports = initDB;

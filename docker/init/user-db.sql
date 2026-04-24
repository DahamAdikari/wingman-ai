-- user_db schema — auto-run by postgres container on first start

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
  role          VARCHAR(50)   NOT NULL,   -- 'client' | 'team_member' | 'viewer'
  created_at    TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id    UUID          REFERENCES managers(id) NOT NULL,
  name          VARCHAR(255)  NOT NULL,
  description   TEXT,
  status        VARCHAR(50)   DEFAULT 'active',   -- 'active' | 'archived'
  created_at    TIMESTAMP     DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID          REFERENCES projects(id) NOT NULL,
  user_id       UUID          REFERENCES users(id) NOT NULL,
  manager_id    UUID          REFERENCES managers(id) NOT NULL,
  role          VARCHAR(50)   NOT NULL,   -- 'client' | 'reviewer' | 'viewer'
  enrolled_at   TIMESTAMP     DEFAULT NOW()
);

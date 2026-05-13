const pool = require('./pool');

// ─── Managers ─────────────────────────────────────────────────────────────────

async function findManagerByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM managers WHERE email = $1',
    [email]
  );
  return rows[0];
}

async function createManager({ name, email, password_hash }) {
  const { rows } = await pool.query(
    `INSERT INTO managers (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, password_hash]
  );
  return rows[0];
}

// ─── Users ────────────────────────────────────────────────────────────────────

async function listUsers(manager_id) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at,
            (password_hash IS NOT NULL) AS has_password
     FROM users
     WHERE manager_id = $1
     ORDER BY created_at DESC`,
    [manager_id]
  );
  return rows;
}

async function createUser({ manager_id, name, email, role, password_hash = null }) {
  const { rows } = await pool.query(
    `INSERT INTO users (manager_id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, manager_id, name, email, role, created_at`,
    [manager_id, name, email, password_hash, role]
  );
  return rows[0];
}

async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0];
}

async function updateUserPassword(id, password_hash) {
  const { rows } = await pool.query(
    `UPDATE users SET password_hash = $2 WHERE id = $1
     RETURNING id, manager_id, name, email, role, created_at`,
    [id, password_hash]
  );
  return rows[0];
}

async function saveInviteToken(user_id, token, expires_at) {
  await pool.query(
    `UPDATE users SET invite_token = $2, invite_token_expires_at = $3 WHERE id = $1`,
    [user_id, token, expires_at]
  );
}

async function findUserByInviteToken(token) {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE invite_token = $1`,
    [token]
  );
  return rows[0];
}

async function clearInviteToken(user_id) {
  await pool.query(
    `UPDATE users SET invite_token = NULL, invite_token_expires_at = NULL WHERE id = $1`,
    [user_id]
  );
}

async function findUserById(id, manager_id) {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE id = $1 AND manager_id = $2`,
    [id, manager_id]
  );
  return rows[0];
}

async function listUsersForProject(project_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, pm.role AS project_role, pm.enrolled_at
     FROM users u
     JOIN project_members pm ON pm.user_id = u.id
     WHERE pm.project_id = $1 AND pm.manager_id = $2
     ORDER BY pm.enrolled_at DESC`,
    [project_id, manager_id]
  );
  return rows;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

async function listProjects(manager_id) {
  const { rows } = await pool.query(
    `SELECT id, name, description, status, created_at
     FROM projects
     WHERE manager_id = $1
     ORDER BY created_at DESC`,
    [manager_id]
  );
  return rows;
}

async function createProject({ manager_id, name, description }) {
  const { rows } = await pool.query(
    `INSERT INTO projects (manager_id, name, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [manager_id, name, description || null]
  );
  return rows[0];
}

async function updateProject({ id, manager_id, name, description, status }) {
  const { rows } = await pool.query(
    `UPDATE projects
     SET name        = COALESCE($3, name),
         description = COALESCE($4, description),
         status      = COALESCE($5, status)
     WHERE id = $1 AND manager_id = $2
     RETURNING *`,
    [id, manager_id, name, description, status]
  );
  return rows[0];
}

// ─── Project Members ──────────────────────────────────────────────────────────

async function getProjectsForUser(user_id) {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.description, p.status, p.created_at,
            pm.role AS member_role, pm.enrolled_at
     FROM project_members pm
     JOIN projects p ON p.id = pm.project_id
     WHERE pm.user_id = $1
     ORDER BY pm.enrolled_at DESC`,
    [user_id]
  );
  return rows;
}

async function addProjectMember({ project_id, user_id, manager_id, role }) {
  const { rows } = await pool.query(
    `INSERT INTO project_members (project_id, user_id, manager_id, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [project_id, user_id, manager_id, role]
  );
  return rows[0];
}

// ─── Project Channels ─────────────────────────────────────────────────────────

async function listProjectChannels(project_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT id, platform, is_enabled, channel_name, account_name, connected_at, updated_at
     FROM project_channels
     WHERE project_id = $1 AND manager_id = $2
     ORDER BY connected_at DESC`,
    [project_id, manager_id]
  );
  return rows;
}

async function upsertProjectChannel({ project_id, manager_id, platform, bot_token, channel_id, channel_name, access_token, account_id, account_name }) {
  const { rows } = await pool.query(
    `INSERT INTO project_channels
       (project_id, manager_id, platform, bot_token, channel_id, channel_name, access_token, account_id, account_name, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (project_id, platform) DO UPDATE SET
       bot_token    = EXCLUDED.bot_token,
       channel_id   = EXCLUDED.channel_id,
       channel_name = EXCLUDED.channel_name,
       access_token = EXCLUDED.access_token,
       account_id   = EXCLUDED.account_id,
       account_name = EXCLUDED.account_name,
       is_enabled   = true,
       updated_at   = NOW()
     RETURNING id, platform, is_enabled, channel_name, account_name, connected_at, updated_at`,
    [project_id, manager_id, platform, bot_token || null, channel_id || null, channel_name || null, access_token || null, account_id || null, account_name || null]
  );
  return rows[0];
}

async function getProjectChannelWithCredentials(project_id, platform) {
  const { rows } = await pool.query(
    `SELECT * FROM project_channels
     WHERE project_id = $1 AND platform = $2 AND is_enabled = true`,
    [project_id, platform]
  );
  return rows[0];
}

async function deleteProjectChannel(project_id, manager_id, platform) {
  const { rows } = await pool.query(
    `DELETE FROM project_channels
     WHERE project_id = $1 AND manager_id = $2 AND platform = $3
     RETURNING id`,
    [project_id, manager_id, platform]
  );
  return rows[0];
}

module.exports = {
  findManagerByEmail,
  createManager,
  listUsers,
  createUser,
  findUserByEmail,
  updateUserPassword,
  findUserById,
  listUsersForProject,
  getProjectsForUser,
  listProjects,
  createProject,
  updateProject,
  addProjectMember,
  saveInviteToken,
  findUserByInviteToken,
  clearInviteToken,
  listProjectChannels,
  upsertProjectChannel,
  getProjectChannelWithCredentials,
  deleteProjectChannel,
};

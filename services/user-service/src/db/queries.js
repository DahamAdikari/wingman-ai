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
    `SELECT id, name, email, role, created_at
     FROM users
     WHERE manager_id = $1
     ORDER BY created_at DESC`,
    [manager_id]
  );
  return rows;
}

async function createUser({ manager_id, name, email, role }) {
  const { rows } = await pool.query(
    `INSERT INTO users (manager_id, name, email, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, manager_id, name, email, role, created_at`,
    [manager_id, name, email, role]
  );
  return rows[0];
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

async function addProjectMember({ project_id, user_id, manager_id, role }) {
  const { rows } = await pool.query(
    `INSERT INTO project_members (project_id, user_id, manager_id, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [project_id, user_id, manager_id, role]
  );
  return rows[0];
}

module.exports = {
  findManagerByEmail,
  createManager,
  listUsers,
  createUser,
  findUserById,
  listUsersForProject,
  listProjects,
  createProject,
  updateProject,
  addProjectMember,
};

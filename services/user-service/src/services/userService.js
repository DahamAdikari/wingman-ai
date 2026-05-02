const bcrypt = require('bcryptjs');
const db = require('../db/queries');

const VALID_USER_ROLES = ['client', 'team_member', 'viewer'];

async function listUsers(manager_id) {
  return db.listUsers(manager_id);
}

async function createUser({ manager_id, name, email, role, password }) {
  if (!name || !email || !role) throw new Error('Name, email, and role are required');
  if (!VALID_USER_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_USER_ROLES.join(', ')}`);
  }

  let password_hash = null;
  if (password) {
    password_hash = await bcrypt.hash(password, 10);
  }

  return db.createUser({ manager_id, name, email, role, password_hash });
}

async function getUserById(id, manager_id) {
  const user = await db.findUserById(id, manager_id);
  if (!user) throw new Error('User not found');
  return user;
}

async function listUsersForProject(project_id, manager_id) {
  return db.listUsersForProject(project_id, manager_id);
}

async function getProjectsForUser(user_id) {
  return db.getProjectsForUser(user_id);
}

module.exports = { listUsers, createUser, getUserById, listUsersForProject, getProjectsForUser };

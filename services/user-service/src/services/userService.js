const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../db/queries');

const VALID_USER_ROLES = ['client', 'team_member', 'viewer'];
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

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

  const user = await db.createUser({ manager_id, name, email, role, password_hash });

  // Generate invite token so the client can set their own password
  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
  await db.saveInviteToken(user.id, token, expires_at);

  return {
    ...user,
    invite_link: `${FRONTEND_URL}/set-password?token=${token}`,
  };
}

async function generateInviteLink(user_id, manager_id) {
  const user = await db.findUserById(user_id, manager_id);
  if (!user) throw new Error('User not found');

  const token = crypto.randomBytes(32).toString('hex');
  const expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours
  await db.saveInviteToken(user_id, token, expires_at);

  return { invite_link: `${FRONTEND_URL}/set-password?token=${token}` };
}

async function setPasswordWithToken(token, password) {
  if (!token || !password) throw new Error('Token and password are required');
  if (password.length < 8) throw new Error('Password must be at least 8 characters');

  const user = await db.findUserByInviteToken(token);
  if (!user) throw new Error('Invalid or expired invite link');
  if (new Date() > new Date(user.invite_token_expires_at)) {
    throw new Error('Invite link has expired');
  }

  const password_hash = await bcrypt.hash(password, 10);
  await db.updateUserPassword(user.id, password_hash);
  await db.clearInviteToken(user.id);

  return { message: 'Password set successfully. You can now log in.' };
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

module.exports = { listUsers, createUser, generateInviteLink, setPasswordWithToken, getUserById, listUsersForProject, getProjectsForUser };

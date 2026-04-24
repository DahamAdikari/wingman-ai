const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/queries');

async function login({ email, password }) {
  if (!email || !password) throw new Error('Email and password are required');

  const manager = await db.findManagerByEmail(email);
  if (!manager) throw new Error('Invalid credentials');

  const valid = await bcrypt.compare(password, manager.password_hash);
  if (!valid) throw new Error('Invalid credentials');

  const token = jwt.sign(
    { manager_id: manager.id, role: 'manager' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return {
    token,
    manager: { id: manager.id, name: manager.name, email: manager.email },
  };
}

async function register({ name, email, password }) {
  if (!name || !email || !password) throw new Error('Name, email, and password are required');

  const existing = await db.findManagerByEmail(email);
  if (existing) throw new Error('Email already in use');

  const password_hash = await bcrypt.hash(password, 10);
  const manager = await db.createManager({ name, email, password_hash });

  const token = jwt.sign(
    { manager_id: manager.id, role: 'manager' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, manager };
}

module.exports = { login, register };

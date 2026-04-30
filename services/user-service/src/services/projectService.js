const db = require('../db/queries');
const publisher = require('../events/publisher');

const VALID_MEMBER_ROLES = ['client', 'reviewer', 'viewer'];

async function listProjects(manager_id) {
  return db.listProjects(manager_id);
}

async function createProject({ manager_id, name, description }) {
  if (!name) throw new Error('Project name is required');
  const project = await db.createProject({ manager_id, name, description });
  await publisher.publish('PROJECT_CREATED', {
    project_id: project.id,
    manager_id: project.manager_id,
    project_name: project.name,
  });
  return project;
}

async function updateProject({ id, manager_id, name, description, status }) {
  const project = await db.updateProject({ id, manager_id, name, description, status });
  if (!project) throw new Error('Project not found');
  return project;
}

async function addProjectMember({ project_id, user_id, manager_id, role }) {
  if (!user_id || !role) throw new Error('user_id and role are required');
  if (!VALID_MEMBER_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_MEMBER_ROLES.join(', ')}`);
  }
  return db.addProjectMember({ project_id, user_id, manager_id, role });
}

module.exports = { listProjects, createProject, updateProject, addProjectMember };

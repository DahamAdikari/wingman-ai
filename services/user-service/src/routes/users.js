const express = require('express');
const userService = require('../services/userService');

const router = express.Router();

// manager_id is injected by the API Gateway as x-manager-id header
const getManagerId = (req) => req.headers['x-manager-id'];

// GET /users/my-projects — projects the currently logged-in user is enrolled in
// Uses x-user-id (set by API Gateway from JWT). Works for clients/team members/viewers.
router.get('/my-projects', async (req, res) => {
  const user_id = req.headers['x-user-id'];
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
  try {
    const projects = await userService.getProjectsForUser(user_id);
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Must be registered before /:id to prevent Express matching "project" as an id
router.get('/project/:projectId', async (req, res) => {
  try {
    const users = await userService.listUsersForProject(req.params.projectId, getManagerId(req));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await userService.listUsers(getManagerId(req));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = await userService.createUser({ ...req.body, manager_id: getManagerId(req) });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/invite', async (req, res) => {
  try {
    const result = await userService.generateInviteLink(req.params.id, getManagerId(req));
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id, getManagerId(req));
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;

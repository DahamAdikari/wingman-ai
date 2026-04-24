const express = require('express');
const userService = require('../services/userService');

const router = express.Router();

// manager_id is injected by the API Gateway as x-manager-id header
const getManagerId = (req) => req.headers['x-manager-id'];

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

router.get('/:id', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id, getManagerId(req));
    res.json(user);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = router;

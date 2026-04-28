const express = require('express');
const router = express.Router();
const { getProjectsForManager } = require('../db/queries');

function getManagerId(req) {
  return req.headers['x-manager-id'];
}

// GET /query/projects — dashboard read: all projects with denormalised stats
router.get('/projects', async (req, res) => {
  const manager_id = getManagerId(req);
  if (!manager_id) return res.status(401).json({ error: 'manager_id required' });

  try {
    const projects = await getProjectsForManager(manager_id);
    res.json(projects);
  } catch (err) {
    console.error('getProjectsForManager error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve projects' });
  }
});

module.exports = router;

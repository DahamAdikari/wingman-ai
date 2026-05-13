const express = require('express');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// GET /api/users/my-projects → projects the current user (client/member) is enrolled in
router.get('/my-projects', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/users/my-projects`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/users → list users under the authenticated manager
router.get('/', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/users`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/users → create a new user (client, team member, viewer)
router.post('/', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/users`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/users/:id/invite → generate (or regenerate) invite link for a user
router.post('/:id/invite', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/users/${req.params.id}/invite`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/users/:id → get a single user
router.get('/:id', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/users/${req.params.id}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

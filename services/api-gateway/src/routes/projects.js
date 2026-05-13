const express = require('express');
const axios = require('axios');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// POST /api/projects → create a new project
router.post('/', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/projects`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// PATCH /api/projects/:id → update project name / description / status
router.patch('/:id', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/projects/${req.params.id}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/projects/:id/members → enrol a user into a project
router.post('/:id/members', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/projects/${req.params.id}/members`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/projects/:id/channels → list connected channels for a project
router.get('/:id/channels', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/projects/${req.params.id}/channels`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/projects/:id/channels → connect / update a channel
router.post('/:id/channels', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/projects/${req.params.id}/channels`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// DELETE /api/projects/:id/channels/:platform → disconnect a channel
router.delete('/:id/channels/:platform', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/projects/${req.params.id}/channels/${req.params.platform}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/projects/:id/channels/telegram/test → send a test message to verify connection
router.post('/:id/channels/telegram/test', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/projects/${req.params.id}/channels/telegram/test`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/projects → dashboard list (fast read from query_db)
router.get('/', async (req, res) => {
  try {
    const base = await getServiceUrl('query-service');
    forward(req, res, `${base}/query/projects`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/projects/:id/posts → all posts for a project
router.get('/:id/posts', async (req, res) => {
  try {
    const base = await getServiceUrl('content-service');
    forward(req, res, `${base}/content/project/${req.params.id}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/projects/:id/detail → API Composition (parallel fan-out, partial-failure tolerant)
// Each section carries { available, data } so the frontend can render what it has.
router.get('/:id/detail', async (req, res) => {
  const { id } = req.params;
  const headers = {
    'x-manager-id': req.manager_id,
    'x-user-id': req.user_id || '',
    'x-user-role': req.role || '',
  };

  try {
    // Resolve all three service URLs from Consul in parallel (cached after first call)
    const [contentBase, reviewBase, userBase] = await Promise.all([
      getServiceUrl('content-service'),
      getServiceUrl('review-service'),
      getServiceUrl('user-service'),
    ]);

    const [contentResult, reviewResult, membersResult] = await Promise.allSettled([
      axios.get(`${contentBase}/content/project/${id}`, { headers, validateStatus: () => true }),
      axios.get(`${reviewBase}/review/project/${id}`, { headers, validateStatus: () => true }),
      axios.get(`${userBase}/users/project/${id}`, { headers, validateStatus: () => true }),
    ]);

    function toSection(result, label) {
      if (result.status === 'fulfilled' && result.value.status < 500) {
        return { available: true, data: result.value.data };
      }
      const reason = result.reason?.message || `HTTP ${result.value?.status}`;
      console.warn(`[detail composition] project ${id} — ${label} unavailable: ${reason}`);
      return { available: false, data: null };
    }

    res.json({
      content: toSection(contentResult, 'content-service'),
      reviews: toSection(reviewResult, 'review-service'),
      members: toSection(membersResult, 'user-service'),
    });
  } catch (err) {
    console.error('[detail composition] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

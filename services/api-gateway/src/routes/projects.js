const express = require('express');
const axios = require('axios');
const { forward } = require('../proxy/forward');

const router = express.Router();
const QUERY_SERVICE = process.env.QUERY_SERVICE_URL;
const CONTENT_SERVICE = process.env.CONTENT_SERVICE_URL;
const REVIEW_SERVICE = process.env.REVIEW_SERVICE_URL;
const USER_SERVICE = process.env.USER_SERVICE_URL;

// POST /api/projects → create a new project
router.post('/', (req, res) => {
  forward(req, res, `${USER_SERVICE}/projects`);
});

// PATCH /api/projects/:id → update project name / description / status
router.patch('/:id', (req, res) => {
  forward(req, res, `${USER_SERVICE}/projects/${req.params.id}`);
});

// POST /api/projects/:id/members → enrol a user into a project
router.post('/:id/members', (req, res) => {
  forward(req, res, `${USER_SERVICE}/projects/${req.params.id}/members`);
});

// GET /api/projects/:id/channels → list connected channels for a project
router.get('/:id/channels', (req, res) => {
  forward(req, res, `${USER_SERVICE}/projects/${req.params.id}/channels`);
});

// POST /api/projects/:id/channels → connect / update a channel
router.post('/:id/channels', (req, res) => {
  forward(req, res, `${USER_SERVICE}/projects/${req.params.id}/channels`);
});

// DELETE /api/projects/:id/channels/:platform → disconnect a channel
router.delete('/:id/channels/:platform', (req, res) => {
  forward(req, res, `${USER_SERVICE}/projects/${req.params.id}/channels/${req.params.platform}`);
});

// POST /api/projects/:id/channels/telegram/test → send a test message to verify connection
router.post('/:id/channels/telegram/test', (req, res) => {
  forward(req, res, `${USER_SERVICE}/projects/${req.params.id}/channels/telegram/test`);
});

// GET /api/projects → dashboard list (fast read from query_db)
router.get('/', (req, res) => {
  forward(req, res, `${QUERY_SERVICE}/query/projects`);
});

// GET /api/projects/:id/posts → all posts for a project
router.get('/:id/posts', (req, res) => {
  forward(req, res, `${CONTENT_SERVICE}/content/project/${req.params.id}`);
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

  const [contentResult, reviewResult, membersResult] = await Promise.allSettled([
    axios.get(`${CONTENT_SERVICE}/content/project/${id}`, { headers, validateStatus: () => true }),
    axios.get(`${REVIEW_SERVICE}/review/project/${id}`, { headers, validateStatus: () => true }),
    axios.get(`${USER_SERVICE}/users/project/${id}`, { headers, validateStatus: () => true }),
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
});

module.exports = router;

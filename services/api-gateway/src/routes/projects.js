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

// GET /api/projects → dashboard list (fast read from query_db)
router.get('/', (req, res) => {
  forward(req, res, `${QUERY_SERVICE}/query/projects`);
});

// GET /api/projects/:id/posts → all posts for a project
router.get('/:id/posts', (req, res) => {
  forward(req, res, `${CONTENT_SERVICE}/content/project/${req.params.id}`);
});

// GET /api/projects/:id/detail → API Composition (parallel fan-out)
router.get('/:id/detail', async (req, res) => {
  const { id } = req.params;
  const headers = {
    'x-manager-id': req.manager_id,
    'x-user-id': req.user_id || '',
    'x-user-role': req.role || '',
  };

  try {
    const [contentRes, reviewRes, membersRes] = await Promise.all([
      axios.get(`${CONTENT_SERVICE}/content/project/${id}`, { headers, validateStatus: () => true }),
      axios.get(`${REVIEW_SERVICE}/review/project/${id}`, { headers, validateStatus: () => true }),
      axios.get(`${USER_SERVICE}/users/project/${id}`, { headers, validateStatus: () => true }),
    ]);

    res.json({
      content: contentRes.data,
      reviews: reviewRes.data,
      members: membersRes.data,
    });
  } catch (err) {
    console.error(`[detail composition] project ${id} — ${err.message}`);
    res.status(502).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

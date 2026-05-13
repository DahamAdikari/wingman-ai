const express = require('express');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// GET /api/schedule/project/:projectId - pending schedules for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const base = await getServiceUrl('scheduler-service');
    forward(req, res, `${base}/schedule/project/${req.params.projectId}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/schedule/:postId - get schedule for a post
router.get('/:postId', async (req, res) => {
  try {
    const base = await getServiceUrl('scheduler-service');
    forward(req, res, `${base}/schedule/${req.params.postId}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// PATCH /api/schedule/:postId - update scheduled time { scheduled_at: ISO string }
router.patch('/:postId', async (req, res) => {
  try {
    const base = await getServiceUrl('scheduler-service');
    forward(req, res, `${base}/schedule/${req.params.postId}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// DELETE /api/schedule/:postId - cancel schedule
router.delete('/:postId', async (req, res) => {
  try {
    const base = await getServiceUrl('scheduler-service');
    forward(req, res, `${base}/schedule/${req.params.postId}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

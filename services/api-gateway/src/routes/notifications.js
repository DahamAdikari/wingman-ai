const express = require('express');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// GET /api/notifications?limit=50
router.get('/', async (req, res) => {
  try {
    const base = await getServiceUrl('notification-service');
    forward(req, res, `${base}/notifications`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', async (req, res) => {
  try {
    const base = await getServiceUrl('notification-service');
    forward(req, res, `${base}/notifications/read-all`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const base = await getServiceUrl('notification-service');
    forward(req, res, `${base}/notifications/${req.params.id}/read`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

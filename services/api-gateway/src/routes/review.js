const express = require('express');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// GET /api/review/:id/state → current approval stage for a post (must be before /:id)
router.get('/:id/state', async (req, res) => {
  try {
    const base = await getServiceUrl('review-service');
    forward(req, res, `${base}/review/${req.params.id}/state`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/review/:id → submit a review decision (approve / reject / changes_requested)
router.post('/:id', async (req, res) => {
  try {
    const base = await getServiceUrl('review-service');
    forward(req, res, `${base}/review/${req.params.id}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/review/:id → full review history for a post
router.get('/:id', async (req, res) => {
  try {
    const base = await getServiceUrl('review-service');
    forward(req, res, `${base}/review/${req.params.id}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

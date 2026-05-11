const express = require('express');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// POST /api/content → create a new post / trigger AI generation
router.post('/', async (req, res) => {
  try {
    const base = await getServiceUrl('content-service');
    forward(req, res, `${base}/content`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// GET /api/content/:id → fetch a single post with its latest version
router.get('/:id', async (req, res) => {
  try {
    const base = await getServiceUrl('content-service');
    forward(req, res, `${base}/content/${req.params.id}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

const express = require('express');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// GET /api/assets → list assets for the authenticated manager
router.get('/', async (req, res) => {
  try {
    const base = await getServiceUrl('asset-service');
    forward(req, res, `${base}/assets`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// POST /api/assets → upload a new asset (logo, template, prompt)
router.post('/', async (req, res) => {
  try {
    const base = await getServiceUrl('asset-service');
    forward(req, res, `${base}/assets`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// DELETE /api/assets/:id → remove an asset
router.delete('/:id', async (req, res) => {
  try {
    const base = await getServiceUrl('asset-service');
    forward(req, res, `${base}/assets/${req.params.id}`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

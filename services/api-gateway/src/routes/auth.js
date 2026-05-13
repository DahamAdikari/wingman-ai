const express = require('express');
const { forward } = require('../proxy/forward');
const { getServiceUrl } = require('../serviceRegistry');

const router = express.Router();

// Public — no auth middleware applied to these routes
router.post('/login', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/auth/login`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/auth/register`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// Public — used by invited clients to set their password via invite link (no token required)
router.post('/set-password', async (req, res) => {
  try {
    const base = await getServiceUrl('user-service');
    forward(req, res, `${base}/auth/set-password`);
  } catch (err) {
    console.error('[gateway] Service discovery failed:', err.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

module.exports = router;

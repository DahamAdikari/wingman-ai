const express = require('express');
const { forward } = require('../proxy/forward');

const router = express.Router();
const ASSET_SERVICE = process.env.ASSET_SERVICE_URL;

// GET /api/assets → list assets for the authenticated manager
router.get('/', (req, res) => {
  forward(req, res, `${ASSET_SERVICE}/assets`);
});

// POST /api/assets → upload a new asset (logo, template, prompt)
router.post('/', (req, res) => {
  forward(req, res, `${ASSET_SERVICE}/assets`);
});

// DELETE /api/assets/:id → remove an asset
router.delete('/:id', (req, res) => {
  forward(req, res, `${ASSET_SERVICE}/assets/${req.params.id}`);
});

module.exports = router;

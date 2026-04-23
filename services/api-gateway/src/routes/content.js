const express = require('express');
const { forward } = require('../proxy/forward');

const router = express.Router();
const CONTENT_SERVICE = process.env.CONTENT_SERVICE_URL;

// POST /api/content → create a new post / trigger AI generation
router.post('/', (req, res) => {
  forward(req, res, `${CONTENT_SERVICE}/content`);
});

// GET /api/content/:id → fetch a single post with its latest version
router.get('/:id', (req, res) => {
  forward(req, res, `${CONTENT_SERVICE}/content/${req.params.id}`);
});

module.exports = router;

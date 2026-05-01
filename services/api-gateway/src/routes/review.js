const express = require('express');
const { forward } = require('../proxy/forward');

const router = express.Router();
const REVIEW_SERVICE = process.env.REVIEW_SERVICE_URL;

// GET /api/review/:id/state → current approval stage for a post (must be before /:id)
router.get('/:id/state', (req, res) => {
  forward(req, res, `${REVIEW_SERVICE}/review/${req.params.id}/state`);
});

// POST /api/review/:id → submit a review decision (approve / reject / changes_requested)
router.post('/:id', (req, res) => {
  forward(req, res, `${REVIEW_SERVICE}/review/${req.params.id}`);
});

// GET /api/review/:id → full review history for a post
router.get('/:id', (req, res) => {
  forward(req, res, `${REVIEW_SERVICE}/review/${req.params.id}`);
});

module.exports = router;

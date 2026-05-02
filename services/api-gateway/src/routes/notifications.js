const express = require('express');
const { forward } = require('../proxy/forward');

const router = express.Router();
const NOTIFICATION_SERVICE = process.env.NOTIFICATION_SERVICE_URL;

// GET /api/notifications?limit=50
router.get('/', (req, res) => {
  forward(req, res, `${NOTIFICATION_SERVICE}/notifications`);
});

// PATCH /api/notifications/read-all
router.patch('/read-all', (req, res) => {
  forward(req, res, `${NOTIFICATION_SERVICE}/notifications/read-all`);
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', (req, res) => {
  forward(req, res, `${NOTIFICATION_SERVICE}/notifications/${req.params.id}/read`);
});

module.exports = router;

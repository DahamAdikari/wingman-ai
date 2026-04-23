const express = require('express');
const { forward } = require('../proxy/forward');

const router = express.Router();
const USER_SERVICE = process.env.USER_SERVICE_URL;

// GET /api/users → list users under the authenticated manager
router.get('/', (req, res) => {
  forward(req, res, `${USER_SERVICE}/users`);
});

// POST /api/users → create a new user (client, team member, viewer)
router.post('/', (req, res) => {
  forward(req, res, `${USER_SERVICE}/users`);
});

// GET /api/users/:id → get a single user
router.get('/:id', (req, res) => {
  forward(req, res, `${USER_SERVICE}/users/${req.params.id}`);
});

module.exports = router;

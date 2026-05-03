const express = require('express');
const { forward } = require('../proxy/forward');

const router = express.Router();
const USER_SERVICE = process.env.USER_SERVICE_URL;

// Public — no auth middleware applied to these routes
router.post('/login', (req, res) => {
  forward(req, res, `${USER_SERVICE}/auth/login`);
});

router.post('/register', (req, res) => {
  forward(req, res, `${USER_SERVICE}/auth/register`);
});

// Public — used by invited clients to set their password via invite link (no token required)
router.post('/set-password', (req, res) => {
  forward(req, res, `${USER_SERVICE}/auth/set-password`);
});

module.exports = router;

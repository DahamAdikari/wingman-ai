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

module.exports = router;

const express = require('express');
const authService = require('../services/authService');
const userService = require('../services/userService');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Public — no auth required. Used by invited clients to set their password.
router.post('/set-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const result = await userService.setPasswordWithToken(token, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

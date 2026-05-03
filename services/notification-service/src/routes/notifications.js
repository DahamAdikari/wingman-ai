const express = require('express');
const router  = express.Router();
const db      = require('../db/queries');

// GET /notifications?limit=50
router.get('/', async (req, res) => {
  const manager_id = req.headers['x-manager-id'];
  if (!manager_id) return res.status(400).json({ error: 'Missing x-manager-id header' });

  try {
    const limit         = parseInt(req.query.limit) || 50;
    const notifications = await db.listNotifications(manager_id, limit);
    res.json({ notifications });
  } catch (err) {
    console.error('[notification-service] GET /notifications error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /notifications/read-all  — must come BEFORE /:id/read so Express doesn't treat
// "read-all" as an :id param
router.patch('/read-all', async (req, res) => {
  const manager_id = req.headers['x-manager-id'];
  if (!manager_id) return res.status(400).json({ error: 'Missing x-manager-id header' });

  try {
    await db.markAllAsRead(manager_id);
    res.json({ success: true });
  } catch (err) {
    console.error('[notification-service] PATCH /notifications/read-all error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  const manager_id = req.headers['x-manager-id'];
  if (!manager_id) return res.status(400).json({ error: 'Missing x-manager-id header' });

  try {
    const notification = await db.markAsRead(req.params.id, manager_id);
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true, notification });
  } catch (err) {
    console.error('[notification-service] PATCH /notifications/:id/read error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

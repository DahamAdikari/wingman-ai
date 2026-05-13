const express = require('express');
const router = express.Router();
const db = require('../db/queries');
const { publish } = require('../events/publisher');

// GET /schedule/project/:projectId - all pending schedules for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const manager_id = req.headers['x-manager-id'];
    const rows = await db.getPendingSchedulesByProject(req.params.projectId, manager_id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /schedule/:postId - get schedule for a post
router.get('/:postId', async (req, res) => {
  try {
    const manager_id = req.headers['x-manager-id'];
    const schedule = await db.getSchedule(req.params.postId, manager_id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /schedule/:postId - update scheduled time
router.patch('/:postId', async (req, res) => {
  try {
    const manager_id = req.headers['x-manager-id'];
    const { scheduled_at } = req.body;
    if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at is required' });
    const schedule = await db.updateScheduledAt(req.params.postId, manager_id, new Date(scheduled_at));
    if (!schedule) return res.status(404).json({ error: 'Schedule not found or already fired' });

    await publish('SCHEDULE_CONFIRMED', {
      post_id:      schedule.post_id,
      project_id:   schedule.project_id,
      manager_id:   schedule.manager_id,
      scheduled_at: schedule.scheduled_at,
    });

    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /schedule/:postId - cancel schedule
router.delete('/:postId', async (req, res) => {
  try {
    const manager_id = req.headers['x-manager-id'];
    const schedule = await db.cancelSchedule(req.params.postId, manager_id);
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const { forward } = require('../proxy/forward');

const router = express.Router();
const SCHEDULER_SERVICE = process.env.SCHEDULER_SERVICE_URL;

// GET /api/schedule/project/:projectId - pending schedules for a project
router.get('/project/:projectId', (req, res) => {
  forward(req, res, `${SCHEDULER_SERVICE}/schedule/project/${req.params.projectId}`);
});

// GET /api/schedule/:postId - get schedule for a post
router.get('/:postId', (req, res) => {
  forward(req, res, `${SCHEDULER_SERVICE}/schedule/${req.params.postId}`);
});

// PATCH /api/schedule/:postId - update scheduled time { scheduled_at: ISO string }
router.patch('/:postId', (req, res) => {
  forward(req, res, `${SCHEDULER_SERVICE}/schedule/${req.params.postId}`);
});

// DELETE /api/schedule/:postId - cancel schedule
router.delete('/:postId', (req, res) => {
  forward(req, res, `${SCHEDULER_SERVICE}/schedule/${req.params.postId}`);
});

module.exports = router;

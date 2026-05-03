const express = require('express');
const { submitReview, getReviewHistory, getApprovalState, getProjectReviews } = require('../services/reviewService');

const router = express.Router();

// GET /review/project/:projectId — all reviews for every post in a project
router.get('/project/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const manager_id = req.headers['x-manager-id'];

  if (!manager_id) return res.status(401).json({ error: 'Missing manager_id' });

  try {
    const reviews = await getProjectReviews(projectId, manager_id);
    res.json(reviews);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /review/:postId/state — current approval state for a post
router.get('/:postId/state', async (req, res) => {
  const { postId } = req.params;
  const manager_id = req.headers['x-manager-id'];

  if (!manager_id) return res.status(401).json({ error: 'Missing manager_id' });

  try {
    const state = await getApprovalState(postId, manager_id);
    res.json(state);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /review/:postId — full review history for a post
router.get('/:postId', async (req, res) => {
  const { postId } = req.params;
  const manager_id = req.headers['x-manager-id'];

  if (!manager_id) return res.status(401).json({ error: 'Missing manager_id' });

  try {
    const reviews = await getReviewHistory(postId, manager_id);
    res.json(reviews);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /review/:postId — submit a review decision
//
// Body:
//   reviewer_id   : UUID of the user submitting the review
//   reviewer_role : 'manager' | 'client'
//   decision      : 'approved' | 'rejected' | 'changes_requested'
//   feedback_text : string (required when decision !== 'approved')
router.post('/:postId', async (req, res) => {
  const { postId } = req.params;
  const manager_id = req.headers['x-manager-id'];
  const { reviewer_id, reviewer_role, decision, feedback_text } = req.body;

  if (!manager_id) return res.status(401).json({ error: 'Missing manager_id' });

  if (!reviewer_id || !reviewer_role || !decision) {
    return res.status(400).json({ error: 'reviewer_id, reviewer_role, and decision are required' });
  }

  if (!['manager', 'client'].includes(reviewer_role)) {
    return res.status(400).json({ error: "reviewer_role must be 'manager' or 'client'" });
  }

  if (!['approved', 'rejected', 'changes_requested'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approved', 'rejected', or 'changes_requested'" });
  }

  if (decision !== 'approved' && !feedback_text) {
    return res.status(400).json({ error: 'feedback_text is required when decision is not approved' });
  }

  try {
    const review = await submitReview({ post_id: postId, manager_id, reviewer_id, reviewer_role, decision, feedback_text });
    res.status(201).json(review);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;

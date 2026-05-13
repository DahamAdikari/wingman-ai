const queries = require('../db/queries');
const { publish } = require('../events/publisher');

// Called when CONTENT_CREATED arrives — set/reset approval state to manager_review.
async function initApprovalState({ post_id, post_version_id, project_id, manager_id, platform, caption_text, image_url }) {
  await queries.upsertApprovalState({ post_id, project_id, manager_id, post_version_id, platform, caption_text, image_url });
  console.log(`Approval state initialised for post ${post_id} → manager_review`);
}

// POST /review/:postId  body: { reviewer_id, reviewer_role, decision, feedback_text }
//
// Allowed decisions per role:
//   manager : 'approved' | 'rejected' | 'changes_requested'
//   client  : 'approved' | 'rejected' | 'changes_requested'
//
// State machine:
//   manager_review + manager approved        → client_review  → emit MANAGER_APPROVED
//   manager_review + manager rejected        → rejected       → emit CONTENT_REJECTED
//   manager_review + manager changes_req     → rejected       → emit CONTENT_REJECTED (regen)
//   client_review  + client approved         → approved       → emit CONTENT_APPROVED
//   client_review  + client rejected         → rejected       → emit CONTENT_REJECTED
//   client_review  + client changes_req      → rejected       → emit CLIENT_FEEDBACK  (soft regen)
async function submitReview({ post_id, manager_id, reviewer_id, reviewer_role, decision, feedback_text }) {
  const state = await queries.getApprovalState(post_id, manager_id);
  if (!state) {
    const err = new Error(`No approval state found for post ${post_id}`);
    err.status = 404;
    throw err;
  }

  // Guard: manager can only review at manager_review stage
  if (reviewer_role === 'manager' && state.current_stage !== 'manager_review') {
    const err = new Error(`Cannot submit manager review — post is at stage '${state.current_stage}'`);
    err.status = 400;
    throw err;
  }

  // Guard: client can only review at client_review stage
  if (reviewer_role === 'client' && state.current_stage !== 'client_review') {
    const err = new Error(`Cannot submit client review — post is at stage '${state.current_stage}'`);
    err.status = 400;
    throw err;
  }

  // Persist the review record
  const review = await queries.insertReview({
    post_id,
    post_version_id: state.post_version_id,
    manager_id,
    reviewer_id,
    reviewer_role,
    decision,
    feedback_text,
  });

  const basePayload = {
    post_id,
    post_version_id: state.post_version_id,
    project_id: state.project_id,
    manager_id,
  };

  if (reviewer_role === 'manager') {
    if (decision === 'approved') {
      await queries.setManagerApproved(post_id, manager_id);
      await publish('MANAGER_APPROVED', { ...basePayload, new_status: 'client_review' });
    } else {
      // 'rejected' or 'changes_requested' — both trigger regeneration
      await queries.setRejected(post_id, manager_id);
      await publish('CONTENT_REJECTED', {
        ...basePayload,
        new_status: 'rejected',
        rejected_by: 'manager',
        feedback_text: feedback_text || '',
      });
    }
  } else if (reviewer_role === 'client') {
    if (decision === 'approved') {
      await queries.setClientApproved(post_id, manager_id);
      await publish('CONTENT_APPROVED', {
        ...basePayload,
        new_status: 'approved',
        platform: state.platform,
        caption_text: state.caption_text,
        image_url: state.image_url,
      });
    } else if (decision === 'changes_requested') {
      // Soft rejection — triggers content regeneration with specific feedback
      await queries.setRejected(post_id, manager_id);
      await publish('CLIENT_FEEDBACK', {
        ...basePayload,
        new_status: 'rejected',
        client_id: reviewer_id,
        feedback_text: feedback_text || '',
      });
    } else {
      // Hard rejection
      await queries.setRejected(post_id, manager_id);
      await publish('CONTENT_REJECTED', {
        ...basePayload,
        new_status: 'rejected',
        rejected_by: 'client',
        feedback_text: feedback_text || '',
      });
    }
  }

  return review;
}

async function getReviewHistory(post_id, manager_id) {
  return queries.getReviewsByPost(post_id, manager_id);
}

async function getApprovalState(post_id, manager_id) {
  const state = await queries.getApprovalState(post_id, manager_id);
  if (!state) {
    const err = new Error(`No approval state found for post ${post_id}`);
    err.status = 404;
    throw err;
  }
  return state;
}

async function getProjectReviews(project_id, manager_id) {
  return queries.getReviewsByProject(project_id, manager_id);
}

module.exports = { initApprovalState, submitReview, getReviewHistory, getApprovalState, getProjectReviews };

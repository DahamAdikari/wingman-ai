const pool = require('./pool');

// Called when CONTENT_CREATED is received — establishes the approval state for a new post version.
// Uses upsert: if the post already has a state (re-generation), reset it to manager_review.
async function upsertApprovalState({ post_id, project_id, manager_id, post_version_id }) {
  const { rows } = await pool.query(
    `INSERT INTO approval_state (post_id, project_id, manager_id, post_version_id, current_stage, manager_approved, client_approved, updated_at)
     VALUES ($1, $2, $3, $4, 'manager_review', FALSE, FALSE, NOW())
     ON CONFLICT (post_id) DO UPDATE SET
       post_version_id  = EXCLUDED.post_version_id,
       current_stage    = 'manager_review',
       manager_approved = FALSE,
       client_approved  = FALSE,
       updated_at       = NOW()
     RETURNING *`,
    [post_id, project_id, manager_id, post_version_id]
  );
  return rows[0];
}

async function getApprovalState(post_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT * FROM approval_state WHERE post_id = $1 AND manager_id = $2`,
    [post_id, manager_id]
  );
  return rows[0] || null;
}

async function setManagerApproved(post_id, manager_id) {
  const { rows } = await pool.query(
    `UPDATE approval_state
     SET manager_approved = TRUE, current_stage = 'client_review', updated_at = NOW()
     WHERE post_id = $1 AND manager_id = $2
     RETURNING *`,
    [post_id, manager_id]
  );
  return rows[0];
}

async function setClientApproved(post_id, manager_id) {
  const { rows } = await pool.query(
    `UPDATE approval_state
     SET client_approved = TRUE, current_stage = 'approved', updated_at = NOW()
     WHERE post_id = $1 AND manager_id = $2
     RETURNING *`,
    [post_id, manager_id]
  );
  return rows[0];
}

async function setRejected(post_id, manager_id) {
  const { rows } = await pool.query(
    `UPDATE approval_state
     SET current_stage = 'rejected', updated_at = NOW()
     WHERE post_id = $1 AND manager_id = $2
     RETURNING *`,
    [post_id, manager_id]
  );
  return rows[0];
}

async function insertReview({ post_id, post_version_id, manager_id, reviewer_id, reviewer_role, decision, feedback_text }) {
  const { rows } = await pool.query(
    `INSERT INTO reviews (post_id, post_version_id, manager_id, reviewer_id, reviewer_role, decision, feedback_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [post_id, post_version_id, manager_id, reviewer_id, reviewer_role, decision, feedback_text || null]
  );
  return rows[0];
}

async function getReviewsByPost(post_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT * FROM reviews WHERE post_id = $1 AND manager_id = $2 ORDER BY created_at ASC`,
    [post_id, manager_id]
  );
  return rows;
}

module.exports = {
  upsertApprovalState,
  getApprovalState,
  setManagerApproved,
  setClientApproved,
  setRejected,
  insertReview,
  getReviewsByPost,
};

const pool = require('./pool');

// Ensure a row exists for a project, then apply an update expression.
// `updateClause` is a SQL fragment like "total_posts = total_posts + 1"
// `extraParams` are additional bind params after [$1=id, $2=manager_id].
async function upsertProjectView(project_id, manager_id, updateClause, extraParams = []) {
  // Insert a skeleton row if the project has never been seen before.
  await pool.query(
    `INSERT INTO projects_view (id, manager_id, last_updated)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [project_id, manager_id]
  );

  await pool.query(
    `UPDATE projects_view
     SET ${updateClause}, last_updated = NOW()
     WHERE id = $1 AND manager_id = $2`,
    [project_id, manager_id, ...extraParams]
  );
}

// CONTENT_CREATED — new post, increment total
async function onContentCreated({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `total_posts = total_posts + 1,
     last_post_status = 'draft'`
  );
}

// MANAGER_APPROVED — post moved to client_review stage
async function onManagerApproved({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `posts_in_review = posts_in_review + 1,
     last_post_status = 'manager_review'`
  );
}

// CLIENT_FEEDBACK — client requested changes, store the feedback snippet
async function onClientFeedback({ project_id, manager_id, feedback_text }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `last_feedback_snippet = $3,
     last_post_status = 'client_review'`,
    [feedback_text]
  );
}

// CONTENT_APPROVED — fully approved by both parties
async function onContentApproved({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `posts_in_review  = GREATEST(posts_in_review - 1, 0),
     posts_approved   = posts_approved + 1,
     last_post_status = 'approved'`
  );
}

// CONTENT_REJECTED — rejected, needs regen
async function onContentRejected({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `posts_in_review  = GREATEST(posts_in_review - 1, 0),
     last_post_status = 'rejected'`
  );
}

// POST_PUBLISHED — post successfully published
async function onPostPublished({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `posts_approved   = GREATEST(posts_approved - 1, 0),
     posts_published  = posts_published + 1,
     last_post_status = 'published'`
  );
}

// GET /query/projects — returns all projects for a manager
async function getProjectsForManager(manager_id) {
  const { rows } = await pool.query(
    `SELECT * FROM projects_view
     WHERE manager_id = $1
     ORDER BY last_updated DESC`,
    [manager_id]
  );
  return rows;
}

module.exports = {
  onContentCreated,
  onManagerApproved,
  onClientFeedback,
  onContentApproved,
  onContentRejected,
  onPostPublished,
  getProjectsForManager,
};

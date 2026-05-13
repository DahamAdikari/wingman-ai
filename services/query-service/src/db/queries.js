const pool = require('./pool');

// Ensure a row exists for a project, then apply an update expression.
// `updateClause` is a SQL fragment like "total_posts = total_posts + 1"
// `extraParams` are additional bind params after [$1=id, $2=manager_id].
async function upsertProjectView(project_id, manager_id, updateClause, extraParams = []) {
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

// Look up project_id and manager_id from a post_id stored in posts_map.
// Returns null if not found (e.g. event arrived before CONTENT_CREATED).
async function resolvePost(post_id) {
  const { rows } = await pool.query(
    `SELECT project_id, manager_id FROM posts_map WHERE post_id = $1`,
    [post_id]
  );
  return rows[0] ?? null;
}

// ── Event handlers ────────────────────────────────────────────────────────────

// PROJECT_CREATED — seed the row with the project name
async function onProjectCreated({ project_id, manager_id, project_name }) {
  await pool.query(
    `INSERT INTO projects_view (id, manager_id, project_name, last_updated)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET project_name = EXCLUDED.project_name`,
    [project_id, manager_id, project_name]
  );
}

// CONTENT_CREATED — new post; increment total and record the post→project mapping
async function onContentCreated({ post_id, project_id, manager_id }) {
  // Store mapping so future events (e.g. POST_PUBLISHED) can resolve project_id
  await pool.query(
    `INSERT INTO posts_map (post_id, project_id, manager_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (post_id) DO NOTHING`,
    [post_id, project_id, manager_id]
  );

  await upsertProjectView(
    project_id,
    manager_id,
    `total_posts = total_posts + 1,
     last_post_status = 'draft'`
  );
}

// MANAGER_APPROVED — manager approved; post moves to client_review stage
async function onManagerApproved({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `posts_in_review = posts_in_review + 1,
     last_post_status = 'client_review'`  // was wrongly 'manager_review'
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

// CONTENT_REJECTED — rejected by manager or client, needs regeneration
async function onContentRejected({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `posts_in_review  = GREATEST(posts_in_review - 1, 0),
     last_post_status = 'rejected'`
  );
}

// READY_TO_PUBLISH — scheduler fired; post is now scheduled
async function onReadyToPublish({ project_id, manager_id }) {
  await upsertProjectView(
    project_id,
    manager_id,
    `posts_approved   = GREATEST(posts_approved - 1, 0),
     last_post_status = 'scheduled'`
  );
}

// POST_PUBLISHED — POST_PUBLISHED payload has no project_id, resolve via posts_map
async function onPostPublished({ post_id, manager_id }) {
  const resolved = await resolvePost(post_id);
  if (!resolved) {
    console.warn(`[query] POST_PUBLISHED: no posts_map entry for post_id=${post_id}, skipping`);
    return;
  }

  await upsertProjectView(
    resolved.project_id,
    manager_id ?? resolved.manager_id,
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
  onProjectCreated,
  onContentCreated,
  onManagerApproved,
  onClientFeedback,
  onContentApproved,
  onContentRejected,
  onReadyToPublish,
  onPostPublished,
  getProjectsForManager,
};

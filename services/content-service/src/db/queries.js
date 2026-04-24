const pool = require('./pool');

async function createPost({ project_id, manager_id, platform }) {
  const { rows } = await pool.query(
    `INSERT INTO posts (project_id, manager_id, platform, status)
     VALUES ($1, $2, $3, 'draft')
     RETURNING *`,
    [project_id, manager_id, platform]
  );
  return rows[0];
}

async function createPostVersion({ post_id, manager_id, version_number, caption_text, image_url, image_prompt, revision_notes }) {
  const { rows } = await pool.query(
    `INSERT INTO post_versions (post_id, manager_id, version_number, caption_text, image_url, image_prompt, revision_notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [post_id, manager_id, version_number, caption_text, image_url, image_prompt, revision_notes]
  );
  return rows[0];
}

async function updatePostStatus(post_id, manager_id, status) {
  await pool.query(
    `UPDATE posts SET status = $1, updated_at = NOW()
     WHERE id = $2 AND manager_id = $3`,
    [status, post_id, manager_id]
  );
}

// Returns all versions for a post, newest first
async function getPostById(id, manager_id) {
  const { rows } = await pool.query(
    `SELECT p.id, p.project_id, p.manager_id, p.platform, p.status, p.created_at, p.updated_at,
            pv.id AS version_id, pv.version_number, pv.caption_text, pv.image_url,
            pv.image_prompt, pv.revision_notes, pv.created_at AS version_created_at
     FROM posts p
     LEFT JOIN post_versions pv ON pv.post_id = p.id
     WHERE p.id = $1 AND p.manager_id = $2
     ORDER BY pv.version_number DESC`,
    [id, manager_id]
  );
  return rows;
}

// Returns posts with their latest version joined
async function getPostsByProject(project_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT p.*, pv.version_number, pv.caption_text, pv.image_url
     FROM posts p
     LEFT JOIN post_versions pv ON pv.post_id = p.id
       AND pv.version_number = (
         SELECT MAX(version_number) FROM post_versions WHERE post_id = p.id
       )
     WHERE p.project_id = $1 AND p.manager_id = $2
     ORDER BY p.created_at DESC`,
    [project_id, manager_id]
  );
  return rows;
}

async function getLatestVersionNumber(post_id) {
  const { rows } = await pool.query(
    `SELECT COALESCE(MAX(version_number), 0) AS max FROM post_versions WHERE post_id = $1`,
    [post_id]
  );
  return rows[0].max;
}

module.exports = {
  createPost,
  createPostVersion,
  updatePostStatus,
  getPostById,
  getPostsByProject,
  getLatestVersionNumber,
};

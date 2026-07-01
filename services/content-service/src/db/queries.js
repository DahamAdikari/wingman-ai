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
    `SELECT p.id, p.project_id, p.manager_id, p.platform, p.status, p.active_version_id, p.created_at, p.updated_at,
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

// Returns posts with their active version joined. Falls back to latest version
// for older rows that do not have active_version_id populated.
async function getPostsByProject(project_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT p.*,
            COALESCE(av.version_number, lv.version_number) AS version_number,
            COALESCE(av.caption_text, lv.caption_text) AS caption_text,
            COALESCE(av.image_url, lv.image_url) AS image_url
     FROM posts p
     LEFT JOIN post_versions av ON av.id = p.active_version_id
     LEFT JOIN LATERAL (
       SELECT version_number, caption_text, image_url
       FROM post_versions
       WHERE post_id = p.id
       ORDER BY version_number DESC
       LIMIT 1
     ) lv ON av.id IS NULL
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

async function setActiveVersion(post_id, manager_id, version_id) {
  await pool.query(
    `UPDATE posts SET active_version_id = $3, updated_at = NOW()
     WHERE id = $1 AND manager_id = $2`,
    [post_id, manager_id, version_id]
  );
}

async function getVersionById(version_id, manager_id) {
  const { rows } = await pool.query(
    `SELECT pv.*, p.project_id, p.platform, p.status
     FROM post_versions pv
     JOIN posts p ON p.id = pv.post_id
     WHERE pv.id = $1 AND pv.manager_id = $2`,
    [version_id, manager_id]
  );
  return rows[0];
}

// Upsert an asset reference received via ASSET_UPLOADED event.
// Stores URL/ID only — never the actual file (which lives in asset-service's S3).
async function cacheAsset({ asset_id, manager_id, project_id, type, file_url }) {
  await pool.query(
    `INSERT INTO asset_cache (asset_id, manager_id, project_id, type, file_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (asset_id) DO UPDATE SET file_url = EXCLUDED.file_url, cached_at = NOW()`,
    [asset_id, manager_id, project_id, type, file_url]
  );
}

module.exports = {
  createPost,
  createPostVersion,
  updatePostStatus,
  getPostById,
  getPostsByProject,
  getLatestVersionNumber,
  setActiveVersion,
  getVersionById,
  cacheAsset,
};

const express = require('express');
const router = express.Router();
const { createNewPost } = require('../services/contentService');
const { getPostById, getPostsByProject } = require('../db/queries');

function getManagerId(req) {
  return req.headers['x-manager-id'] || req.body?.manager_id;
}

// POST /content — create a new post and generate content
router.post('/', async (req, res) => {
  const manager_id = getManagerId(req);
  if (!manager_id) return res.status(401).json({ error: 'manager_id required' });

  const { project_id, platform, prompt, image_prompt } = req.body;
  if (!project_id || !platform || !prompt) {
    return res.status(400).json({ error: 'project_id, platform, and prompt are required' });
  }

  try {
    const result = await createNewPost({ manager_id, project_id, platform, prompt, image_prompt });
    res.status(201).json(result);
  } catch (err) {
    console.error('createNewPost error:', err.message);
    res.status(500).json({ error: 'Content creation failed' });
  }
});

// GET /content/project/:projectId — all posts for a project (must be before /:id)
router.get('/project/:projectId', async (req, res) => {
  const manager_id = getManagerId(req);
  if (!manager_id) return res.status(401).json({ error: 'manager_id required' });

  try {
    const posts = await getPostsByProject(req.params.projectId, manager_id);
    res.json(posts);
  } catch (err) {
    console.error('getPostsByProject error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve posts' });
  }
});

// GET /content/:id — single post with all versions
router.get('/:id', async (req, res) => {
  const manager_id = getManagerId(req);
  if (!manager_id) return res.status(401).json({ error: 'manager_id required' });

  try {
    const rows = await getPostById(req.params.id, manager_id);
    if (!rows.length) return res.status(404).json({ error: 'Post not found' });
    res.json(rows);
  } catch (err) {
    console.error('getPostById error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve post' });
  }
});

module.exports = router;

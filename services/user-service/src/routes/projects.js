const express = require('express');
const https = require('https');
const projectService = require('../services/projectService');
const db = require('../db/queries');

const router = express.Router();

const getManagerId = (req) => req.headers['x-manager-id'];

router.get('/', async (req, res) => {
  try {
    const projects = await projectService.listProjects(getManagerId(req));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const project = await projectService.createProject({ ...req.body, manager_id: getManagerId(req) });
    res.status(201).json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const project = await projectService.updateProject({
      id: req.params.id,
      manager_id: getManagerId(req),
      ...req.body,
    });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/:id/config', async (req, res) => {
  try {
    const project = await projectService.updateProjectConfig({
      id: req.params.id,
      manager_id: getManagerId(req),
      ...req.body,
    });
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/members', async (req, res) => {
  try {
    const member = await projectService.addProjectMember({
      project_id: req.params.id,
      manager_id: getManagerId(req),
      ...req.body,
    });
    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ─── Channel Management ───────────────────────────────────────────────────────

router.get('/:id/channels', async (req, res) => {
  try {
    const channels = await db.listProjectChannels(req.params.id, getManagerId(req));
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/channels', async (req, res) => {
  try {
    const { platform, bot_token, channel_id, channel_name, access_token, account_id, account_name } = req.body;
    if (!platform) return res.status(400).json({ error: 'platform is required' });
    const channel = await db.upsertProjectChannel({
      project_id: req.params.id,
      manager_id: getManagerId(req),
      platform,
      bot_token, channel_id, channel_name,
      access_token, account_id, account_name,
    });
    res.status(201).json(channel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/channels/instagram/test', async (req, res) => {
  try {
    const channel = await db.getProjectChannelWithCredentials(req.params.id, 'instagram');
    if (!channel) return res.status(404).json({ error: 'Instagram channel not configured' });

    const { access_token, account_id } = channel;
    if (!access_token) return res.status(400).json({ error: 'Access token missing' });

    // IGAA tokens (new Instagram API) → /me   |   EAA tokens → /{account_id}
    const isIgaa = access_token.startsWith('IGAA');
    if (!isIgaa && !account_id) {
      return res.status(400).json({ error: 'Account ID is required for EAA (business) tokens' });
    }
    const userSegment = isIgaa ? 'me' : encodeURIComponent(account_id);

    // Verify the token by fetching account info — no post is created.
    const result = await new Promise((resolve, reject) => {
      const path = `/v21.0/${userSegment}?fields=id,username,name&access_token=${encodeURIComponent(access_token)}`;
      const options = { hostname: 'graph.instagram.com', path, method: 'GET', family: 4 };
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ error: { message: 'Invalid response from Instagram' } }); }
        });
      });
      request.on('error', reject);
      request.end();
    });

    if (result.id) {
      res.json({ success: true, username: result.username || result.name || result.id });
    } else {
      const errorMsg = result.error?.message || 'Instagram API error';
      res.status(400).json({ success: false, error: errorMsg });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/channels/telegram/test', async (req, res) => {
  try {
    const channel = await db.getProjectChannelWithCredentials(req.params.id, 'telegram');
    if (!channel) return res.status(404).json({ error: 'Telegram channel not configured' });

    const { bot_token, channel_id } = channel;
    if (!bot_token || !channel_id) return res.status(400).json({ error: 'Bot token or channel ID missing' });

    const body = JSON.stringify({
      chat_id: channel_id,
      text: '✅ Wingman AI — Telegram channel connected and working!',
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.telegram.org',
        path: `/bot${bot_token}/sendMessage`,
        method: 'POST',
        family: 4, // Docker containers have IPv6 DNS but no IPv6 routing
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      };
      const req = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ ok: false, description: 'Invalid response from Telegram' }); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    if (result.ok) {
      res.json({ success: true, message_id: result.result?.message_id });
    } else {
      res.status(400).json({ success: false, error: result.description || 'Telegram API error' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id/channels/:platform', async (req, res) => {
  try {
    const deleted = await db.deleteProjectChannel(req.params.id, getManagerId(req), req.params.platform);
    if (!deleted) return res.status(404).json({ error: 'Channel not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

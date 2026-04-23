const axios = require('axios');

/**
 * Forward an incoming Express request to a downstream service URL.
 * Injects x-manager-id, x-user-id, x-user-role from the authenticated request.
 * Strips the host header so downstream services don't get confused.
 */
async function forward(req, res, targetUrl) {
  try {
    const { host, ...restHeaders } = req.headers;

    const headers = {
      ...restHeaders,
      ...(req.manager_id && { 'x-manager-id': req.manager_id }),
      ...(req.user_id && { 'x-user-id': req.user_id }),
      ...(req.role && { 'x-user-role': req.role }),
    };

    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers,
      data: req.body,
      params: req.query,
      validateStatus: () => true,
    });

    res.status(response.status).json(response.data);
  } catch (err) {
    console.error(`[forward] ${req.method} ${targetUrl} — ${err.message}`);
    res.status(502).json({ error: 'Service unavailable' });
  }
}

module.exports = { forward };

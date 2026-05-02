const WebSocket = require('ws');

// connectionId -> { ws, manager_id, user_id, role }
const connections = new Map();

function addConnection(id, ws, manager_id, user_id, role) {
  connections.set(id, { ws, manager_id, user_id, role });
  console.log(`[WS] Client connected: ${id} (manager_id=${manager_id}, user_id=${user_id}, role=${role}). Total: ${connections.size}`);
}

function removeConnection(id) {
  connections.delete(id);
  console.log(`[WS] Client disconnected: ${id}. Total: ${connections.size}`);
}

// Map RabbitMQ event names to WebSocket event types for the frontend
const EVENT_TYPE_MAP = {
  CONTENT_CREATED:    'POST_STATUS_UPDATED',
  MANAGER_APPROVED:   'POST_STATUS_UPDATED',
  CLIENT_FEEDBACK:    'POST_STATUS_UPDATED',
  CONTENT_APPROVED:   'POST_STATUS_UPDATED',
  CONTENT_REJECTED:   'POST_STATUS_UPDATED',
  POST_PUBLISHED:     'POST_STATUS_UPDATED',
  PROJECT_CREATED:    'PROJECT_UPDATED',
};

function broadcast(eventName, payload) {
  const type = EVENT_TYPE_MAP[eventName] || eventName;
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });

  let sent = 0;
  for (const [id, conn] of connections) {
    // Only send to connections belonging to the same manager tenant
    if (conn.manager_id !== payload.manager_id) continue;
    if (conn.ws.readyState !== WebSocket.OPEN) continue;

    conn.ws.send(message);
    sent++;
  }

  console.log(`[Broadcast] event=${eventName} type=${type} manager_id=${payload.manager_id} recipients=${sent}`);
}

module.exports = { addConnection, removeConnection, broadcast };

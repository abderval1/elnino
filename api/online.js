// Vercel Serverless Function: Real-Time Active Sessions Tracking
// Stores temporary active timestamps for devices currently viewing the portal

// In-memory sessions store (kept across hot invocations within same region container)
if (!global._activeSessions) {
  global._activeSessions = new Map();
}

const SESSION_TTL_MS = 30000; // 30 seconds inactivity window

function getActiveCount() {
  const now = Date.now();
  for (const [id, lastSeen] of global._activeSessions.entries()) {
    if (now - lastSeen > SESSION_TTL_MS) {
      global._activeSessions.delete(id);
    }
  }
  return Math.max(1, global._activeSessions.size);
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Session-Id');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = req.headers['x-session-id'] || url.searchParams.get('sessionId');

  // Disconnect / Leave beacon
  if (url.pathname.endsWith('/leave') || url.searchParams.get('action') === 'leave') {
    if (sessionId) {
      global._activeSessions.delete(sessionId);
    }
    const count = getActiveCount();
    res.status(200).json({ onlineCount: count, action: 'left' });
    return;
  }

  // Heartbeat / Join
  if (sessionId) {
    global._activeSessions.set(sessionId, Date.now());
  }

  const count = getActiveCount();
  res.status(200).json({
    onlineCount: count,
    timestamp: Date.now()
  });
};

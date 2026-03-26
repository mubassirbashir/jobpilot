import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { runAgentForUser, stopAgent, getAgentStatus, agentEvents } from '../agents/jobAgent.js';
import { store } from '../utils/memoryStore.js';

const router = Router();

// POST /api/agent/start — start the autonomous agent
router.post('/start', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const status = getAgentStatus(userId);
  if (status.running) return res.json({ running: true, message: 'Agent already running' });

  // Start non-blocking
  runAgentForUser(userId).catch(console.error);
  res.json({ running: true, message: 'Agent started' });
});

// POST /api/agent/stop
router.post('/stop', requireAuth, (req, res) => {
  stopAgent(req.user.id);
  res.json({ running: false, message: 'Agent stopping...' });
});

// GET /api/agent/status
router.get('/status', requireAuth, (req, res) => {
  const status = getAgentStatus(req.user.id);
  res.json(status);
});

// GET /api/agent/stream — Server-Sent Events for real-time agent updates
router.get('/stream', requireAuth, (req, res) => {
  const userId = req.user.id;

  res.writeHead(200, {
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial heartbeat
  res.write(`data: ${JSON.stringify({ event: 'connected', data: { userId } })}\n\n`);

  // Forward agent events to client
  const handler = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  agentEvents.on(`user:${userId}`, handler);

  // Heartbeat every 25s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    agentEvents.off(`user:${userId}`, handler);
  });
});

// GET /api/agent/tasks — get current agent tasks
router.get('/tasks', requireAuth, async (req, res) => {
  const tasks = await store.getActiveTasks(req.user.id);
  res.json({ tasks });
});

export default router;

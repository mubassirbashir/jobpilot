import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { store } from '../utils/memoryStore.js';

const dashRouter = Router();

// GET /api/dashboard/stats
dashRouter.get('/stats', requireAuth, async (req, res) => {
  try {
    const data = await store.getDashboardStats(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/activity
dashRouter.get('/activity', requireAuth, async (req, res) => {
  const { limit = 20 } = req.query;
  const activities = await store.getActivities(req.user.id, Number(limit));
  res.json({ activities });
});

// GET /api/dashboard/overview — single call for the full dashboard
dashRouter.get('/overview', requireAuth, async (req, res) => {
  try {
    const [statsData, activities, jobs] = await Promise.all([
      store.getDashboardStats(req.user.id),
      store.getActivities(req.user.id, 10),
      store.getJobs(req.user.id),
    ]);

    const user = await store.findUserById(req.user.id);

    res.json({
      stats: statsData.stats,
      pipeline: statsData.pipeline,
      linkedin: {
        connected: user?.linkedin?.connected || false,
        name: user?.linkedin?.name,
        headline: user?.linkedin?.headline,
        ssiScore: user?.linkedin?.ssiScore || 0,
        lastSync: user?.linkedin?.lastSync,
      },
      recentJobs: jobs.slice(0, 8),
      activities,
      agentSettings: user?.preferences || {},
      queuedCount: statsData.queuedJobs,
      applyingCount: statsData.applyingJobs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



export default dashRouter;

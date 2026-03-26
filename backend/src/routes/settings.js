import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { store } from '../utils/memoryStore.js';

const router = Router();

// GET /api/settings
router.get('/', requireAuth, async (req, res) => {
  const user = await store.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ preferences: user.preferences || {}, plan: user.plan, name: user.name, email: user.email });
});

// PUT /api/settings
router.put('/', requireAuth, async (req, res) => {
  try {
    const updates = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.preferences) updates.preferences = req.body.preferences;
    const user = await store.updateUser(req.user.id, updates);
    res.json({ success: true, preferences: user.preferences, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/settings/preferences
router.patch('/preferences', requireAuth, async (req, res) => {
  try {
    const user = await store.findUserById(req.user.id);
    const merged = { ...(user?.preferences || {}), ...req.body };
    await store.updateUser(req.user.id, { preferences: merged });
    res.json({ success: true, preferences: merged });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

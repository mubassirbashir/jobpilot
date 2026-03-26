import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { store } from '../utils/memoryStore.js';
import claudeAI from '../services/claudeAI.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/linkedin/profile
router.get('/profile', requireAuth, async (req, res) => {
  const user = await store.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ linkedin: user.linkedin || {}, connected: user.linkedin?.connected || false });
});

// POST /api/linkedin/sync — refresh profile data from LinkedIn
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const user = await store.findUserById(req.user.id);
    if (!user?.linkedin?.connected) return res.status(400).json({ error: 'LinkedIn not connected' });

    // In production, use LinkedIn API to fetch fresh profile
    // For demo, just update lastSync
    await store.updateUser(req.user.id, { 'linkedin.lastSync': new Date() });
    res.json({ success: true, message: 'Profile synced', lastSync: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/linkedin/optimize — generate AI optimization suggestions
router.post('/optimize', requireAuth, async (req, res) => {
  try {
    const user = await store.findUserById(req.user.id);

    let optimization;
    if (process.env.ANTHROPIC_API_KEY) {
      optimization = await claudeAI.optimizeLinkedInProfile({
        currentProfile: user?.linkedin || {},
        targetRoles: user?.preferences?.jobTitles || ['Product Designer'],
        cv: null,
      });
    } else {
      optimization = {
        headline: `Senior Product Designer | UX Systems | Figma | Driving 0→1 Products at Scale`,
        about: `I design products that millions of people use every day — and I'm obsessed with getting the details right.\n\nWith 6+ years of experience across B2B SaaS and consumer products, I specialize in design systems, user research, and shipping fast without sacrificing quality. I believe great design is invisible: it just feels right.\n\nCurrently open to Staff/Lead Designer roles at companies building category-defining products.\n\n📩 Reach me at: jane@example.com`,
        skillsToAdd: ['Design Systems', 'Jobs-to-be-Done', 'Accessibility (WCAG)', 'Figma Variables'],
        skillsToRemove: ['Microsoft Office', 'Photoshop'],
        seoKeywords: ['product designer', 'ux designer', 'design lead', 'figma', 'design systems'],
        improvementScore: 12,
      };
    }

    await store.updateUser(req.user.id, { 'linkedin.optimizationSuggestions': optimization });
    res.json({ optimization });
  } catch (err) {
    logger.error('LinkedIn optimize error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/linkedin/apply-optimization — apply suggestions to LinkedIn
router.post('/apply-optimization', requireAuth, async (req, res) => {
  try {
    const { section, content } = req.body;
    const user = await store.findUserById(req.user.id);

    if (!user?.linkedin?.sessionCookies) {
      // Demo: just save locally
      const updates = {};
      if (section === 'headline') updates['linkedin.headline'] = content;
      if (section === 'about') updates['linkedin.about'] = content;
      await store.updateUser(req.user.id, updates);
      await store.addActivity({ userId: req.user.id, type: 'profile_updated', message: `LinkedIn ${section} updated` });
      return res.json({ success: true, demo: true, message: `${section} saved (demo mode — connect LinkedIn to apply to live profile)` });
    }

    const { updateLinkedInProfile } = await import('../services/linkedinAutomation.js');
    const result = await updateLinkedInProfile({ section, content, cookies: user.linkedin.sessionCookies });
    if (result.success) {
      await store.addActivity({ userId: req.user.id, type: 'profile_updated', message: `LinkedIn ${section} updated successfully` });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/linkedin/health — profile completeness score
router.get('/health', requireAuth, async (req, res) => {
  const user = await store.findUserById(req.user.id);
  const li = user?.linkedin || {};
  const sections = [
    { name: 'Photo',       status: li.photo ? 'done' : 'missing',       score: 10 },
    { name: 'Headline',    status: li.headline ? 'done' : 'missing',     score: 15 },
    { name: 'About',       status: li.about ? 'done' : 'warn',           score: 15 },
    { name: 'Experience',  status: 'done',                                score: 25 },
    { name: 'Skills',      status: li.skills?.length > 5 ? 'done' : 'warn', score: 15 },
    { name: 'Open to Work',status: li.openToWork ? 'done' : 'warn',      score: 10 },
    { name: 'Banner Image',status: li.banner ? 'done' : 'missing',       score: 10 },
  ];
  const totalScore = sections.filter(s => s.status === 'done').reduce((a, s) => a + s.score, 0);
  res.json({ sections, totalScore, ssiScore: li.ssiScore || 0 });
});

export default router;

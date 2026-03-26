import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { store } from '../utils/memoryStore.js';
import claudeAI from '../services/claudeAI.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Seed a demo CV if none exists
async function ensureDemoCV(userId, userName) {
  const existing = [...(store.cvs?.values() || [])].find(c => c.userId === userId);
  if (existing) return existing;
  const id = uuidv4();
  const cv = {
    _id: id, userId, name: 'Master CV', isMaster: true,
    content: {
      personalInfo: { name: userName || 'Jane Doe', email: 'jane@example.com', phone: '+1 (415) 555-0100', location: 'San Francisco, CA', linkedin: 'linkedin.com/in/janedoe', portfolio: 'janedoe.design' },
      summary: 'Senior Product Designer with 6+ years creating user-centered digital products. Expert in design systems, UX research, and cross-functional collaboration. Led design for products used by 10M+ users.',
      experience: [
        { company: 'Acme Corp', title: 'Senior Product Designer', location: 'San Francisco, CA', startDate: '2021-06', endDate: '', current: true, bullets: ['Led end-to-end design for flagship B2B SaaS product, increasing user activation by 34%', 'Built and maintained design system used across 12 product teams', 'Conducted 80+ user research sessions, translating insights into product strategy'] },
        { company: 'StartupXYZ', title: 'Product Designer', location: 'New York, NY', startDate: '2019-03', endDate: '2021-05', current: false, bullets: ['Designed mobile-first checkout flow reducing cart abandonment by 22%', 'Partnered with 3 engineering squads to ship 15+ features in 12 months'] },
        { company: 'Agency Co', title: 'UX Designer', location: 'Remote', startDate: '2017-08', endDate: '2019-02', current: false, bullets: ['Delivered UX/UI for 20+ client projects across fintech, healthtech, and e-commerce'] },
      ],
      education: [{ institution: 'California College of the Arts', degree: 'BFA', field: 'Graphic Design', startDate: '2013', endDate: '2017' }],
      skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'UX Writing', 'Accessibility (WCAG)', 'Data-driven Design', 'Cross-functional Leadership', 'Framer', 'Maze', 'Notion', 'Jira'],
      certifications: [{ name: 'Google UX Design Certificate', issuer: 'Google', date: '2021' }],
      projects: [{ name: 'Design System OSS', description: 'Open-source design system with 500+ GitHub stars', url: 'github.com/janedoe/ds', tech: ['Figma', 'React', 'Storybook'] }],
    },
    atsScore: 92, keywordScore: 78, clarityScore: 88, impactScore: 65,
    createdAt: new Date(),
  };
  store.cvs = store.cvs || new Map();
  store.cvs.set(id, cv);
  return cv;
}

// GET /api/documents/cvs
router.get('/cvs', requireAuth, async (req, res) => {
  store.cvs = store.cvs || new Map();
  const user = await store.findUserById(req.user.id);
  const cv = await ensureDemoCV(req.user.id, user?.name);
  const cvs = [...store.cvs.values()].filter(c => c.userId === req.user.id);
  res.json({ cvs });
});

// GET /api/documents/cvs/:id
router.get('/cvs/:id', requireAuth, async (req, res) => {
  store.cvs = store.cvs || new Map();
  const cv = store.cvs.get(req.params.id);
  if (!cv || cv.userId !== req.user.id) return res.status(404).json({ error: 'CV not found' });
  res.json({ cv });
});

// POST /api/documents/cvs — create or update master CV
router.post('/cvs', requireAuth, async (req, res) => {
  try {
    store.cvs = store.cvs || new Map();
    const { name, content, isMaster } = req.body;
    const id = uuidv4();
    const cv = { _id: id, userId: req.user.id, name: name || 'My CV', content, isMaster: !!isMaster, createdAt: new Date() };
    store.cvs.set(id, cv);
    res.status(201).json({ cv });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/documents/cvs/:id
router.put('/cvs/:id', requireAuth, async (req, res) => {
  store.cvs = store.cvs || new Map();
  const cv = store.cvs.get(req.params.id);
  if (!cv || cv.userId !== req.user.id) return res.status(404).json({ error: 'CV not found' });
  const updated = { ...cv, ...req.body, _id: cv._id, userId: cv.userId };
  store.cvs.set(cv._id, updated);
  res.json({ cv: updated });
});

// POST /api/documents/cvs/:id/tailor — tailor CV for specific job
router.post('/cvs/:id/tailor', requireAuth, async (req, res) => {
  try {
    store.cvs = store.cvs || new Map();
    const { jobId } = req.body;
    const cv = store.cvs.get(req.params.id);
    if (!cv || cv.userId !== req.user.id) return res.status(404).json({ error: 'CV not found' });

    const job = jobId ? await store.getJob(jobId) : null;
    let tailored;

    if (process.env.ANTHROPIC_API_KEY && job) {
      tailored = await claudeAI.tailorCV({
        masterCV: cv,
        job,
        analysis: { mustHaveRequirements: job.requirements || [], keywords: job.keywords || [] },
      });
    } else {
      tailored = { ...cv.content, summary: `Experienced designer specializing in ${job?.title || 'product design'}, now targeting ${job?.company || 'top tech companies'}.` };
    }

    const tailoredId = uuidv4();
    const tailoredCV = {
      _id: tailoredId, userId: req.user.id,
      name: `CV for ${job?.company || 'Job'} — ${job?.title || ''}`,
      isMaster: false, forJobId: jobId,
      content: tailored, createdAt: new Date(),
    };
    store.cvs.set(tailoredId, tailoredCV);
    if (jobId) await store.updateJob(jobId, { cvVersion: tailoredId });
    res.json({ cv: tailoredCV });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/cvs/:id/score
router.post('/cvs/:id/score', requireAuth, async (req, res) => {
  try {
    store.cvs = store.cvs || new Map();
    const cv = store.cvs.get(req.params.id);
    if (!cv || cv.userId !== req.user.id) return res.status(404).json({ error: 'CV not found' });

    const { jobId } = req.body;
    const job = jobId ? await store.getJob(jobId) : null;

    let scores;
    if (process.env.ANTHROPIC_API_KEY && job) {
      scores = await claudeAI.scoreCVAgainstJob({ cv, job });
    } else {
      scores = { atsScore: 92, keywordScore: 78, clarityScore: 88, impactScore: 65, tailoringScore: 81, overallFit: 81, topImprovements: ['Add more quantified metrics to experience bullets', 'Include missing keywords: "Jobs-to-be-done", "OKRs"', 'Strengthen impact in earliest role'] };
    }

    const updated = { ...cv, ...scores };
    store.cvs.set(cv._id, updated);
    res.json({ scores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/cover-letters
router.get('/cover-letters', requireAuth, async (req, res) => {
  const jobs = await store.getJobs(req.user.id);
  const withLetters = jobs.filter(j => j.coverLetter).map(j => ({
    jobId: j._id, company: j.company, title: j.title, coverLetter: j.coverLetter, createdAt: j.updatedAt,
  }));
  res.json({ coverLetters: withLetters });
});

export default router;

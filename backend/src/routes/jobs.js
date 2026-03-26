import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { store } from '../utils/memoryStore.js';
import claudeAI from '../services/claudeAI.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/jobs — list all jobs with optional filters
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const filters = {};
    if (status) filters.status = status;
    const jobs = await store.getJobs(req.user.id, filters);
    res.json({
      jobs: jobs.slice(Number(offset), Number(offset) + Number(limit)),
      total: jobs.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', requireAuth, async (req, res) => {
  const job = await store.getJob(req.params.id);
  if (!job || job.userId !== req.user.id) return res.status(404).json({ error: 'Job not found' });
  res.json({ job });
});

// POST /api/jobs — manually add a job
router.post('/', requireAuth, async (req, res) => {
  try {
    const { url, title, company, description, location, applyUrl } = req.body;
    if (!url || !title || !company) return res.status(400).json({ error: 'url, title and company required' });
    const job = await store.createJob({
      userId: req.user.id,
      url, title, company, description, location, applyUrl,
      status: 'discovered',
      source: 'manual',
    });
    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/jobs/:id — update status or notes
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const job = await store.getJob(req.params.id);
    if (!job || job.userId !== req.user.id) return res.status(404).json({ error: 'Job not found' });
    const allowed = ['status', 'notes', 'interviewScheduled', 'matchScore'];
    const updates = {};
    for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];
    const updated = await store.updateJob(req.params.id, updates);
    res.json({ job: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const job = await store.getJob(req.params.id);
  if (!job || job.userId !== req.user.id) return res.status(404).json({ error: 'Job not found' });
  await store.updateJob(req.params.id, { status: 'withdrawn' });
  res.json({ success: true });
});

// POST /api/jobs/:id/analyze — run Claude AI analysis on a job
router.post('/:id/analyze', requireAuth, async (req, res) => {
  try {
    const job = await store.getJob(req.params.id);
    if (!job || job.userId !== req.user.id) return res.status(404).json({ error: 'Job not found' });
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({ analysis: { matchScore: 82, keywords: ['Figma', 'UX', 'Design Systems'], mustHaveRequirements: ['5+ years experience'] }, demo: true });
    }
    const user = await store.findUserById(req.user.id);
    const analysis = await claudeAI.analyzeJobDescription(
      job.description || `${job.title} at ${job.company}`,
      { skills: ['Figma', 'UX Research', 'Design Systems'] }
    );
    await store.updateJob(job._id, { matchScore: analysis.matchScore, keywords: analysis.keywords, requirements: analysis.mustHaveRequirements });
    res.json({ analysis });
  } catch (err) {
    logger.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/cover-letter — generate cover letter
router.post('/:id/cover-letter', requireAuth, async (req, res) => {
  try {
    const job = await store.getJob(req.params.id);
    if (!job || job.userId !== req.user.id) return res.status(404).json({ error: 'Job not found' });
    const user = await store.findUserById(req.user.id);

    let coverLetter;
    if (process.env.ANTHROPIC_API_KEY) {
      coverLetter = await claudeAI.generateCoverLetter({ job, userProfile: user });
    } else {
      coverLetter = `Dear ${job.company} Hiring Team,\n\nI'm thrilled to apply for the ${job.title} position. My background aligns strongly with your requirements.\n\nBest regards,\n${user.name}`;
    }
    await store.updateJob(job._id, { coverLetter });
    await store.addActivity({ userId: req.user.id, type: 'cover_letter', message: `Cover letter generated for ${job.company}`, jobId: job._id });
    res.json({ coverLetter });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/:id/interview-prep
router.post('/:id/interview-prep', requireAuth, async (req, res) => {
  try {
    const job = await store.getJob(req.params.id);
    if (!job || job.userId !== req.user.id) return res.status(404).json({ error: 'Job not found' });

    let questions;
    if (process.env.ANTHROPIC_API_KEY) {
      questions = await claudeAI.generateInterviewPrep({ job, analysis: { mustHaveRequirements: job.requirements } });
    } else {
      questions = [
        { category: 'Behavioral', question: `Tell me about a time you led a major design project.`, why: 'Tests leadership', framework: 'STAR', keyPoints: ['Scope', 'Impact', 'Learnings'] },
        { category: 'Technical', question: `Walk me through your design process for a 0→1 product.`, why: 'Tests process', framework: 'Process walkthrough', keyPoints: ['Discovery', 'Iteration', 'Delivery'] },
        { category: 'Culture', question: `Why ${job.company}?`, why: 'Tests genuine interest', framework: 'Research + personal', keyPoints: ['Company values', 'Product passion', 'Role fit'] },
      ];
    }
    res.json({ questions, job: { title: job.title, company: job.company } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/stats/pipeline
router.get('/stats/pipeline', requireAuth, async (req, res) => {
  const jobs = await store.getJobs(req.user.id);
  const pipeline = {
    discovered: jobs.filter(j => j.status === 'discovered').length,
    queued:     jobs.filter(j => j.status === 'queued').length,
    applying:   jobs.filter(j => j.status === 'applying').length,
    applied:    jobs.filter(j => j.status === 'applied').length,
    interview:  jobs.filter(j => j.status === 'interview').length,
    offer:      jobs.filter(j => j.status === 'offer').length,
    rejected:   jobs.filter(j => j.status === 'rejected').length,
    review:     jobs.filter(j => j.status === 'review_needed').length,
  };
  res.json({ pipeline });
});

export default router;

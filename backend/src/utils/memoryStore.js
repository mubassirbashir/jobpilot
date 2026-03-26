// Simple in-memory store for demo/development without MongoDB
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

class MemoryStore {
  constructor() {
    this.users = new Map();
    this.jobs = new Map();
    this.activities = new Map();
    this.tasks = new Map();
    this.cvs = new Map();
    this._seed();
  }

  _seed() {
    // Demo user
    const userId = 'demo-user-001';
    this.users.set(userId, {
      _id: userId,
      email: 'demo@jobpilot.ai',
      password: bcrypt.hashSync('demo1234', 10),
      name: 'Jane Doe',
      plan: 'pro',
      linkedin: {
        connected: true,
        name: 'Jane Doe',
        headline: 'Senior Product Designer | UX | Figma',
        profileUrl: 'https://linkedin.com/in/janedoe',
        ssiScore: 75,
        lastSync: new Date(),
      },
      preferences: {
        jobTitles: ['Product Designer', 'UX Designer', 'Senior Designer'],
        locations: ['San Francisco', 'New York', 'Remote'],
        remote: true,
        maxDailyApps: 20,
        autoApplyEasy: true,
        autoApplyManual: true,
        autoSignup: true,
        coverLetterAI: true,
        autoFollowUp: false,
      },
      stats: { totalApplications: 147, interviews: 11, offers: 2, responseRate: 7.5 },
      createdAt: new Date(),
    });

    // Demo jobs
    const jobs = [
      { title: 'Senior Product Designer', company: 'Apple', status: 'applying', matchScore: 96, location: 'Cupertino, CA', salary: { min: 180000, max: 240000 } },
      { title: 'UX Lead', company: 'Spotify', status: 'applying', matchScore: 91, location: 'New York, NY' },
      { title: 'Staff Designer, Growth', company: 'Figma', status: 'applied', matchScore: 89, location: 'Remote' },
      { title: 'Product Design Manager', company: 'Stripe', status: 'review_needed', matchScore: 88, location: 'Remote' },
      { title: 'Principal Designer, AI Products', company: 'Anthropic', status: 'queued', matchScore: 94, location: 'SF, CA' },
      { title: 'Head of Design', company: 'Notion', status: 'queued', matchScore: 85, location: 'Remote' },
      { title: 'Senior UX Designer', company: 'Airbnb', status: 'applied', matchScore: 82, location: 'San Francisco' },
      { title: 'Design Lead, Consumer', company: 'Meta', status: 'interview', matchScore: 79, location: 'Menlo Park, CA' },
    ];

    jobs.forEach(j => {
      const id = uuidv4();
      this.jobs.set(id, {
        _id: id,
        userId,
        url: `https://linkedin.com/jobs/view/${Math.floor(Math.random() * 9999999)}`,
        source: 'linkedin',
        discoveredAt: new Date(Date.now() - Math.random() * 86400000 * 3),
        appliedAt: j.status === 'applied' ? new Date() : null,
        ...j,
      });
    });

    // Demo activities
    const acts = [
      { type: 'applied', message: 'Applied to Figma Staff Designer via Easy Apply' },
      { type: 'cover_letter', message: 'Cover letter generated for Spotify UX Lead' },
      { type: 'signup', message: 'Auto signed up to Stripe careers portal (Greenhouse)' },
      { type: 'profile_updated', message: 'LinkedIn headline updated by AI' },
      { type: 'job_found', message: '14 new jobs found matching your criteria' },
      { type: 'applied', message: 'Applied to 8 jobs via manual form auto-fill' },
      { type: 'interview', message: 'Meta recruiter reached out — flagged for review' },
    ];

    acts.forEach(a => {
      const id = uuidv4();
      this.activities.set(id, { _id: id, userId, ...a, createdAt: new Date(Date.now() - Math.random() * 3600000 * 6) });
    });
  }

  // User methods
  async findUserByEmail(email) {
    for (const u of this.users.values()) if (u.email === email) return u;
    return null;
  }

  async findUserById(id) { return this.users.get(id) || null; }

  async createUser(data) {
    const id = uuidv4();
    const user = { _id: id, ...data, stats: { totalApplications: 0, interviews: 0, offers: 0, responseRate: 0 }, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id, data) {
    const u = this.users.get(id);
    if (!u) return null;
    const updated = this._deepMerge(u, data);
    this.users.set(id, updated);
    return updated;
  }

  // Job methods
  async getJobs(userId, filters = {}) {
    let jobs = [...this.jobs.values()].filter(j => j.userId === userId);
    if (filters.status) jobs = jobs.filter(j => j.status === filters.status);
    jobs.sort((a, b) => b.matchScore - a.matchScore);
    return jobs;
  }

  async getJob(id) { return this.jobs.get(id) || null; }

  async createJob(data) {
    const id = uuidv4();
    const job = { _id: id, ...data, discoveredAt: new Date() };
    this.jobs.set(id, job);
    return job;
  }

  async updateJob(id, data) {
    const j = this.jobs.get(id);
    if (!j) return null;
    const updated = { ...j, ...data };
    this.jobs.set(id, updated);
    return updated;
  }

  // Activity methods
  async addActivity(data) {
    const id = uuidv4();
    const act = { _id: id, ...data, createdAt: new Date() };
    this.activities.set(id, act);
    return act;
  }

  async getActivities(userId, limit = 20) {
    return [...this.activities.values()]
      .filter(a => a.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  // Agent task methods
  async createTask(data) {
    const id = uuidv4();
    const task = { _id: id, ...data, status: 'pending', createdAt: new Date() };
    this.tasks.set(id, task);
    return task;
  }

  async getActiveTasks(userId) {
    return [...this.tasks.values()]
      .filter(t => t.userId === userId && ['pending', 'running'].includes(t.status))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  async updateTask(id, data) {
    const t = this.tasks.get(id);
    if (!t) return null;
    const updated = { ...t, ...data };
    this.tasks.set(id, updated);
    return updated;
  }

  // Dashboard stats
  async getDashboardStats(userId) {
    const user = await this.findUserById(userId);
    const jobs = await this.getJobs(userId);
    const pipeline = {
      sent:       jobs.filter(j => ['applied', 'interview', 'offer'].includes(j.status)).length,
      viewed:     Math.floor(jobs.filter(j => ['applied', 'interview', 'offer'].includes(j.status)).length * 0.19),
      responded:  jobs.filter(j => ['interview', 'offer'].includes(j.status)).length,
      interview:  jobs.filter(j => j.status === 'interview').length,
      offer:      jobs.filter(j => j.status === 'offer').length,
    };
    return {
      stats: user?.stats || {},
      pipeline,
      linkedinScore: user?.linkedin?.ssiScore || 0,
      queuedJobs: jobs.filter(j => j.status === 'queued').length,
      applyingJobs: jobs.filter(j => j.status === 'applying').length,
    };
  }

  _deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this._deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
}

export const store = new MemoryStore();

/**
 * JobPilot AI Agent Orchestrator
 * This is the brain — it runs autonomously, deciding what to do next.
 * It uses a task queue pattern with priority and rate limiting.
 */
import { store } from '../utils/memoryStore.js';
import claudeAI from '../services/claudeAI.js';
import linkedinAutomation from '../services/linkedinAutomation.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

// In-memory event emitter for real-time updates
import { EventEmitter } from 'events';
export const agentEvents = new EventEmitter();

// Active agent states per user
const activeAgents = new Map();

// ─── Main Agent Entry Point ───────────────────────────────────────────────
export async function runAgentForUser(userId) {
  if (activeAgents.get(userId)?.running) {
    logger.info(`Agent already running for user ${userId}`);
    return;
  }

  const user = await store.findUserById(userId);
  if (!user) return;

  activeAgents.set(userId, { running: true, startedAt: new Date(), taskCount: 0 });
  emit(userId, 'agent_started', { message: 'AI Agent started' });

  try {
    await runAgentCycle(user);
  } catch (err) {
    logger.error(`Agent error for ${userId}:`, err.message);
    emit(userId, 'agent_error', { message: err.message });
  } finally {
    activeAgents.set(userId, { running: false });
    emit(userId, 'agent_stopped', { message: 'Agent cycle complete' });
  }
}

async function runAgentCycle(user) {
  const userId = user._id;
  const prefs = user.preferences || {};

  logger.info(`🤖 Running agent cycle for ${user.name}`);

  // ── Step 1: Check daily application limit ──
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayActivities = (await store.getActivities(userId, 100))
    .filter(a => a.type === 'applied' && new Date(a.createdAt) >= today);

  const maxApps = prefs.maxDailyApps || 20;
  const remainingApps = maxApps - todayActivities.length;

  emit(userId, 'status', { message: `Daily limit: ${todayActivities.length}/${maxApps} applications sent today` });

  if (remainingApps <= 0) {
    emit(userId, 'status', { message: 'Daily application limit reached. Agent pausing until tomorrow.' });
    return;
  }

  // ── Step 2: Scan for new jobs ──
  if (prefs.jobTitles?.length > 0) {
    await taskScanJobs(user, remainingApps);
  }

  // ── Step 3: Process queued jobs ──
  await taskProcessQueue(user, remainingApps);

  // ── Step 4: Update LinkedIn profile if needed ──
  if (user.linkedin?.connected && prefs.autoLinkedInOptimize) {
    await taskOptimizeLinkedIn(user);
  }
}

// ─── Task: Scan LinkedIn for New Jobs ────────────────────────────────────
async function taskScanJobs(user, maxJobs) {
  const taskId = uuidv4();
  emit(user._id, 'task_start', { taskId, type: 'scan_jobs', detail: `Scanning LinkedIn for ${user.preferences.jobTitles?.join(', ')}` });

  try {
    // In demo mode (no browser available), generate mock jobs
    let foundJobs = [];

    if (process.env.NODE_ENV === 'production' && user.linkedin?.sessionCookies) {
      foundJobs = await linkedinAutomation.scrapeLinkedInJobs({
        searchTerms: user.preferences.jobTitles || ['Product Designer'],
        locations: user.preferences.locations || ['Remote'],
        easyApplyOnly: false,
        maxJobs,
        cookies: user.linkedin.sessionCookies,
      });
    } else {
      // Demo mode: generate realistic mock jobs
      foundJobs = generateMockJobs(user.preferences, 5);
    }

    // Deduplicate and save new jobs
    const existingJobs = await store.getJobs(user._id);
    const existingUrls = new Set(existingJobs.map(j => j.url));
    const newJobs = foundJobs.filter(j => !existingUrls.has(j.url));

    for (const job of newJobs) {
      await store.createJob({ ...job, userId: user._id, status: 'discovered' });
    }

    if (newJobs.length > 0) {
      await store.addActivity({ userId: user._id, type: 'job_found', message: `Found ${newJobs.length} new jobs matching your criteria` });
    }

    emit(user._id, 'task_done', { taskId, detail: `Found ${newJobs.length} new jobs` });
  } catch (err) {
    emit(user._id, 'task_error', { taskId, error: err.message });
  }
}

// ─── Task: Process Job Queue ──────────────────────────────────────────────
async function taskProcessQueue(user, maxApps) {
  const jobs = await store.getJobs(user._id, { status: 'discovered' });
  const queued = jobs.slice(0, maxApps);

  for (const job of queued) {
    const agent = activeAgents.get(user._id);
    if (!agent?.running) break;

    await processJob(user, job);
    await delay(2000 + Math.random() * 3000); // Human-like delay between applications
  }
}

// ─── Process a Single Job ─────────────────────────────────────────────────
async function processJob(user, job) {
  const userId = user._id;

  // Step A: Analyze job description
  emit(userId, 'status', { message: `Analyzing ${job.title} at ${job.company}...` });
  await store.updateJob(job._id, { status: 'analyzing' });

  let analysis = {};
  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const masterCV = await getMasterCV(userId);
      analysis = await claudeAI.analyzeJobDescription(
        job.description || `${job.title} role at ${job.company}`,
        masterCV?.content || {}
      );
    } else {
      // Demo analysis
      analysis = {
        matchScore: Math.floor(65 + Math.random() * 30),
        keywords: ['Figma', 'User Research', 'Design Systems', 'Prototyping'],
        mustHaveRequirements: ['5+ years UX experience', 'Figma proficiency'],
        missingSkills: [],
      };
    }

    await store.updateJob(job._id, {
      matchScore: analysis.matchScore,
      matchReason: analysis.matchReason,
      keywords: analysis.keywords,
      requirements: analysis.mustHaveRequirements,
    });
  } catch (err) {
    logger.warn('Analysis failed, using defaults:', err.message);
  }

  // Skip low-match jobs
  if ((analysis.matchScore || 70) < 60) {
    await store.updateJob(job._id, { status: 'withdrawn' });
    emit(userId, 'status', { message: `Skipping ${job.title} — match score ${analysis.matchScore}% (below 60% threshold)` });
    return;
  }

  await store.updateJob(job._id, { status: 'queued' });

  // Step B: Generate tailored cover letter
  let coverLetter = '';
  if (user.preferences?.coverLetterAI) {
    emit(userId, 'status', { message: `Writing cover letter for ${job.company}...` });
    try {
      const masterCV = await getMasterCV(userId);
      if (process.env.ANTHROPIC_API_KEY) {
        coverLetter = await claudeAI.generateCoverLetter({ job, userCV: masterCV, userProfile: user });
      } else {
        coverLetter = generateDemoCoverLetter(job, user);
      }
      await store.updateJob(job._id, { coverLetter });
      await store.addActivity({ userId, type: 'cover_letter', message: `Cover letter generated for ${job.company} ${job.title}`, jobId: job._id });
      emit(userId, 'activity', { type: 'cover_letter', message: `Cover letter written for ${job.title} at ${job.company}` });
    } catch (err) {
      logger.warn('Cover letter generation failed:', err.message);
    }
  }

  // Step C: Apply
  await store.updateJob(job._id, { status: 'applying' });
  emit(userId, 'status', { message: `Applying to ${job.title} at ${job.company}...` });

  await applyToJob(user, job, coverLetter, analysis);
}

// ─── Apply to a Job ───────────────────────────────────────────────────────
async function applyToJob(user, job, coverLetter, analysis) {
  const userId = user._id;
  const prefs = user.preferences || {};

  const onProgress = (msg) => emit(userId, 'status', { message: msg });

  // Demo mode: simulate application
  if (process.env.NODE_ENV !== 'production' || !user.linkedin?.sessionCookies) {
    await delay(1500 + Math.random() * 2000); // Simulate processing time

    await store.updateJob(job._id, { status: 'applied', appliedAt: new Date() });
    await store.updateUser(userId, { 'stats.totalApplications': (user.stats?.totalApplications || 0) + 1 });
    await store.addActivity({
      userId,
      type: 'applied',
      message: `Applied to ${job.title} at ${job.company} ${job.isEasyApply ? 'via Easy Apply' : 'via application form'}`,
      jobId: job._id,
    });

    emit(userId, 'activity', { type: 'applied', message: `✅ Applied to ${job.title} at ${job.company}`, jobId: job._id });
    return;
  }

  // Real application flow
  try {
    let result;
    const masterCV = await getMasterCV(userId);

    if (job.isEasyApply && prefs.autoApplyEasy) {
      result = await linkedinAutomation.easyApply({
        jobUrl: job.url,
        userProfile: user,
        coverLetter,
        cv: masterCV,
        cookies: user.linkedin?.sessionCookies,
        onProgress,
      });
    } else if (job.applyUrl && prefs.autoApplyManual) {
      const atsType = linkedinAutomation.detectATS(job.applyUrl);

      // Handle ATS signup if needed
      if (prefs.autoSignup && atsType) {
        const atsEmail = user.email.replace('@', `+${atsType}@`);
        const signupResult = await linkedinAutomation.signupToATS({
          signupUrl: `${new URL(job.applyUrl).origin}/signup`,
          email: atsEmail,
          password: process.env.ATS_DEFAULT_PASSWORD || 'JobPilot2024!',
          name: user.name,
          atsType,
          onProgress,
        });

        if (signupResult.success) {
          await store.updateJob(job._id, { atsEmail, atsCreatedAt: new Date() });
          await store.addActivity({ userId, type: 'signup', message: `Signed up to ${atsType} portal for ${job.company}`, jobId: job._id });
          emit(userId, 'activity', { type: 'signup', message: `Signed up to ${atsType} portal for ${job.company}` });
        }
      }

      // Generate AI answers for common questions
      const customAnswers = await generateCustomAnswers(job, masterCV, user, analysis);

      result = await linkedinAutomation.fillExternalApplication({
        applyUrl: job.applyUrl,
        userProfile: user,
        cv: masterCV,
        coverLetter,
        answers: customAnswers,
        atsType,
        cookies: user.linkedin?.sessionCookies,
        onProgress,
      });
    }

    if (result?.success) {
      await store.updateJob(job._id, { status: 'applied', appliedAt: new Date() });
      await store.addActivity({ userId, type: 'applied', message: `Applied to ${job.title} at ${job.company}`, jobId: job._id });
      emit(userId, 'activity', { type: 'applied', message: `✅ Applied to ${job.title} at ${job.company}`, jobId: job._id });
    } else {
      await store.updateJob(job._id, { status: 'review_needed', notes: result?.error });
      emit(userId, 'activity', { type: 'error', message: `⚠️ ${job.title} at ${job.company} needs manual review` });
    }
  } catch (err) {
    logger.error('Apply error:', err.message);
    await store.updateJob(job._id, { status: 'review_needed', notes: err.message });
  }
}

// ─── Task: Optimize LinkedIn Profile ─────────────────────────────────────
async function taskOptimizeLinkedIn(user) {
  const taskId = uuidv4();
  emit(user._id, 'task_start', { taskId, type: 'update_linkedin', detail: 'Optimizing LinkedIn profile with AI' });

  try {
    const masterCV = await getMasterCV(user._id);
    const optimization = await claudeAI.optimizeLinkedInProfile({
      currentProfile: user.linkedin,
      targetRoles: user.preferences?.jobTitles,
      cv: masterCV,
    });

    // In production, actually update LinkedIn
    // For now, save suggestions
    await store.updateUser(user._id, {
      'linkedin.optimizationSuggestions': optimization,
      'linkedin.lastOptimizedAt': new Date(),
    });

    await store.addActivity({ userId: user._id, type: 'profile_updated', message: 'LinkedIn profile optimization suggestions ready for review' });
    emit(user._id, 'task_done', { taskId, detail: 'LinkedIn optimization ready' });
  } catch (err) {
    emit(user._id, 'task_error', { taskId, error: err.message });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────
async function getMasterCV(userId) {
  const cvs = [...(store.cvs?.values() || [])].filter(c => c.userId === userId);
  return cvs.find(c => c.isMaster) || cvs[0] || {
    content: {
      personalInfo: { name: 'Jane Doe', email: 'jane@example.com' },
      summary: 'Experienced product designer with 6+ years building digital products.',
      experience: [],
      skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'UX Writing'],
    },
  };
}

async function generateCustomAnswers(job, cv, user, analysis) {
  const commonQuestions = [
    'Why do you want to work at this company?',
    'What is your notice period / when can you start?',
    'Are you authorized to work in the US?',
    'Do you require visa sponsorship?',
  ];

  const answers = [
    { question: 'Why do you want to work', answer: `I've been following ${job.company}'s work closely and I'm deeply aligned with the mission. The ${job.title} role directly matches my expertise in ${cv?.content?.skills?.slice(0, 3).join(', ')}, and I'm excited to contribute.` },
    { question: 'notice period|start date|available', answer: '2 weeks notice / available immediately if needed' },
    { question: 'authorized|work.*right', answer: 'Yes' },
    { question: 'visa|sponsorship', answer: 'No' },
    { question: 'salary|compensation|expected', answer: `${job.salary?.min ? `$${(job.salary.min/1000).toFixed(0)}k-$${(job.salary.max/1000).toFixed(0)}k` : 'Competitive / negotiable'}` },
  ];

  return answers;
}

function generateMockJobs(preferences, count) {
  const companies = ['Airbnb', 'Uber', 'Lyft', 'Twitter', 'Pinterest', 'Canva', 'Miro', 'Linear', 'Vercel', 'Notion'];
  const titles = preferences?.jobTitles || ['Product Designer'];
  const locs = preferences?.locations || ['Remote'];

  return Array.from({ length: count }, (_, i) => ({
    title: titles[i % titles.length],
    company: companies[Math.floor(Math.random() * companies.length)],
    location: locs[i % locs.length],
    url: `https://linkedin.com/jobs/view/${Math.floor(Math.random() * 9999999)}`,
    applyUrl: null,
    isEasyApply: Math.random() > 0.5,
    source: 'linkedin',
    description: `We are looking for a talented ${titles[i % titles.length]} to join our growing team...`,
  }));
}

function generateDemoCoverLetter(job, user) {
  return `Dear ${job.company} Hiring Team,

I'm excited to apply for the ${job.title} position at ${job.company}. With my background in product design and a track record of shipping user-centered products that drive measurable business outcomes, I'm confident I can make an immediate impact on your team.

What excites me most about ${job.company} is the opportunity to work at the intersection of design and real-world impact. My experience with design systems, user research, and cross-functional collaboration aligns directly with what you're building. In my previous roles, I've led end-to-end design processes for products serving millions of users, consistently delivering work that both users love and engineers can build efficiently.

I'd welcome the chance to discuss how I can contribute to ${job.company}'s next chapter. Thank you for your consideration.

Best regards,
${user.name}`;
}

function emit(userId, event, data) {
  agentEvents.emit(`user:${userId}`, { event, data, timestamp: new Date().toISOString() });
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Control Methods ──────────────────────────────────────────────────────
export function stopAgent(userId) {
  const state = activeAgents.get(userId);
  if (state) activeAgents.set(userId, { ...state, running: false });
}

export function getAgentStatus(userId) {
  return activeAgents.get(userId) || { running: false };
}

export default { runAgentForUser, stopAgent, getAgentStatus, agentEvents };

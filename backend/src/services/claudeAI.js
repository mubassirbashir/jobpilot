import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Analyze Job Description ───────────────────────────────────────────────
export async function analyzeJobDescription(jd, userCV) {
  const prompt = `You are an expert career coach and recruiter. Analyze this job description and candidate CV.

JOB DESCRIPTION:
${jd}

CANDIDATE CV SUMMARY:
${JSON.stringify(userCV, null, 2)}

Return ONLY valid JSON (no markdown, no explanation):
{
  "matchScore": <0-100 integer>,
  "matchReason": "<1-2 sentence why this is a good/bad match>",
  "fitSummary": "<3 sentence hiring manager perspective>",
  "mustHaveRequirements": ["<requirement>"],
  "niceToHaveRequirements": ["<requirement>"],
  "keywords": ["<ATS keyword>"],
  "missingSkills": ["<skill candidate lacks>"],
  "strengths": ["<candidate strength matching this role>"],
  "suggestedHeadline": "<LinkedIn headline tailored for this role>",
  "redFlags": ["<any concerns>"]
}`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });
    return JSON.parse(response.content[0].text);
  } catch (err) {
    logger.error('JD analysis failed:', err.message);
    return { matchScore: 70, matchReason: 'Analysis unavailable', keywords: [], mustHaveRequirements: [] };
  }
}

// ─── Generate Tailored Cover Letter ──────────────────────────────────────
export async function generateCoverLetter({ job, userCV, userProfile, tone = 'professional' }) {
  const prompt = `Write a highly personalized, compelling cover letter for this job application.

JOB: ${job.title} at ${job.company}
JOB DESCRIPTION: ${job.description?.slice(0, 2000) || ''}
COMPANY: ${job.company}

CANDIDATE:
Name: ${userCV?.content?.personalInfo?.name || userProfile?.name}
Current headline: ${userProfile?.linkedin?.headline || ''}
Experience: ${JSON.stringify(userCV?.content?.experience?.slice(0, 3) || [])}
Skills: ${(userCV?.content?.skills || []).join(', ')}
Summary: ${userCV?.content?.summary || ''}

REQUIREMENTS:
- Tone: ${tone} (professional, enthusiastic, creative)
- Length: 3 paragraphs (opening hook, value proposition, call to action)
- Do NOT use generic phrases like "I am writing to apply"
- Reference specific things about ${job.company} that show genuine interest
- Quantify achievements where possible
- End with confident call to action
- First person, no headers, no bullet points

Return ONLY the cover letter text, nothing else.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].text.trim();
}

// ─── Tailor CV to Job ─────────────────────────────────────────────────────
export async function tailorCV({ masterCV, job, analysis }) {
  const prompt = `You are an expert ATS optimization specialist. Tailor this CV for the specific job.

JOB: ${job.title} at ${job.company}
KEY REQUIREMENTS: ${analysis.mustHaveRequirements?.join(', ') || ''}
IMPORTANT KEYWORDS: ${analysis.keywords?.join(', ') || ''}
MISSING SKILLS TO ADDRESS: ${analysis.missingSkills?.join(', ') || ''}

MASTER CV:
${JSON.stringify(masterCV.content, null, 2)}

Tasks:
1. Rewrite the summary to align with this specific role
2. Reorder/reframe experience bullets to highlight most relevant work
3. Add missing keywords naturally (don't keyword-stuff)
4. Reorder skills to put most relevant first
5. Keep ALL real experience — do not fabricate anything

Return ONLY valid JSON matching this structure:
{
  "summary": "<tailored summary>",
  "experience": [<same structure, tailored bullets>],
  "skills": ["<reordered and potentially expanded skill list>"],
  "personalInfo": <unchanged>,
  "education": <unchanged>
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(text);
}

// ─── Optimize LinkedIn Profile ────────────────────────────────────────────
export async function optimizeLinkedInProfile({ currentProfile, targetRoles, cv }) {
  const prompt = `You are a LinkedIn optimization expert with a 98% profile view rate improvement track record.

CURRENT PROFILE:
${JSON.stringify(currentProfile, null, 2)}

TARGET ROLES: ${targetRoles?.join(', ') || 'Product Designer, UX Lead'}

CV HIGHLIGHTS:
${JSON.stringify(cv?.content?.experience?.slice(0, 2) || [], null, 2)}

Optimize for recruiter discovery AND human appeal. Return ONLY valid JSON:
{
  "headline": "<120 char max, keyword-rich, human, not just titles>",
  "about": "<2000 char max, first person, story-driven, ends with CTA>",
  "experienceUpdates": [
    { "company": "<company>", "title": "<title>", "description": "<updated 3-5 bullet description>" }
  ],
  "skillsToAdd": ["<skill>"],
  "skillsToRemove": ["<outdated skill>"],
  "bannerSuggestion": "<what to put on banner image>",
  "seoKeywords": ["<recruiter search keywords to include naturally>"],
  "improvementScore": <expected SSI score increase>
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(text);
}

// ─── Answer Custom Application Questions ─────────────────────────────────
export async function answerApplicationQuestion({ question, job, userCV, userProfile }) {
  const prompt = `Answer this job application question for the candidate. Be specific, honest, and compelling.

QUESTION: "${question}"

JOB: ${job.title} at ${job.company}

CANDIDATE INFO:
Name: ${userCV?.content?.personalInfo?.name || userProfile?.name}
Experience: ${JSON.stringify(userCV?.content?.experience?.slice(0, 2) || [])}
Skills: ${(userCV?.content?.skills || []).join(', ')}
Summary: ${userCV?.content?.summary || ''}

Rules:
- Be specific with examples and metrics
- Keep under 300 words unless question requires more
- First person, professional but authentic
- Don't start with "Certainly" or "Great question"
- Return ONLY the answer text`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].text.trim();
}

// ─── Generate Interview Prep Questions ───────────────────────────────────
export async function generateInterviewPrep({ job, analysis }) {
  const prompt = `Generate 8 highly specific interview questions for this role based on the job description.

JOB: ${job.title} at ${job.company}
KEY REQUIREMENTS: ${analysis?.mustHaveRequirements?.join(', ') || job.description?.slice(0, 500)}
COMPANY: ${job.company}

For each question, provide a suggested answer framework. Return ONLY valid JSON:
[
  {
    "category": "Technical|Behavioral|Situational|Culture",
    "question": "<specific interview question>",
    "why": "<why they ask this>",
    "framework": "<STAR/specific framework to use>",
    "keyPoints": ["<key point to hit>"]
  }
]`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(text);
}

// ─── Score CV against job ──────────────────────────────────────────────────
export async function scoreCVAgainstJob({ cv, job }) {
  const prompt = `Rate this CV against this job on 5 dimensions. Return ONLY valid JSON:
{
  "atsScore": <0-100>,
  "keywordScore": <0-100>,
  "clarityScore": <0-100>,
  "impactScore": <0-100>,
  "tailoringScore": <0-100>,
  "overallFit": <0-100>,
  "topImprovements": ["<action to improve>"]
}

JOB: ${job.title} at ${job.company}
REQUIREMENTS: ${job.requirements?.join(', ') || job.description?.slice(0, 300)}
CV SUMMARY: ${JSON.stringify(cv?.content?.summary)} | Skills: ${cv?.content?.skills?.join(', ')}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.replace(/```json\n?|```/g, '').trim();
  return JSON.parse(text);
}

export default {
  analyzeJobDescription,
  generateCoverLetter,
  tailorCV,
  optimizeLinkedInProfile,
  answerApplicationQuestion,
  generateInterviewPrep,
  scoreCVAgainstJob,
};

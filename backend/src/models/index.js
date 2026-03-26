import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// ─────────────────── USER ───────────────────
const userSchema = new Schema({
  email:        { type: String, required: true, unique: true, lowercase: true },
  password:     { type: String, required: true, select: false },
  name:         { type: String, required: true },
  plan:         { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  createdAt:    { type: Date, default: Date.now },

  // LinkedIn connection
  linkedin: {
    accessToken:    String,
    refreshToken:   String,
    expiresAt:      Date,
    profileId:      String,
    profileUrl:     String,
    name:           String,
    headline:       String,
    photo:          String,
    connected:      { type: Boolean, default: false },
    lastSync:       Date,
    ssiScore:       Number,
    // Stored encrypted session for browser automation
    sessionCookies: String,
  },

  // Job search preferences
  preferences: {
    jobTitles:        [String],
    locations:        [String],
    remote:           { type: Boolean, default: true },
    salaryMin:        Number,
    salaryMax:        Number,
    jobTypes:         [String], // full-time, part-time, contract
    industries:       [String],
    excludeCompanies: [String],
    maxDailyApps:     { type: Number, default: 20 },
    autoApplyEasy:    { type: Boolean, default: true },
    autoApplyManual:  { type: Boolean, default: true },
    autoSignup:       { type: Boolean, default: true },
    autoFollowUp:     { type: Boolean, default: false },
    coverLetterAI:    { type: Boolean, default: true },
  },

  stats: {
    totalApplications: { type: Number, default: 0 },
    interviews:        { type: Number, default: 0 },
    offers:            { type: Number, default: 0 },
    responseRate:      { type: Number, default: 0 },
  },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ─────────────────── JOB ───────────────────
const jobSchema = new Schema({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Source
  source:       { type: String, enum: ['linkedin', 'indeed', 'greenhouse', 'lever', 'workday', 'manual'], default: 'linkedin' },
  externalId:   String,
  url:          { type: String, required: true },
  applyUrl:     String,
  atsType:      String, // greenhouse, lever, workday, ashby, etc.

  // Job details
  title:        { type: String, required: true },
  company:      { type: String, required: true },
  companyLogo:  String,
  location:     String,
  remote:       Boolean,
  salary:       { min: Number, max: Number, currency: String },
  jobType:      String,
  description:  String,
  requirements: [String],
  niceToHave:   [String],
  keywords:     [String],

  // AI analysis
  matchScore:   { type: Number, min: 0, max: 100 },
  matchReason:  String,
  fitSummary:   String,

  // Application state
  status: {
    type: String,
    enum: ['discovered', 'queued', 'analyzing', 'applying', 'applied', 'interview', 'offer', 'rejected', 'withdrawn', 'review_needed'],
    default: 'discovered',
    index: true,
  },

  // Documents used
  cvVersion:          String,
  coverLetter:        String,
  customAnswers:      [{ question: String, answer: String }],

  // Tracking
  appliedAt:          Date,
  lastActivityAt:     Date,
  followUpSentAt:     Date,
  interviewScheduled: Date,
  notes:              String,

  // External ATS account
  atsEmail:     String,
  atsCreatedAt: Date,

  postedAt:     Date,
  discoveredAt: { type: Date, default: Date.now },
}, { timestamps: true });

// ─────────────────── CV ───────────────────
const cvSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, default: 'Master CV' },
  isMaster:  { type: Boolean, default: false },
  forJobId:  { type: Schema.Types.ObjectId, ref: 'Job' },
  content: {
    personalInfo: {
      name: String, email: String, phone: String,
      location: String, linkedin: String, portfolio: String,
    },
    summary:    String,
    experience: [{
      company: String, title: String, location: String,
      startDate: String, endDate: String, current: Boolean,
      bullets: [String],
    }],
    education: [{
      institution: String, degree: String, field: String,
      startDate: String, endDate: String, gpa: String,
    }],
    skills:        [String],
    certifications: [{ name: String, issuer: String, date: String }],
    projects:      [{ name: String, description: String, url: String, tech: [String] }],
  },
  atsScore:       Number,
  keywordScore:   Number,
  clarityScore:   Number,
  impactScore:    Number,
}, { timestamps: true });

// ─────────────────── ACTIVITY LOG ───────────────────
const activitySchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:      { type: String, enum: ['applied', 'interview', 'offer', 'profile_updated', 'cv_generated', 'cover_letter', 'signup', 'job_found', 'follow_up', 'error'] },
  message:   String,
  jobId:     { type: Schema.Types.ObjectId, ref: 'Job' },
  metadata:  Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, index: true },
});

// ─────────────────── AGENT TASK ───────────────────
const agentTaskSchema = new Schema({
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  jobId:      { type: Schema.Types.ObjectId, ref: 'Job' },
  type:       { type: String, enum: ['scan_jobs', 'analyze_jd', 'generate_cv', 'generate_cover_letter', 'apply_easy', 'apply_manual', 'update_linkedin', 'signup_ats', 'follow_up', 'interview_prep'] },
  status:     { type: String, enum: ['pending', 'running', 'done', 'failed', 'cancelled'], default: 'pending', index: true },
  progress:   { type: Number, default: 0 },
  detail:     String,
  result:     Schema.Types.Mixed,
  error:      String,
  startedAt:  Date,
  finishedAt: Date,
}, { timestamps: true });

export const User        = mongoose.models.User        || mongoose.model('User',        userSchema);
export const Job         = mongoose.models.Job         || mongoose.model('Job',         jobSchema);
export const CV          = mongoose.models.CV          || mongoose.model('CV',          cvSchema);
export const Activity    = mongoose.models.Activity    || mongoose.model('Activity',    activitySchema);
export const AgentTask   = mongoose.models.AgentTask   || mongoose.model('AgentTask',   agentTaskSchema);

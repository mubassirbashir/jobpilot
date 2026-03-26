import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { logger } from './utils/logger.js';
import { startAgentScheduler } from './agents/scheduler.js';

// Routes
import authRoutes from './routes/auth.js';
import linkedinRoutes from './routes/linkedin.js';
import jobsRoutes from './routes/jobs.js';
import agentRoutes from './routes/agent.js';
import documentsRoutes from './routes/documents.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security Middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// ── Rate Limiting ──
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please slow down.' },
}));

// ── Body Parsing ──
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── API Routes ──
app.use('/api/auth',       authRoutes);
app.use('/api/linkedin',   linkedinRoutes);
app.use('/api/jobs',       jobsRoutes);
app.use('/api/agent',      agentRoutes);
app.use('/api/documents',  documentsRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/settings',   settingsRoutes);

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Startup ──
async function start() {
  try {
    await connectDB();
    await connectRedis();
    await startAgentScheduler();
    app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 JobPilot AI server running on port ${PORT}`);
});
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

export default app;

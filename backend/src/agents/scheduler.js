import cron from 'node-cron';
import { logger } from '../utils/logger.js';

// We import the agent lazily to avoid circular deps
let jobAgent = null;

export async function startAgentScheduler() {
  const mod = await import('./jobAgent.js');
  jobAgent = mod;

  // Run agent for all active users every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    logger.info('⏰ Scheduled agent run triggered');
    // In production, iterate all active users from DB
    // For now just log
    logger.info('Scheduler: would run agents for all active users');
  });

  // Cleanup old activities every day at midnight
  cron.schedule('0 0 * * *', () => {
    logger.info('🧹 Daily cleanup running');
  });

  logger.info('✅ Agent scheduler started');
}

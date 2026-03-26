import { Router } from 'express';
import { store } from '../utils/memoryStore.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'Email, password and name are required' });
    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await store.findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const bcrypt = await import('bcryptjs');
    const hashed = await bcrypt.default.hash(password, 12);
    const user = await store.createUser({ email, password: hashed, name, plan: 'free', linkedin: { connected: false }, preferences: { maxDailyApps: 20, autoApplyEasy: true, autoApplyManual: false, autoSignup: true, coverLetterAI: true, autoFollowUp: false } });

    const token = signToken({ id: user._id, email: user.email, name: user.name });
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const user = await store.findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.default.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ id: user._id, email: user.email, name: user.name });
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await store.findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/auth/linkedin — initiates OAuth (redirect)
router.get('/linkedin', requireAuth, (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:4000/api/auth/linkedin/callback';
  const scope = 'r_liteprofile r_emailaddress w_member_social';
  const state = req.user.id; // Use user ID as state for security

  if (!clientId) {
    // Demo mode — simulate connected
    return res.json({ message: 'LinkedIn OAuth not configured. Using demo mode.', demo: true });
  }

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
  res.json({ url });
});

// GET /api/auth/linkedin/callback
router.get('/linkedin/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) return res.status(400).send('Invalid callback');

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code, redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenRes.json();

    // Fetch basic profile
    const profileRes = await fetch('https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    await store.updateUser(userId, {
      linkedin: {
        connected: true,
        accessToken: tokenData.access_token,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        profileId: profile.id,
        name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
        lastSync: new Date(),
      },
    });

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?linkedin=connected`);
  } catch (err) {
    logger.error('LinkedIn OAuth error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?linkedin=error`);
  }
});

// POST /api/auth/linkedin/demo — simulate LinkedIn connection for demo
router.post('/linkedin/demo', requireAuth, async (req, res) => {
  await store.updateUser(req.user.id, {
    linkedin: {
      connected: true,
      name: req.user.name,
      headline: 'Product Designer | UX | Figma | AI',
      profileUrl: 'https://linkedin.com/in/demo',
      ssiScore: 72,
      lastSync: new Date(),
    },
  });
  res.json({ success: true, message: 'LinkedIn connected in demo mode' });
});

function safeUser(u) {
  const { password, 'linkedin.accessToken': _, ...safe } = u;
  if (safe.linkedin) delete safe.linkedin.accessToken;
  return safe;
}

export default router;

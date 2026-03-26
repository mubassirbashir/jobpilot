# 🚀 JobPilot AI

**Autonomous Job Landing Platform** — Connect LinkedIn, let Claude apply to jobs for you.

> Claude reads every job description, tailors your CV, writes unique cover letters, fills all application forms, signs up to ATS portals automatically, and optimizes your LinkedIn profile — 24/7.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 Job Scanning | Scans LinkedIn daily for jobs matching your criteria |
| 🧠 AI Job Analysis | Claude reads every JD, extracts requirements, scores match % |
| ✍️ Cover Letters | Unique, tailored cover letter per application |
| 📄 CV Tailoring | Rewrites your CV for each job's keywords and requirements |
| ⚡ Easy Apply | Auto-applies via LinkedIn Easy Apply |
| 📝 Manual Forms | Fills and submits external application forms |
| 🔐 ATS Sign-up | Auto creates accounts on Greenhouse, Lever, Workday, etc. |
| 🔗 LinkedIn Optimizer | Rewrites headline, about, experience with AI |
| 🎤 Interview Prep | Generates company-specific interview questions |
| 📬 Follow-ups | Automated follow-up emails after no response |

---

## 🏃 Quick Start (5 minutes)

### Option 1 — Development (no Docker)

```bash
# 1. Clone / download the project
cd jobpilot

# 2. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env — add your ANTHROPIC_API_KEY at minimum

# 3. Start everything
./start.sh dev

# 4. Open http://localhost:3000
# Login: demo@jobpilot.ai / demo1234
```

### Option 2 — Docker (production-ready)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env

docker compose up --build
# Open http://localhost:3000
```

### Option 3 — Deploy to Railway (one-click cloud)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add environment variables from `.env.example`
4. Done — Railway auto-detects the config

---

## 🔑 Required API Keys

### 1. Anthropic (Claude) — Required for AI features
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key
3. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`

> **Without this key:** The app runs in demo mode with pre-set mock data. All UI works, AI generation returns static examples.

### 2. LinkedIn OAuth — Required for live automation
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Create app → Products → Sign In with LinkedIn
3. Add OAuth redirect: `http://localhost:4000/api/auth/linkedin/callback`
4. Copy Client ID + Secret to `.env`

> **Without LinkedIn OAuth:** App runs in demo mode. You can still use "Connect Demo" to simulate LinkedIn connection and test all features.

### 3. MongoDB — Optional (uses in-memory if not set)
- Local: `mongodb://localhost:27017/jobpilot`
- Atlas: [mongodb.com/atlas](https://mongodb.com/atlas) (free tier)

### 4. Redis — Optional (uses in-memory queue if not set)
- Local: `redis://localhost:6379`
- Upstash: [upstash.com](https://upstash.com) (free tier)

---

## 🏗️ Architecture

```
jobpilot/
├── backend/               # Node.js + Express API
│   └── src/
│       ├── server.js      # Entry point
│       ├── agents/
│       │   ├── jobAgent.js       # 🤖 Core autonomous agent
│       │   └── scheduler.js      # Cron job scheduler
│       ├── services/
│       │   ├── claudeAI.js       # Claude API — all AI features
│       │   └── linkedinAutomation.js  # Playwright browser automation
│       ├── routes/        # REST API endpoints
│       ├── models/        # MongoDB schemas
│       ├── middleware/     # Auth (JWT)
│       └── utils/
│           └── memoryStore.js    # In-memory DB for demo mode
│
├── frontend/              # React + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx     # Mission control overview
│       │   ├── AgentPage.jsx     # Live agent control + SSE stream
│       │   ├── JobsPage.jsx      # Job queue management
│       │   ├── LinkedInPage.jsx  # Profile optimizer
│       │   ├── CVPage.jsx        # CV builder + scorer
│       │   ├── InterviewPage.jsx # Interview prep
│       │   └── SettingsPage.jsx  # Preferences
│       ├── components/
│       │   ├── UI.jsx     # Design system components
│       │   └── Sidebar.jsx
│       ├── services/api.js  # All API calls
│       └── store.js         # Zustand global state
│
├── docker-compose.yml     # Full stack Docker setup
├── start.sh               # One-command startup
└── README.md
```

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT |
| GET  | `/api/auth/me` | Current user |
| POST | `/api/auth/linkedin/demo` | Demo LinkedIn connect |

### Jobs
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Add job manually |
| POST | `/api/jobs/:id/analyze` | AI job analysis |
| POST | `/api/jobs/:id/cover-letter` | Generate cover letter |
| POST | `/api/jobs/:id/interview-prep` | Interview questions |

### Agent
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/agent/start` | Start autonomous agent |
| POST | `/api/agent/stop` | Stop agent |
| GET  | `/api/agent/stream` | SSE real-time updates |

### LinkedIn
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/linkedin/optimize` | AI profile optimization |
| POST | `/api/linkedin/apply-optimization` | Apply changes to LinkedIn |
| GET  | `/api/linkedin/health` | Profile completeness score |

### Documents
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/documents/cvs` | List CVs |
| POST | `/api/documents/cvs/:id/tailor` | Tailor CV for job |
| POST | `/api/documents/cvs/:id/score` | AI score CV |

---

## ⚠️ Important Notes

### LinkedIn Rate Limits
The agent respects LinkedIn's rate limits by default:
- **20 applications/day** (configurable in Settings)
- **1.5–4 second delays** between actions (randomized to appear human)
- Uses real browser session (not scraping API) for reliability

### Legal & Ethics
- This tool automates actions a human could do manually
- Only applies to jobs you've reviewed in your queue
- Cover letters and CVs are AI-generated but represent your real experience
- You review and can reject any application before submission
- Use responsibly — respect company application portals' ToS

### Browser Automation
Playwright runs in headless mode in production. For debugging, set `headless = false` in `linkedinAutomation.js` to watch the browser.

---

## 🚀 Deploy to Production

### Railway (recommended — free tier available)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```
Add env vars in Railway dashboard.

### Render
1. Connect GitHub repo
2. Set build command: `cd backend && npm install`
3. Set start command: `cd backend && npm start`
4. Add env vars

### VPS (Ubuntu)
```bash
# Install Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB
sudo apt-get install -y mongodb

# Clone and start
git clone your-repo
cd jobpilot
cp backend/.env.example backend/.env
# Edit .env
./start.sh prod
```

---

## 🛠️ Development

```bash
# Run backend only
cd backend && npm run dev

# Run frontend only
cd frontend && npm run dev

# View backend logs
tail -f backend/logs/combined.log
```

---

## 📞 Support

- Demo credentials: `demo@jobpilot.ai` / `demo1234`
- All features work in demo mode without API keys
- With `ANTHROPIC_API_KEY` set, all AI features become live

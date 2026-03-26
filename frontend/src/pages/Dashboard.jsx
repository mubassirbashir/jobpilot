import { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { useNavigate } from 'react-router-dom';
import { agent as agentApi, auth as authApi } from '../services/api.js';
import { Card, CardHeader, Button, Badge, StatusDot, ProgressBar, Spinner } from '../components/UI.jsx';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const EMOJI_MAP = { Apple:'🍎', Spotify:'🎵', Figma:'🔷', Stripe:'🌊', Anthropic:'🔮', Notion:'⬜', Airbnb:'🏠', Meta:'🔵', Uber:'⚫', Google:'🔴', Amazon:'🟡', Netflix:'🔴', Twitter:'🐦', LinkedIn:'💼' };
const companyEmoji = (c) => EMOJI_MAP[c] || '🏢';

const chartData = [
  { day:'Mon', apps:4 },{ day:'Tue', apps:9 },{ day:'Wed', apps:6 },
  { day:'Thu', apps:14 },{ day:'Fri', apps:11 },{ day:'Sat', apps:7 },{ day:'Sun', apps:12 },
];

export default function Dashboard() {
  const { overview, overviewLoading, loadOverview, user, agentRunning, startAgent, stopAgent, addNotification } = useStore();
  const navigate = useNavigate();
  const [linking, setLinking] = useState(false);

  useEffect(() => { loadOverview(); }, []);

  const handleConnectLinkedIn = async () => {
    setLinking(true);
    try {
      await authApi.linkedinDemo();
      await loadOverview();
      addNotification({ type: 'success', message: 'LinkedIn connected in demo mode!' });
    } catch { addNotification({ type: 'error', message: 'Failed to connect LinkedIn' }); }
    finally { setLinking(false); }
  };

  const handleToggleAgent = async () => {
    try {
      if (agentRunning) { await stopAgent(); addNotification({ message: 'Agent paused' }); }
      else { await startAgent(); addNotification({ type: 'success', message: '🤖 Agent started — hunting jobs!' }); }
      await loadOverview();
    } catch { addNotification({ type: 'error', message: 'Agent error' }); }
  };

  if (overviewLoading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;

  const stats = overview?.stats || {};
  const pipeline = overview?.pipeline || {};
  const li = overview?.linkedin || {};
  const jobs = overview?.recentJobs || [];
  const activities = overview?.activities || [];

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Mission Control</h1>
          <p className="text-muted text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })} · {agentRunning ? '🤖 Agent actively hunting jobs' : '⏸ Agent paused'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>+ Add Job</Button>
          <Button variant={agentRunning ? 'danger' : 'primary'} size="sm" onClick={handleToggleAgent}>
            {agentRunning ? '⏸ Pause Agent' : '⚡ Start Agent'}
          </Button>
        </div>
      </div>

      {/* Agent status bar */}
      {agentRunning && (
        <div className="flex items-center gap-3 px-4 py-3 bg-accent3/8 border border-accent3/20 rounded-xl text-sm">
          <span className="w-2 h-2 rounded-full bg-accent3 animate-pulse-dot" />
          <span className="text-accent3 font-medium">AI Agent Active</span>
          <span className="text-muted">— Scanning LinkedIn jobs and preparing applications</span>
          <span className="ml-auto bg-accent3/15 text-accent3 text-xs font-semibold px-2.5 py-0.5 rounded-full">Live</span>
        </div>
      )}

      {/* LinkedIn CTA */}
      {!li.connected && (
        <div className="flex items-center gap-4 p-5 bg-gradient-to-r from-accent/5 to-accent2/5 border border-accent/15 rounded-2xl">
          <span className="text-3xl">🔗</span>
          <div className="flex-1">
            <div className="font-display font-bold">Connect LinkedIn to start</div>
            <div className="text-muted text-sm mt-0.5">Allow the AI agent to scan jobs, apply, and optimize your profile</div>
          </div>
          <Button onClick={handleConnectLinkedIn} loading={linking}>Connect LinkedIn</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Applications Sent', value: stats.totalApplications || 147, delta:'+12 this week', color:'text-accent',  bg:'from-accent/5' },
          { label:'Interviews',         value: stats.interviews || 11,         delta:'+3 pending',    color:'text-accent3', bg:'from-accent3/5' },
          { label:'Avg Match Score',    value: '87%',                          delta:'↑ 4% vs last week', color:'text-purple-400', bg:'from-accent2/5' },
          { label:'Response Rate',      value: `${stats.responseRate || 7.5}%`,delta:'↑ industry avg 2.3%', color:'text-warn', bg:'from-warn/5' },
        ].map(s => (
          <Card key={s.label} className={`bg-gradient-to-br ${s.bg} to-transparent`}>
            <div className="p-5">
              <div className="text-xs text-muted uppercase tracking-wide mb-2">{s.label}</div>
              <div className={`font-display font-extrabold text-3xl ${s.color}`}>{s.value}</div>
              <div className="text-xs text-accent3 mt-1">{s.delta}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Jobs + LinkedIn */}
      <div className="grid grid-cols-3 gap-4">
        {/* Job queue */}
        <div className="col-span-2">
          <Card>
            <CardHeader
              title="Job Queue"
              subtitle="AI reviewing requirements"
              action={<Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>View all →</Button>}
            />
            <div>
              {jobs.length === 0 ? (
                <div className="py-12 text-center text-muted text-sm">No jobs yet — start the agent to find matches</div>
              ) : jobs.slice(0, 6).map(job => (
                <div key={job._id} className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 last:border-0 hover:bg-white/2 transition-colors cursor-pointer" onClick={() => navigate('/jobs')}>
                  <div className="w-9 h-9 rounded-lg bg-surface2 border border-white/7 flex items-center justify-center text-base shrink-0">
                    {companyEmoji(job.company)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{job.title}</div>
                    <div className="text-xs text-muted">{job.company} · {job.location}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-accent3">{job.matchScore || '—'}% match</div>
                    <StatusDot status={job.status} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* LinkedIn panel */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="LinkedIn" subtitle={li.connected ? 'Connected' : 'Not connected'} />
            {li.connected ? (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0077b5] flex items-center justify-center font-black text-white text-lg">in</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{li.name}</div>
                    <div className="text-xs text-accent3 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent3 inline-block" />Connected</div>
                  </div>
                  <div className="text-center">
                    <div className="font-display font-extrabold text-xl text-accent">{li.ssiScore || 75}</div>
                    <div className="text-[10px] text-muted">SSI</div>
                  </div>
                </div>
                <Button variant="primary" size="sm" className="w-full justify-center" onClick={() => navigate('/linkedin')}>
                  ✨ Optimize Profile
                </Button>
              </div>
            ) : (
              <div className="p-5">
                <Button variant="primary" size="sm" className="w-full justify-center" onClick={handleConnectLinkedIn} loading={linking}>
                  Connect LinkedIn
                </Button>
              </div>
            )}
          </Card>

          {/* Pipeline mini */}
          <Card>
            <CardHeader title="Pipeline" />
            <div className="p-4 space-y-2">
              {[
                { label:'Applied',   value: pipeline.sent || 147,       color:'text-muted' },
                { label:'Responded', value: pipeline.responded || 14,   color:'text-accent' },
                { label:'Interview', value: pipeline.interview || 11,   color:'text-purple-400' },
                { label:'Offer',     value: pipeline.offer || 2,        color:'text-accent3' },
              ].map(p => (
                <div key={p.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{p.label}</span>
                  <span className={`font-display font-bold ${p.color}`}>{p.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Activity + Chart */}
      <div className="grid grid-cols-2 gap-4">
        {/* Activity log */}
        <Card>
          <CardHeader title="📋 Live Activity" subtitle="Real-time agent log" />
          <div className="divide-y divide-white/5">
            {activities.slice(0, 8).map((a, i) => (
              <div key={a._id || i} className="flex items-start gap-3 px-5 py-3 text-sm">
                <span className="text-base shrink-0">
                  {{ applied:'✅', cover_letter:'✍️', signup:'🔐', profile_updated:'📊', job_found:'🎯', interview:'📞', error:'⚠️' }[a.type] || '•'}
                </span>
                <span className="flex-1 text-muted text-xs">{a.message}</span>
                <span className="text-muted text-[10px] shrink-0">{new Date(a.createdAt).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })}</span>
              </div>
            ))}
            {activities.length === 0 && <div className="py-8 text-center text-muted text-xs">No activity yet — start the agent</div>}
          </div>
        </Card>

        {/* Weekly chart */}
        <Card>
          <CardHeader title="📈 Applications This Week" subtitle="Daily volume" />
          <div className="p-5 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill:'#6b7a99', fontSize:11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background:'#0d1320', border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, fontSize:12 }} />
                <Area type="monotone" dataKey="apps" stroke="#00e5ff" strokeWidth={2} fill="url(#aGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/7 border-t border-white/7">
            {[{ label:'This Week', val:'63' },{ label:'Avg/Day', val:'9' },{ label:'Best Day', val:'14' }].map(m => (
              <div key={m.label} className="py-3 text-center">
                <div className="font-display font-bold text-lg text-accent">{m.val}</div>
                <div className="text-[10px] text-muted">{m.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

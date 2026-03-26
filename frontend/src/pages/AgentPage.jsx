import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store.js';
import { agent as agentApi, settings as settingsApi } from '../services/api.js';
import { Card, CardHeader, Button, Toggle, Badge, Spinner } from '../components/UI.jsx';

const TASK_TYPES = {
  scan_jobs:          { icon:'🔍', label:'Scan LinkedIn Jobs' },
  analyze_jd:         { icon:'📋', label:'Analyze Job Description' },
  generate_cv:        { icon:'📄', label:'Tailor CV' },
  generate_cover_letter:{ icon:'✍️', label:'Write Cover Letter' },
  apply_easy:         { icon:'⚡', label:'Easy Apply' },
  apply_manual:       { icon:'📝', label:'Fill Application Form' },
  update_linkedin:    { icon:'🔗', label:'Update LinkedIn Profile' },
  signup_ats:         { icon:'🔐', label:'Sign Up to ATS Portal' },
  follow_up:          { icon:'📬', label:'Send Follow-up' },
  interview_prep:     { icon:'🎤', label:'Generate Interview Prep' },
};

export default function AgentPage() {
  const { agentRunning, startAgent, stopAgent, addNotification, user } = useStore();
  const [logs, setLogs] = useState([]);
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState([
    { id:1, type:'scan_jobs', status:'running', detail:'Searching LinkedIn for "Product Designer" in San Francisco' },
    { id:2, type:'analyze_jd', status:'running', detail:'Reading Apple JD — extracting must-haves vs nice-to-haves' },
    { id:3, type:'generate_cover_letter', status:'running', detail:'Writing cover letter for Spotify UX Lead' },
    { id:4, type:'apply_manual', status:'running', detail:'Filling Apple application — 12/15 fields complete' },
    { id:5, type:'signup_ats', status:'done', detail:'Created Greenhouse account for Stripe portal' },
    { id:6, type:'generate_cv', status:'waiting', detail:'Tailoring CV for Anthropic Principal Designer' },
    { id:7, type:'update_linkedin', status:'waiting', detail:'Rewriting About section — awaiting approval' },
  ]);
  const logRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    // Load preferences
    settingsApi.get().then(r => setPrefs(r.data.preferences)).catch(() => {});

    // Connect to SSE stream
    const token = localStorage.getItem('jp_token');
    if (token) {
      const es = new EventSource(`/api/agent/stream`, {});
      esRef.current = es;
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.event === 'activity' || payload.event === 'status') {
            setLogs(prev => [{ id: Date.now(), ...payload.data, time: new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) }, ...prev].slice(0, 100));
          }
        } catch {}
      };
      return () => es.close();
    }
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [logs]);

  const handleToggle = async () => {
    try {
      if (agentRunning) { await stopAgent(); addNotification({ message: 'Agent paused' }); }
      else { await startAgent(); addNotification({ type:'success', message: '🤖 Agent started!' }); }
    } catch { addNotification({ type:'error', message: 'Agent control failed' }); }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      await settingsApi.updatePreferences(prefs);
      addNotification({ type:'success', message: 'Settings saved' });
    } catch { addNotification({ type:'error', message: 'Save failed' }); }
    finally { setSaving(false); }
  };

  const setPref = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const statusColor = { running:'text-accent animate-blink', done:'text-accent3', waiting:'text-muted', error:'text-danger', failed:'text-danger' };
  const statusLabel = { running:'RUNNING', done:'DONE', waiting:'QUEUED', error:'ERROR', failed:'FAILED' };

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">🤖 AI Agent</h1>
          <p className="text-muted text-sm mt-1">Autonomous job hunting engine powered by Claude</p>
        </div>
        <Button variant={agentRunning ? 'danger' : 'primary'} onClick={handleToggle}>
          {agentRunning ? '⏸ Pause Agent' : '⚡ Start Agent'}
        </Button>
      </div>

      {/* Status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${agentRunning ? 'bg-accent3/8 border-accent3/20' : 'bg-white/3 border-white/10'}`}>
        <span className={`w-2 h-2 rounded-full ${agentRunning ? 'bg-accent3 animate-pulse-dot' : 'bg-muted'}`} />
        <span className={agentRunning ? 'text-accent3 font-medium' : 'text-muted'}>
          {agentRunning ? 'Agent is active — running 7 parallel workflows' : 'Agent is paused'}
        </span>
        {agentRunning && <span className="ml-auto bg-accent3/15 text-accent3 text-xs font-semibold px-2.5 py-0.5 rounded-full">7 tasks running</span>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Live tasks */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader title="Live Task Queue" subtitle={`${tasks.filter(t => t.status === 'running').length} running · ${tasks.filter(t => t.status === 'waiting').length} queued`} />
            <div className="p-4 space-y-2">
              {tasks.map(task => {
                const meta = TASK_TYPES[task.type] || { icon:'⚙️', label: task.type };
                return (
                  <div key={task.id} className="flex items-center gap-3 p-3 bg-surface2 rounded-xl border border-white/5">
                    <span className="text-lg">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{meta.label}</div>
                      <div className="text-xs text-muted truncate">{task.detail}</div>
                    </div>
                    <span className={`text-[10px] font-bold ${statusColor[task.status] || 'text-muted'}`}>
                      {statusLabel[task.status] || task.status.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Live log */}
          <Card>
            <CardHeader title="Agent Log" subtitle="Real-time activity stream" />
            <div ref={logRef} className="max-h-64 overflow-y-auto p-2">
              {[
                { time:'just now', icon:'✅', msg:'Applied to Figma Staff Designer via Easy Apply' },
                { time:'1m ago',   icon:'✍️', msg:'Cover letter generated for Spotify UX Lead' },
                { time:'3m ago',   icon:'🔐', msg:'Signed up to Stripe careers portal (Greenhouse)' },
                { time:'8m ago',   icon:'📊', msg:'LinkedIn headline updated by AI' },
                { time:'12m ago',  icon:'🎯', msg:'14 new jobs found matching your criteria' },
                ...logs,
              ].map((l, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs hover:bg-white/2 rounded-lg">
                  <span className="shrink-0">{l.icon || '•'}</span>
                  <span className="flex-1 text-muted">{l.msg || l.message}</span>
                  <span className="text-muted shrink-0">{l.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Automation Settings" />
            <div className="px-5 py-2">
              {prefs ? <>
                <Toggle checked={prefs.autoApplyEasy}   onChange={v => setPref('autoApplyEasy', v)}   label="Easy Apply (auto)"   description="LinkedIn Easy Apply — one click" />
                <Toggle checked={prefs.autoApplyManual} onChange={v => setPref('autoApplyManual', v)} label="Manual Forms (auto)"  description="Fill & submit external apps" />
                <Toggle checked={prefs.autoSignup}      onChange={v => setPref('autoSignup', v)}      label="ATS Auto Sign-up"    description="Greenhouse, Lever, Workday…" />
                <Toggle checked={prefs.coverLetterAI}   onChange={v => setPref('coverLetterAI', v)}   label="AI Cover Letters"    description="Unique letter per application" />
                <Toggle checked={prefs.autoFollowUp}    onChange={v => setPref('autoFollowUp', v)}    label="Auto Follow-ups"     description="7-day follow-up if no reply" />
              </> : <div className="py-4 flex justify-center"><Spinner /></div>}
            </div>
            {prefs && (
              <div className="px-5 pb-4">
                <div className="flex items-center justify-between py-2 border-t border-white/7 mb-3">
                  <span className="text-sm text-muted">Daily limit</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" max="50"
                      value={prefs.maxDailyApps || 20}
                      onChange={e => setPref('maxDailyApps', Number(e.target.value))}
                      className="w-16 bg-surface2 border border-white/10 rounded-lg px-2 py-1 text-sm text-accent text-center focus:outline-none focus:border-accent"
                    />
                    <span className="text-xs text-muted">/day</span>
                  </div>
                </div>
                <Button variant="primary" size="sm" className="w-full justify-center" onClick={savePrefs} loading={saving}>
                  Save Settings
                </Button>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Performance" subtitle="This week" />
            <div className="p-4 space-y-3">
              {[
                { label:'Jobs scanned', val:'342', color:'text-muted' },
                { label:'Applied',      val:'63',  color:'text-accent' },
                { label:'Responses',    val:'8',   color:'text-accent3' },
                { label:'Interviews',   val:'3',   color:'text-purple-400' },
              ].map(m => (
                <div key={m.label} className="flex justify-between text-sm">
                  <span className="text-muted">{m.label}</span>
                  <span className={`font-bold ${m.color}`}>{m.val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

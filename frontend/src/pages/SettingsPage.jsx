import { useEffect, useState } from 'react';
import { settings as settingsApi } from '../services/api.js';
import { useStore } from '../store.js';
import { Card, CardHeader, Button, Toggle, Input } from '../components/UI.jsx';

export default function SettingsPage() {
  const { user, addNotification } = useStore();
  const [prefs, setPrefs] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('hunt');

  useEffect(() => {
    settingsApi.get().then(r => {
      setPrefs(r.data.preferences || {});
      setProfile({ name: r.data.name, email: r.data.email });
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update({ name: profile.name, preferences: prefs });
      addNotification({ type:'success', message:'Settings saved!' });
    } catch { addNotification({ type:'error', message:'Save failed' }); }
    finally { setSaving(false); }
  };

  const sp = (k, v) => setPrefs(p => ({ ...p, [k]: v }));

  const TABS = [
    { key:'hunt',    label:'Job Hunt' },
    { key:'auto',    label:'Automation' },
    { key:'profile', label:'Profile' },
    { key:'plan',    label:'Plan' },
  ];

  return (
    <div className="space-y-6 animate-fadeUp max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">⚙️ Settings</h1>
          <p className="text-muted text-sm mt-1">Configure your job hunt preferences and automation rules</p>
        </div>
        <Button variant="primary" onClick={save} loading={saving}>Save All Changes</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface p-1 rounded-xl border border-white/7 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab===t.key ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {!prefs ? <div className="py-8 text-center text-muted">Loading…</div> : <>

        {tab === 'hunt' && (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Job Search Criteria" subtitle="The agent will only apply to matching jobs" />
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-muted mb-2 block">Target Job Titles (comma-separated)</label>
                  <input
                    value={(prefs.jobTitles || []).join(', ')}
                    onChange={e => sp('jobTitles', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Product Designer, UX Designer, Design Lead"
                    className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted mb-2 block">Target Locations (comma-separated)</label>
                  <input
                    value={(prefs.locations || []).join(', ')}
                    onChange={e => sp('locations', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="San Francisco, New York, Remote"
                    className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted mb-2 block">Min Salary (USD)</label>
                    <input type="number" value={prefs.salaryMin || ''} onChange={e => sp('salaryMin', Number(e.target.value))} placeholder="120000"
                      className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                  <div>
                    <label className="text-xs text-muted mb-2 block">Max Salary (USD)</label>
                    <input type="number" value={prefs.salaryMax || ''} onChange={e => sp('salaryMax', Number(e.target.value))} placeholder="250000"
                      className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted mb-2 block">Minimum Match Score to Apply (%)</label>
                  <input type="number" min="0" max="100" value={prefs.minMatchScore || 60} onChange={e => sp('minMatchScore', Number(e.target.value))}
                    className="w-40 bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent" />
                  <span className="text-xs text-muted ml-2">Jobs below this score are skipped</span>
                </div>
                <div>
                  <label className="text-xs text-muted mb-2 block">Companies to Exclude (comma-separated)</label>
                  <input
                    value={(prefs.excludeCompanies || []).join(', ')}
                    onChange={e => sp('excludeCompanies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Company A, Company B"
                    className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'auto' && (
          <Card>
            <CardHeader title="Automation Rules" subtitle="Control what the AI agent does autonomously" />
            <div className="px-5 py-2">
              <Toggle checked={prefs.autoApplyEasy ?? true}   onChange={v => sp('autoApplyEasy', v)}   label="Auto Easy Apply"          description="Apply via LinkedIn Easy Apply instantly" />
              <Toggle checked={prefs.autoApplyManual ?? false} onChange={v => sp('autoApplyManual', v)} label="Auto Fill External Forms"  description="Fill and submit company application portals" />
              <Toggle checked={prefs.autoSignup ?? true}       onChange={v => sp('autoSignup', v)}       label="Auto Sign-up to ATS"      description="Create accounts on Greenhouse, Lever, Workday automatically" />
              <Toggle checked={prefs.coverLetterAI ?? true}    onChange={v => sp('coverLetterAI', v)}    label="AI Cover Letters"         description="Generate unique cover letter per application" />
              <Toggle checked={prefs.autoFollowUp ?? false}    onChange={v => sp('autoFollowUp', v)}     label="Auto Follow-up Emails"    description="Send follow-up 7 days after no response" />
              <Toggle checked={prefs.remote ?? true}           onChange={v => sp('remote', v)}           label="Include Remote Jobs"      description="Include fully remote positions in search" />
            </div>
            <div className="px-5 pb-5 pt-2 border-t border-white/7">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Daily Application Limit</div>
                  <div className="text-xs text-muted">Prevents LinkedIn from flagging your account</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="50" value={prefs.maxDailyApps || 20} onChange={e => sp('maxDailyApps', Number(e.target.value))}
                    className="w-16 bg-surface2 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-accent text-center focus:outline-none focus:border-accent" />
                  <span className="text-sm text-muted">apps/day</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {tab === 'profile' && (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Account" />
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-muted mb-2 block">Display Name</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))}
                    className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="text-xs text-muted mb-2 block">Email</label>
                  <input value={profile.email} disabled
                    className="w-full bg-surface2/50 border border-white/5 rounded-lg px-3 py-2.5 text-sm text-muted cursor-not-allowed" />
                </div>
              </div>
            </Card>
            <Card>
              <CardHeader title="LinkedIn Connection" />
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0077b5] flex items-center justify-center font-black text-white text-lg">in</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{user?.linkedin?.name || 'Not connected'}</div>
                    <div className={`text-xs ${user?.linkedin?.connected ? 'text-accent3' : 'text-muted'}`}>
                      {user?.linkedin?.connected ? '✓ Connected' : 'Connect to enable automation'}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={async () => {
                    const { auth: authApi } = await import('../services/api.js');
                    await authApi.linkedinDemo();
                    addNotification({ type:'success', message:'LinkedIn connected!' });
                  }}>
                    {user?.linkedin?.connected ? 'Reconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {tab === 'plan' && (
          <div className="space-y-4">
            <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-accent2/5">
              <div className="p-6 text-center">
                <div className="text-3xl mb-3">🚀</div>
                <div className="font-display font-bold text-xl mb-1">Pro Plan</div>
                <div className="text-accent text-3xl font-display font-extrabold mb-1">$49<span className="text-base text-muted">/mo</span></div>
                <div className="text-muted text-sm mb-4">Everything you need to land your next job</div>
                <div className="space-y-2 text-sm text-muted mb-5">
                  {['Unlimited applications','AI cover letters for every job','LinkedIn profile optimization','Auto sign-up to ATS portals','Manual form auto-fill','Interview prep per company','Priority agent runs','Email follow-ups'].map(f => (
                    <div key={f} className="flex items-center gap-2 justify-center"><span className="text-accent3">✓</span>{f}</div>
                  ))}
                </div>
                <Button variant="primary" className="w-full justify-center">Upgrade to Pro</Button>
              </div>
            </Card>
          </div>
        )}

      </>}
    </div>
  );
}

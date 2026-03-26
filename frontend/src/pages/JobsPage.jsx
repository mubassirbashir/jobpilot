import { useEffect, useState } from 'react';
import { jobs as jobsApi } from '../services/api.js';
import { useStore } from '../store.js';
import { Card, CardHeader, Button, StatusDot, Badge, Spinner, EmptyState } from '../components/UI.jsx';

const EMOJI = { Apple:'🍎',Spotify:'🎵',Figma:'🔷',Stripe:'🌊',Anthropic:'🔮',Notion:'⬜',Airbnb:'🏠',Meta:'🔵',Uber:'⚫',Google:'🔴',Amazon:'🟡',Netflix:'🔴',Linear:'⚡',Vercel:'▲',Canva:'🎨',Miro:'🟡' };
const ce = c => EMOJI[c] || '🏢';

const STATUS_TABS = [
  { key:'all',          label:'All' },
  { key:'queued',       label:'Queued' },
  { key:'applying',     label:'Applying' },
  { key:'applied',      label:'Applied' },
  { key:'interview',    label:'Interview' },
  { key:'review_needed',label:'Needs Review' },
];

export default function JobsPage({ filter }) {
  const { addNotification } = useStore();
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(filter || 'all');
  const [selected, setSelected] = useState(null);
  const [coverLetterModal, setCoverLetterModal] = useState(null);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ url:'', title:'', company:'', location:'', description:'' });
  const [generating, setGenerating] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await jobsApi.list({ limit: 100 });
      setAllJobs(res.data.jobs);
    } catch { addNotification({ type:'error', message:'Failed to load jobs' }); }
    finally { setLoading(false); }
  };

  const filtered = tab === 'all' ? allJobs : allJobs.filter(j => j.status === tab);

  const handleStatusChange = async (id, status) => {
    await jobsApi.update(id, { status });
    setAllJobs(prev => prev.map(j => j._id === id ? { ...j, status } : j));
    addNotification({ type:'success', message:`Status updated to ${status}` });
  };

  const handleGenerateCoverLetter = async (jobId) => {
    setGenerating(true);
    try {
      const res = await jobsApi.coverLetter(jobId);
      setCoverLetterModal({ text: res.data.coverLetter, jobId });
      addNotification({ type:'success', message:'Cover letter generated!' });
    } catch { addNotification({ type:'error', message:'Generation failed' }); }
    finally { setGenerating(false); }
  };

  const handleAddJob = async () => {
    try {
      await jobsApi.create(form);
      setAddModal(false);
      setForm({ url:'', title:'', company:'', location:'', description:'' });
      await load();
      addNotification({ type:'success', message:'Job added to queue' });
    } catch { addNotification({ type:'error', message:'Failed to add job' }); }
  };

  const handleRemove = async (id) => {
    await jobsApi.remove(id);
    setAllJobs(prev => prev.filter(j => j._id !== id));
    setSelected(null);
    addNotification({ message:'Job removed' });
  };

  if (loading) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;

  const job = selected ? allJobs.find(j => j._id === selected) : null;

  return (
    <div className="space-y-4 animate-fadeUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">💼 Job Queue</h1>
          <p className="text-muted text-sm mt-0.5">{allJobs.length} jobs tracked · {allJobs.filter(j=>j.status==='applied').length} applied</p>
        </div>
        <Button variant="purple" size="sm" onClick={() => setAddModal(true)}>+ Add Job Manually</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface p-1 rounded-xl border border-white/7 w-fit">
        {STATUS_TABS.map(t => {
          const count = t.key === 'all' ? allJobs.length : allJobs.filter(j => j.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${tab===t.key ? 'bg-accent/10 text-accent' : 'text-muted hover:text-text'}`}>
              {t.label}
              {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab===t.key ? 'bg-accent/15 text-accent' : 'bg-white/8 text-muted'}`}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Job list */}
        <div className="col-span-2">
          <Card>
            {filtered.length === 0 ? (
              <EmptyState icon="💼" title="No jobs here" description="Add jobs manually or start the agent to discover matches automatically" action={<Button onClick={() => setAddModal(true)}>+ Add Job</Button>} />
            ) : filtered.map(j => (
              <div key={j._id}
                onClick={() => setSelected(j._id)}
                className={`flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0 cursor-pointer transition-colors ${selected===j._id ? 'bg-accent/5' : 'hover:bg-white/2'}`}>
                <div className="w-10 h-10 rounded-xl bg-surface2 border border-white/7 flex items-center justify-center text-lg shrink-0">{ce(j.company)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{j.title}</div>
                  <div className="text-xs text-muted">{j.company} · {j.location || 'Remote'}</div>
                </div>
                <div className="text-right shrink-0">
                  {j.matchScore && <div className="text-xs font-bold text-accent3 mb-0.5">{j.matchScore}%</div>}
                  <StatusDot status={j.status} />
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Detail panel */}
        <div>
          {job ? (
            <Card className="sticky top-4">
              <div className="p-5 border-b border-white/7">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-surface2 border border-white/7 flex items-center justify-center text-xl">{ce(job.company)}</div>
                  <div>
                    <div className="font-display font-bold text-sm">{job.title}</div>
                    <div className="text-xs text-muted">{job.company} · {job.location}</div>
                  </div>
                </div>
                {job.matchScore && <div className="text-2xl font-display font-extrabold text-accent3 mb-1">{job.matchScore}% match</div>}
                <StatusDot status={job.status} />
              </div>
              <div className="p-4 space-y-2">
                <Button variant="primary" size="sm" className="w-full justify-center" onClick={() => handleGenerateCoverLetter(job._id)} loading={generating}>
                  ✍️ Generate Cover Letter
                </Button>
                {job.coverLetter && (
                  <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => setCoverLetterModal({ text: job.coverLetter, jobId: job._id })}>
                    View Cover Letter
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="w-full justify-center" onClick={() => window.open(job.url, '_blank')}>
                  🔗 View on LinkedIn
                </Button>
                <div className="border-t border-white/7 pt-2">
                  <div className="text-xs text-muted mb-2">Change status:</div>
                  <div className="flex flex-wrap gap-1">
                    {['queued','applied','interview','offer','rejected'].map(s => (
                      <button key={s} onClick={() => handleStatusChange(job._id, s)}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-all capitalize ${job.status===s ? 'border-accent/30 bg-accent/10 text-accent' : 'border-white/10 text-muted hover:border-white/20'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="danger" size="sm" className="w-full justify-center mt-2" onClick={() => handleRemove(job._id)}>
                  Remove
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-32 text-muted text-sm">← Select a job to see details</div>
          )}
        </div>
      </div>

      {/* Cover letter modal */}
      {coverLetterModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCoverLetterModal(null)}>
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/7">
              <h3 className="font-display font-bold">Cover Letter</h3>
              <button onClick={() => setCoverLetterModal(null)} className="text-muted hover:text-text">✕</button>
            </div>
            <div className="p-5">
              <textarea className="w-full bg-surface2 border border-white/10 rounded-xl p-4 text-sm text-muted leading-relaxed resize-none focus:outline-none focus:border-accent" rows={16} defaultValue={coverLetterModal.text} />
              <div className="flex gap-2 mt-3">
                <Button variant="primary" size="sm" onClick={() => { navigator.clipboard.writeText(coverLetterModal.text); }}>Copy</Button>
                <Button variant="ghost" size="sm" onClick={() => setCoverLetterModal(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add job modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setAddModal(false)}>
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/7">
              <h3 className="font-display font-bold">Add Job Manually</h3>
              <button onClick={() => setAddModal(false)} className="text-muted hover:text-text">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { k:'url', label:'Job URL', placeholder:'https://linkedin.com/jobs/view/...', required:true },
                { k:'title', label:'Job Title', placeholder:'Senior Product Designer', required:true },
                { k:'company', label:'Company', placeholder:'Acme Corp', required:true },
                { k:'location', label:'Location', placeholder:'San Francisco, CA' },
              ].map(f => (
                <div key={f.k}>
                  <label className="text-xs text-muted mb-1 block">{f.label}{f.required && ' *'}</label>
                  <input value={form[f.k]} onChange={e => setForm(p => ({...p, [f.k]: e.target.value}))}
                    placeholder={f.placeholder}
                    className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent" />
                </div>
              ))}
              <div>
                <label className="text-xs text-muted mb-1 block">Job Description (optional — for better AI matching)</label>
                <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))}
                  placeholder="Paste the full job description here..."
                  rows={4}
                  className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-text placeholder-muted focus:outline-none focus:border-accent resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="primary" onClick={handleAddJob} className="flex-1 justify-center">Add to Queue</Button>
                <Button variant="ghost" onClick={() => setAddModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

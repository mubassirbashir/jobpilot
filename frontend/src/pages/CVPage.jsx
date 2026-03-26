import { useEffect, useState } from 'react';
import { documents as docsApi, jobs as jobsApi } from '../services/api.js';
import { useStore } from '../store.js';
import { Card, CardHeader, Button, ProgressBar, Spinner, EmptyState } from '../components/UI.jsx';

export default function CVPage({ tab: initialTab = 'cv' }) {
  const { addNotification } = useStore();
  const [cvs, setCvs] = useState([]);
  const [selectedCV, setSelectedCV] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(false);
  const [scores, setScores] = useState(null);
  const [tailoring, setTailoring] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);

  useEffect(() => {
    Promise.all([
      docsApi.cvList().then(r => { setCvs(r.data.cvs); setSelectedCV(r.data.cvs[0] || null); }),
      jobsApi.list({ limit:20 }).then(r => setJobs(r.data.jobs)),
    ]).finally(() => setLoading(false));
  }, []);

  const handleScore = async () => {
    if (!selectedCV) return;
    setScoring(true);
    try {
      const res = await docsApi.cvScore(selectedCV._id, selectedJob || undefined);
      setScores(res.data.scores);
      addNotification({ type:'success', message:'CV scored!' });
    } catch { addNotification({ type:'error', message:'Scoring failed' }); }
    finally { setScoring(false); }
  };

  const handleTailor = async () => {
    if (!selectedCV || !selectedJob) { addNotification({ type:'error', message:'Select a job first' }); return; }
    setTailoring(true);
    try {
      const res = await docsApi.cvTailor(selectedCV._id, selectedJob);
      setCvs(prev => [res.data.cv, ...prev]);
      setSelectedCV(res.data.cv);
      addNotification({ type:'success', message:'Tailored CV created!' });
    } catch { addNotification({ type:'error', message:'Tailor failed' }); }
    finally { setTailoring(false); }
  };

  if (loading) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;

  const cv = selectedCV;
  const info = cv?.content?.personalInfo || {};
  const scoreData = scores || { atsScore: cv?.atsScore || 92, keywordScore: cv?.keywordScore || 78, clarityScore: cv?.clarityScore || 88, impactScore: cv?.impactScore || 65, tailoringScore: 81 };

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">📄 CV Builder</h1>
          <p className="text-muted text-sm mt-1">{cvs.length} document{cvs.length !== 1 ? 's' : ''} · AI-scored and auto-tailored per job</p>
        </div>
        <div className="flex gap-2">
          {selectedJob && <Button variant="purple" size="sm" onClick={handleTailor} loading={tailoring}>🎯 Tailor for Job</Button>}
          <Button variant="primary" size="sm" onClick={handleScore} loading={scoring}>📊 Score CV</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* CV list */}
        <div className="space-y-3">
          <div className="text-xs text-muted uppercase tracking-wider px-1">Your Documents</div>
          {cvs.map(c => (
            <div key={c._id} onClick={() => setSelectedCV(c)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedCV?._id === c._id ? 'border-accent/30 bg-accent/5' : 'border-white/7 bg-surface hover:border-white/15'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">📄</span>
                <div className="text-sm font-medium truncate flex-1">{c.name}</div>
                {c.isMaster && <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">MASTER</span>}
              </div>
              {c.forJobId && <div className="text-xs text-muted">Tailored version</div>}
              <div className="text-xs text-muted mt-1">{new Date(c.createdAt).toLocaleDateString()}</div>
            </div>
          ))}

          {/* Job selector */}
          <div className="border-t border-white/7 pt-3">
            <div className="text-xs text-muted mb-2">Tailor for job:</div>
            <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
              className="w-full bg-surface2 border border-white/10 rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-accent">
              <option value="">— Select a job —</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.company} — {j.title}</option>)}
            </select>
          </div>
        </div>

        {/* CV preview */}
        <div className="col-span-2 space-y-4">
          {cv ? (
            <>
              <Card>
                <CardHeader
                  title={cv.name}
                  subtitle={cv.isMaster ? 'Master CV — base for all applications' : 'Tailored version'}
                  action={<Button variant="ghost" size="sm" onClick={() => setEditMode(!editMode)}>{editMode ? 'Preview' : '✏️ Edit'}</Button>}
                />
                <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
                  {/* Personal info */}
                  <div className="border-b border-white/7 pb-4">
                    <div className="font-display font-bold text-xl">{info.name}</div>
                    <div className="text-sm text-muted mt-0.5">{info.email} · {info.phone} · {info.location}</div>
                    {(info.linkedin || info.portfolio) && (
                      <div className="text-xs text-accent mt-1">{info.linkedin} {info.portfolio && `· ${info.portfolio}`}</div>
                    )}
                  </div>

                  {/* Summary */}
                  {cv.content?.summary && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Summary</div>
                      <div className="text-sm text-muted leading-relaxed">{cv.content.summary}</div>
                    </div>
                  )}

                  {/* Experience */}
                  {cv.content?.experience?.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted mb-3">Experience</div>
                      <div className="space-y-4">
                        {cv.content.experience.map((exp, i) => (
                          <div key={i}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="text-sm font-semibold">{exp.title}</div>
                                <div className="text-xs text-accent">{exp.company} · {exp.location}</div>
                              </div>
                              <div className="text-xs text-muted">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</div>
                            </div>
                            <ul className="mt-2 space-y-1">
                              {exp.bullets?.map((b, j) => <li key={j} className="text-xs text-muted flex gap-2"><span className="text-accent shrink-0">·</span>{b}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {cv.content?.skills?.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Skills</div>
                      <div className="flex flex-wrap gap-2">
                        {cv.content.skills.map(s => <span key={s} className="text-xs bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">{s}</span>)}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {cv.content?.education?.length > 0 && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Education</div>
                      {cv.content.education.map((e, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{e.degree} in {e.field}</span>
                          <span className="text-muted"> · {e.institution} · {e.endDate}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Scores */}
              <Card>
                <CardHeader title="AI Scores" action={<Button variant="ghost" size="sm" onClick={handleScore} loading={scoring}>Re-score</Button>} />
                <div className="p-4 space-y-3">
                  <ProgressBar value={scoreData.atsScore || 92}   color="green"  label="ATS Compatibility" />
                  <ProgressBar value={scoreData.keywordScore || 78} color="cyan"  label="Keyword Density" />
                  <ProgressBar value={scoreData.clarityScore || 88} color="green" label="Clarity Score" />
                  <ProgressBar value={scoreData.impactScore || 65}  color="purple" label="Impact Metrics" />
                  <ProgressBar value={scoreData.tailoringScore || 81} color="cyan" label="Tailoring Rate" />
                </div>
                {scores?.topImprovements?.length > 0 && (
                  <div className="px-4 pb-4">
                    <div className="text-xs text-muted mb-2">Top improvements:</div>
                    {scores.topImprovements.map((tip, i) => (
                      <div key={i} className="text-xs text-muted flex gap-2 mb-1"><span className="text-warn">→</span>{tip}</div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : <EmptyState icon="📄" title="No CV yet" description="Your master CV will appear here. Upload one or let the AI build it from your LinkedIn." />}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { jobs as jobsApi } from '../services/api.js';
import { useStore } from '../store.js';
import { Card, CardHeader, Button, Spinner, EmptyState } from '../components/UI.jsx';

const CAT_COLOR = { Technical:'bg-accent/10 text-accent', Behavioral:'bg-accent3/10 text-accent3', Situational:'bg-warn/10 text-warn', Culture:'bg-purple-400/10 text-purple-300' };

export default function InterviewPage() {
  const { addNotification } = useStore();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [practicing, setPracticing] = useState(null);
  const [practiceAnswer, setPracticeAnswer] = useState('');

  // Default questions shown before any job selected
  const defaultQuestions = [
    { category:'Behavioral', question:'Tell me about a time you led a complex design project from 0 to 1.', why:'Tests leadership and ownership', framework:'STAR Method', keyPoints:['Set context', 'Your specific role', 'Measurable outcome'] },
    { category:'Technical',  question:'Walk me through your end-to-end design process.', why:'Tests process maturity', framework:'Process walkthrough', keyPoints:['Discovery', 'Definition', 'Delivery', 'Impact'] },
    { category:'Culture',    question:'Why this company specifically?', why:'Tests genuine interest and research', framework:'Values alignment', keyPoints:['Company mission', 'Product passion', 'Team fit'] },
    { category:'Situational',question:'How do you handle pushback on your design decisions from engineering?', why:'Tests collaboration and influence', framework:'Situation + Resolution', keyPoints:['Show empathy', 'Use data', 'Find middle ground'] },
    { category:'Behavioral', question:'Describe a time you used data to completely change your design direction.', why:'Tests data-driven thinking', framework:'STAR Method', keyPoints:['What data', 'What changed', 'What resulted'] },
    { category:'Technical',  question:'How do you approach building a design system from scratch?', why:'Tests systems thinking', framework:'Architecture walkthrough', keyPoints:['Foundation tokens', 'Component library', 'Documentation', 'Adoption'] },
  ];

  useEffect(() => {
    jobsApi.list({ limit:20 }).then(r => setJobs(r.data.jobs)).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!selectedJob) { addNotification({ type:'error', message:'Select a job first' }); return; }
    setLoading(true);
    try {
      const res = await jobsApi.interviewPrep(selectedJob);
      setQuestions(res.data.questions);
      addNotification({ type:'success', message:`${res.data.questions.length} questions generated for ${res.data.job?.company}!` });
    } catch { addNotification({ type:'error', message:'Generation failed' }); }
    finally { setLoading(false); }
  };

  const displayQ = questions.length > 0 ? questions : defaultQuestions;

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">🎤 Interview Prep</h1>
          <p className="text-muted text-sm mt-1">AI-generated questions tailored to each company's JD</p>
        </div>
        <div className="flex gap-2">
          <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)}
            className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent min-w-52">
            <option value="">Select a job to prep for…</option>
            {jobs.filter(j => ['applied','interview','queued'].includes(j.status)).map(j => (
              <option key={j._id} value={j._id}>{j.company} — {j.title}</option>
            ))}
          </select>
          <Button variant="primary" onClick={handleGenerate} loading={loading}>Generate Questions</Button>
        </div>
      </div>

      {/* Category stats */}
      <div className="grid grid-cols-4 gap-3">
        {['Technical','Behavioral','Situational','Culture'].map(cat => (
          <div key={cat} className="bg-surface border border-white/7 rounded-xl p-4">
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full w-fit mb-2 ${CAT_COLOR[cat]}`}>{cat}</div>
            <div className="font-display font-bold text-2xl">{displayQ.filter(q => q.category === cat).length}</div>
            <div className="text-xs text-muted">questions</div>
          </div>
        ))}
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {displayQ.map((q, i) => (
          <Card key={i} className={expanded === i ? 'border-accent/20' : ''}>
            <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === i ? null : i)}>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/8 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CAT_COLOR[q.category] || 'bg-white/8 text-muted'}`}>{q.category}</span>
                    {q.framework && <span className="text-[10px] text-muted">{q.framework}</span>}
                  </div>
                  <div className="text-sm font-medium leading-snug">{q.question}</div>
                </div>
                <span className="text-muted text-sm shrink-0">{expanded === i ? '↑' : '↓'}</span>
              </div>
            </div>

            {expanded === i && (
              <div className="px-4 pb-4 border-t border-white/7">
                <div className="mt-3 space-y-3">
                  {q.why && (
                    <div className="bg-warn/5 border border-warn/20 rounded-xl p-3">
                      <div className="text-xs font-semibold text-warn mb-1">Why they ask this</div>
                      <div className="text-xs text-muted">{q.why}</div>
                    </div>
                  )}
                  {q.keyPoints?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted mb-2">Key points to hit:</div>
                      <div className="flex flex-wrap gap-2">
                        {q.keyPoints.map((p, j) => <span key={j} className="text-xs bg-accent/8 text-accent border border-accent/15 px-2.5 py-1 rounded-full">{p}</span>)}
                      </div>
                    </div>
                  )}

                  {/* Practice area */}
                  {practicing === i ? (
                    <div>
                      <div className="text-xs font-semibold text-muted mb-2">Your answer:</div>
                      <textarea
                        className="w-full bg-surface2 border border-white/10 rounded-xl p-3 text-sm text-muted resize-none focus:outline-none focus:border-accent"
                        rows={5}
                        placeholder="Type your answer here… use the STAR method"
                        value={practiceAnswer}
                        onChange={e => setPracticeAnswer(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <Button variant="ghost" size="sm" onClick={() => { setPracticing(null); setPracticeAnswer(''); }}>Done</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => { setPracticing(i); setPracticeAnswer(''); }}>
                      📝 Practice answer
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Tips */}
      <Card>
        <CardHeader title="💡 Interview Tips" subtitle="From 1000s of successful tech interviews" />
        <div className="grid grid-cols-3 gap-0 divide-x divide-white/7">
          {[
            { icon:'⏱️', title:'Use STAR always', desc:'Situation, Task, Action, Result — every behavioral question' },
            { icon:'📊', title:'Quantify everything', desc:'"Increased conversion by 34%" beats "improved conversion"' },
            { icon:'❓', title:'Ask great questions', desc:'Prepare 3 smart questions that show you\'ve done your research' },
          ].map(t => (
            <div key={t.title} className="p-4">
              <div className="text-xl mb-2">{t.icon}</div>
              <div className="text-sm font-semibold mb-1">{t.title}</div>
              <div className="text-xs text-muted">{t.desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

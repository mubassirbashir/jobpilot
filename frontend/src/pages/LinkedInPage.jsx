import { useEffect, useState } from 'react';
import { linkedin as liApi } from '../services/api.js';
import { useStore } from '../store.js';
import { Card, CardHeader, Button, ProgressBar, Spinner } from '../components/UI.jsx';

const SECTION_INFO = {
  Photo:        { icon:'🖼️', tip:'Professional headshot increases profile views by 21×' },
  Headline:     { icon:'✏️', tip:'Your headline is the #1 thing recruiters read' },
  About:        { icon:'📝', tip:'Story-driven About section gets 3× more recruiter messages' },
  Experience:   { icon:'💼', tip:'Quantified bullets outperform generic descriptions by 40%' },
  Skills:       { icon:'⚡', tip:'Top 10 skills determine if you show in recruiter searches' },
  'Open to Work':{ icon:'🎯', tip:'Hidden Open to Work badge gets 40% more recruiter views' },
  'Banner Image':{ icon:'🎨', tip:'Custom banner makes your profile stand out instantly' },
};

export default function LinkedInPage() {
  const { user, addNotification } = useStore();
  const [health, setHealth] = useState(null);
  const [optimization, setOptimization] = useState(null);
  const [optimizing, setOptimizing] = useState(false);
  const [applying, setApplying] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    liApi.health().then(r => setHealth(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await liApi.optimize();
      setOptimization(res.data.optimization);
      addNotification({ type:'success', message:'AI optimization ready!' });
    } catch { addNotification({ type:'error', message:'Optimization failed' }); }
    finally { setOptimizing(false); }
  };

  const handleApply = async (section, content) => {
    setApplying(section);
    try {
      await liApi.applyOptimization({ section, content });
      addNotification({ type:'success', message:`${section} updated on LinkedIn!` });
    } catch { addNotification({ type:'error', message:`Failed to update ${section}` }); }
    finally { setApplying(null); }
  };

  if (loading) return <div className="flex justify-center py-32"><Spinner size="lg" /></div>;

  const li = user?.linkedin || {};

  return (
    <div className="space-y-6 animate-fadeUp">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">🔗 LinkedIn Optimizer</h1>
          <p className="text-muted text-sm mt-1">AI-powered profile optimization to get 3× more recruiter views</p>
        </div>
        <Button variant="primary" onClick={handleOptimize} loading={optimizing}>
          ✨ Generate AI Suggestions
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Profile card */}
        <Card className="col-span-1">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#0077b5] flex items-center justify-center font-black text-white text-2xl">in</div>
              <div>
                <div className="font-medium">{li.name || user?.name || 'Your Profile'}</div>
                <div className={`text-xs flex items-center gap-1 ${li.connected ? 'text-accent3' : 'text-muted'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${li.connected ? 'bg-accent3' : 'bg-muted'}`} />
                  {li.connected ? 'Connected' : 'Not connected'}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted mb-1">SSI Score</div>
            <div className="flex items-end gap-2 mb-3">
              <div className="font-display font-extrabold text-4xl text-accent">{li.ssiScore || 75}</div>
              <div className="text-muted text-sm pb-1">/ 100</div>
            </div>
            <div className="h-2 bg-white/7 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-accent to-cyan-400 rounded-full" style={{ width:`${li.ssiScore || 75}%` }} />
            </div>
            <div className="text-xs text-muted">Top 15% in your industry</div>
            {li.lastSync && <div className="text-xs text-muted mt-2">Last sync: {new Date(li.lastSync).toLocaleTimeString()}</div>}
          </div>
        </Card>

        {/* Health check */}
        <Card className="col-span-2">
          <CardHeader title="Profile Health Check" subtitle={`${health?.totalScore || 75}/100 complete`} />
          <div>
            {(health?.sections || [
              { name:'Photo', status:'done' }, { name:'Headline', status:'done' },
              { name:'About', status:'warn' }, { name:'Experience', status:'done' },
              { name:'Skills', status:'warn' }, { name:'Open to Work', status:'done' },
              { name:'Banner Image', status:'missing' },
            ]).map(s => {
              const info = SECTION_INFO[s.name] || {};
              const colorMap = { done:'text-accent3', warn:'text-warn', missing:'text-danger' };
              const bgMap = { done:'bg-accent3', warn:'bg-warn', missing:'bg-danger' };
              const labelMap = { done:'Complete', warn:'Needs work', missing:'Missing' };
              return (
                <div key={s.name} className="flex items-center gap-3 px-5 py-3 border-b border-white/5 last:border-0">
                  <span className="text-base w-6">{info.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted">{info.tip}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-2 h-2 rounded-full ${bgMap[s.status] || 'bg-muted'}`} />
                    <span className={`text-xs ${colorMap[s.status] || 'text-muted'}`}>{labelMap[s.status] || s.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* AI Optimization Panel */}
      {optimization ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-lg">✨ AI Suggestions</h2>
            <span className="text-xs bg-accent3/10 text-accent3 px-2.5 py-0.5 rounded-full font-semibold">Ready to apply</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Headline */}
            <Card>
              <CardHeader title="Optimized Headline" subtitle="120 char max · keyword-rich" />
              <div className="p-5">
                <div className="bg-surface2 rounded-xl p-4 text-sm text-text mb-3 border border-white/7 leading-relaxed">
                  {optimization.headline}
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" size="sm" onClick={() => handleApply('headline', optimization.headline)} loading={applying === 'headline'}>
                    Apply to LinkedIn
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(optimization.headline)}>Copy</Button>
                </div>
              </div>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader title="Skills to Add" subtitle="Increase recruiter search visibility" />
              <div className="p-5">
                <div className="flex flex-wrap gap-2 mb-3">
                  {(optimization.skillsToAdd || []).map(s => (
                    <span key={s} className="text-xs bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-full">+ {s}</span>
                  ))}
                </div>
                {(optimization.skillsToRemove || []).length > 0 && <>
                  <div className="text-xs text-muted mb-2">Remove (outdated):</div>
                  <div className="flex flex-wrap gap-2">
                    {optimization.skillsToRemove.map(s => (
                      <span key={s} className="text-xs bg-danger/10 text-danger border border-danger/20 px-2.5 py-1 rounded-full">− {s}</span>
                    ))}
                  </div>
                </>}
              </div>
            </Card>
          </div>

          {/* About section */}
          <Card>
            <CardHeader title="Optimized About Section" subtitle="Story-driven · ends with CTA" />
            <div className="p-5">
              <div className="bg-surface2 rounded-xl p-4 text-sm text-muted mb-3 border border-white/7 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                {optimization.about}
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => handleApply('about', optimization.about)} loading={applying === 'about'}>
                  Apply to LinkedIn
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(optimization.about)}>Copy</Button>
              </div>
            </div>
          </Card>

          {/* SEO keywords */}
          {optimization.seoKeywords?.length > 0 && (
            <Card>
              <CardHeader title="SEO Keywords" subtitle="Use these naturally throughout your profile" />
              <div className="p-5 flex flex-wrap gap-2">
                {optimization.seoKeywords.map(k => (
                  <span key={k} className="text-xs bg-accent2/10 text-purple-300 border border-accent2/20 px-2.5 py-1 rounded-full">{k}</span>
                ))}
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Card className="border-dashed border-white/20">
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">✨</div>
            <div className="font-display font-bold mb-2">AI Profile Optimization</div>
            <div className="text-muted text-sm mb-5 max-w-sm mx-auto">Claude will analyze your profile and target roles, then generate a fully optimized headline, about section, and skills list</div>
            <Button variant="primary" onClick={handleOptimize} loading={optimizing}>Generate Optimization</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

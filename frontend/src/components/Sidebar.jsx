import { NavLink, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useStore } from '../store.js';

const NAV = [
  { section: 'Overview', items: [
    { to: '/dashboard', icon: '📊', label: 'Dashboard' },
    { to: '/agent',     icon: '🤖', label: 'AI Agent',      badge: 'live', badgeColor: 'green' },
  ]},
  { section: 'LinkedIn', items: [
    { to: '/linkedin',    icon: '🔗', label: 'Profile Optimizer' },
    { to: '/analytics',   icon: '📈', label: 'Analytics' },
  ]},
  { section: 'Job Hunt', items: [
    { to: '/jobs',         icon: '💼', label: 'Job Queue',    badgeKey: 'queued' },
    { to: '/applications', icon: '📝', label: 'Applications', badgeKey: 'review' },
    { to: '/matches',      icon: '🎯', label: 'Job Matches' },
  ]},
  { section: 'Documents', items: [
    { to: '/cv',            icon: '📄', label: 'CV Builder' },
    { to: '/cover-letters', icon: '✉️',  label: 'Cover Letters' },
  ]},
  { section: 'Career', items: [
    { to: '/interview',  icon: '🎤', label: 'Interview Prep' },
    { to: '/settings',   icon: '⚙️',  label: 'Settings' },
  ]},
];

export default function Sidebar() {
  const { user, logout, overview, agentRunning } = useStore();
  const navigate = useNavigate();

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'JP';
  const queuedCount = overview?.recentJobs?.filter(j => j.status === 'queued').length || 0;
  const reviewCount = overview?.recentJobs?.filter(j => j.status === 'review_needed').length || 0;

  const getBadge = (item) => {
    if (item.badge === 'live') return <span className={clsx('ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full', agentRunning ? 'bg-accent3/10 text-accent3 animate-blink' : 'bg-white/8 text-muted')}>{agentRunning ? 'LIVE' : 'OFF'}</span>;
    if (item.badgeKey === 'queued' && queuedCount > 0) return <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent2/20 text-purple-300">{queuedCount}</span>;
    if (item.badgeKey === 'review' && reviewCount > 0) return <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-warn/10 text-warn">{reviewCount}</span>;
    return null;
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-surface border-r border-white/7 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-7 border-b border-white/7 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-lg">🚀</div>
        <div className="font-display font-extrabold text-lg tracking-tight">
          Job<span className="text-accent">Pilot</span> AI
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col gap-0.5">
        {NAV.map(group => (
          <div key={group.section}>
            <div className="text-[10px] font-semibold tracking-widest uppercase text-muted px-3 pt-4 pb-2">{group.section}</div>
            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all relative',
                  isActive
                    ? 'bg-accent/8 text-accent font-medium before:absolute before:left-0 before:top-1/4 before:h-1/2 before:w-0.5 before:bg-accent before:rounded-r'
                    : 'text-muted hover:bg-white/5 hover:text-text'
                )}
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {getBadge(item)}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/7">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/4 cursor-pointer hover:bg-white/6 transition-all" onClick={() => navigate('/settings')}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs font-bold text-bg shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{user?.name || 'User'}</div>
            <div className="text-[10px] text-accent capitalize">{user?.plan || 'free'} plan</div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); logout(); }} className="text-muted hover:text-danger transition-colors text-xs" title="Logout">✕</button>
        </div>
      </div>
    </aside>
  );
}

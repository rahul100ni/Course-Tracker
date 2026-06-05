import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';
import { Clock, BookOpen, Target, Activity, CheckCircle2 } from 'lucide-react';

function fmtMins(m) {
  const h = Math.floor(m / 60), min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  if (h) return `${h}h`;
  return `${min}m`;
}
function fmtSecs(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return `${s % 60}s`;
}

export default function LiveView() {
  const [stats, setStats] = useState({
    todayStudySeconds: 0,
    todayCourseMins: 0,
    completedLecturesToday: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statsRef = ref(db, 'users/rahul/liveStats');
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStats({
          todayStudySeconds: data.todayStudySeconds || 0,
          todayCourseMins: data.todayCourseMins || 0,
          completedLecturesToday: data.completedLecturesToday || []
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const DAILY_GOAL_MINS = 240;
  const pct = Math.min((stats.todayCourseMins / DAILY_GOAL_MINS) * 100, 100);
  const remaining = Math.max(DAILY_GOAL_MINS - stats.todayCourseMins, 0);
  const met = stats.todayCourseMins >= DAILY_GOAL_MINS;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Activity className="animate-pulse mr-2" size={20} /> Loading live progress...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-md mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Activity className="text-emerald-400 animate-pulse" size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Live Progress Tracker</h1>
          <p className="text-sm text-slate-400 mt-2">Keeping an eye on today's focus session.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 flex flex-col items-center justify-center text-center">
            <Clock size={20} className="text-sky-400 mb-2" />
            <p className="text-3xl font-bold font-mono text-sky-100">{fmtSecs(stats.todayStudySeconds)}</p>
            <p className="text-xs uppercase tracking-widest text-sky-500/70 font-semibold mt-1">Timer Active</p>
          </div>
          
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col items-center justify-center text-center">
            <BookOpen size={20} className="text-indigo-400 mb-2" />
            <p className="text-3xl font-bold font-mono text-indigo-100">{fmtMins(stats.todayCourseMins)}</p>
            <p className="text-xs uppercase tracking-widest text-indigo-500/70 font-semibold mt-1">Course Content</p>
          </div>
        </div>

        {/* Goal Card */}
        <div className={`rounded-2xl border p-5 ${met ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className={met ? 'text-emerald-400' : 'text-amber-400'} />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Daily Goal (4h)</h2>
          </div>
          
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ 
                width: `${pct}%`, 
                background: met ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#6366f1,#a78bfa)' 
              }} 
            />
          </div>
          
          <div className="mt-4 flex justify-between items-center text-sm">
            {met ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={16}/> Goal Hit!</span>
            ) : (
              <span className="text-slate-400">
                <span className="text-slate-100 font-bold">{fmtMins(remaining)}</span> remaining
              </span>
            )}
            <span className="text-slate-500 font-mono">{pct.toFixed(0)}%</span>
          </div>
        </div>

        {/* Completed Lectures List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/30">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Lectures Completed Today</h2>
          </div>
          <div className="divide-y divide-slate-800/50">
            {stats.completedLecturesToday.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No lectures ticked off yet today.
              </div>
            ) : (
              stats.completedLecturesToday.map((title, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300 leading-snug">{title}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';
import { Clock, BookOpen, Target, Activity, CheckCircle2, Pause } from 'lucide-react';

function fmtMins(m) {
  const h = Math.floor(m / 60), min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  if (h) return `${h}h`;
  return `${min}m`;
}
function fmtClock(s) {
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}

export default function LiveView() {
  const [stats, setStats] = useState({
    todayStudySeconds: 0,
    todayCourseMins: 0,
    completedLecturesToday: [],
    timerRunning: false,
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);

  // Live-tick the timer display when running
  const [displaySeconds, setDisplaySeconds] = useState(0);
  const tickRef = useRef(null);
  const snapshotTimeRef = useRef(null); // wall clock when snapshot arrived

  useEffect(() => {
    const statsRef = ref(db, 'users/rahul/liveStats');
    const unsubscribe = onValue(statsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setStats({
          todayStudySeconds: data.todayStudySeconds || 0,
          todayCourseMins: data.todayCourseMins || 0,
          completedLecturesToday: data.completedLecturesToday || [],
          timerRunning: data.timerRunning || false,
          updatedAt: data.updatedAt || null,
        });
        setDisplaySeconds(data.todayStudySeconds || 0);
        snapshotTimeRef.current = Date.now();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Live-tick: when timer is running, increment displaySeconds locally between Firebase updates
  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (stats.timerRunning) {
      tickRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - snapshotTimeRef.current) / 1000);
        setDisplaySeconds(stats.todayStudySeconds + elapsed);
      }, 1000);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [stats.timerRunning, stats.todayStudySeconds]);

  const DAILY_GOAL_MINS = 240;
  const pct = Math.min((stats.todayCourseMins / DAILY_GOAL_MINS) * 100, 100);
  const remaining = Math.max(DAILY_GOAL_MINS - stats.todayCourseMins, 0);
  const met = stats.todayCourseMins >= DAILY_GOAL_MINS;

  // Last updated label
  const updatedLabel = stats.updatedAt
    ? `Updated ${new Date(stats.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide">Connecting to live feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-md mx-auto space-y-5">

        {/* Header */}
        <div className="text-center py-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Activity className="text-emerald-400 animate-pulse" size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Live Progress Tracker</h1>
          <p className="text-sm text-slate-400 mt-1.5">Keeping an eye on today's focus session.</p>
          {updatedLabel && (
            <p className="text-xs text-slate-600 mt-1 font-mono">{updatedLabel}</p>
          )}
        </div>

        {/* Timer Card — big focal point */}
        <div
          className={`rounded-2xl border p-6 flex flex-col items-center gap-3 transition-all duration-500 ${
            stats.timerRunning
              ? 'border-sky-500/30 bg-sky-500/5 shadow-[0_0_24px_rgba(14,165,233,0.08)]'
              : 'border-slate-700/50 bg-slate-900/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} className={stats.timerRunning ? 'text-sky-400' : 'text-slate-500'} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${stats.timerRunning ? 'text-sky-400' : 'text-slate-500'}`}>
              Today's Study Time
            </span>
            {stats.timerRunning ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 ml-2">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 ml-2">
                <Pause size={11} />
                Paused
              </span>
            )}
          </div>

          <p
            className={`text-6xl font-bold font-mono tabular-nums tracking-widest transition-colors duration-300 ${
              stats.timerRunning ? 'text-sky-200' : 'text-slate-500'
            }`}
          >
            {fmtClock(displaySeconds)}
          </p>
        </div>

        {/* Content + Goal row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex flex-col items-center justify-center text-center">
            <BookOpen size={20} className="text-indigo-400 mb-2" />
            <p className="text-3xl font-bold font-mono text-indigo-100">{fmtMins(stats.todayCourseMins)}</p>
            <p className="text-xs uppercase tracking-widest text-indigo-500/70 font-semibold mt-1">Course Content</p>
          </div>

          <div className={`rounded-2xl border p-4 flex flex-col items-center justify-center text-center ${met ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/5'}`}>
            <Target size={20} className={`mb-2 ${met ? 'text-emerald-400' : 'text-amber-400'}`} />
            <p className={`text-3xl font-bold font-mono ${met ? 'text-emerald-100' : 'text-amber-100'}`}>
              {pct.toFixed(0)}%
            </p>
            <p className={`text-xs uppercase tracking-widest font-semibold mt-1 ${met ? 'text-emerald-500/70' : 'text-amber-500/70'}`}>
              {met ? 'Goal Hit! 🎯' : 'Daily Goal'}
            </p>
          </div>
        </div>

        {/* Goal Progress bar */}
        <div className={`rounded-2xl border p-5 ${met ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className={met ? 'text-emerald-400' : 'text-amber-400'} />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Daily Goal (4h)</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">{stats.todayCourseMins}m / 240m</span>
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
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 size={16} /> Goal Hit!
              </span>
            ) : (
              <span className="text-slate-400">
                <span className="text-slate-100 font-bold">{fmtMins(remaining)}</span> remaining
              </span>
            )}
            <span className="text-slate-500 font-mono">{pct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Completed Lectures List */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Lectures Completed Today</h2>
            {stats.completedLecturesToday.length > 0 && (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {stats.completedLecturesToday.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-800/50">
            {stats.completedLecturesToday.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No lectures ticked off yet today.
              </div>
            ) : (
              stats.completedLecturesToday.map((title, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-slate-300 leading-snug">{title}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-700 pb-4">
          Synced via Firebase Realtime Database · updates live
        </p>

      </div>
    </div>
  );
}

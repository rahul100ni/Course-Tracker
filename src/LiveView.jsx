import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';
import {
  Clock, BookOpen, CheckCircle2, Flame,
  TrendingUp, Target, Zap, ChevronDown, ChevronUp,
} from 'lucide-react';
import { SUBJECTS, SUBJECT_LIST } from './subjects/index';

/* ─── Utilities ───────────────────────────────────────────────── */
function fmtClock(s) {
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, '0')).join(':');
}
function fmtMins(m) {
  const h = Math.floor(m / 60), min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  if (h)        return `${h}h`;
  return        `${min || 0}m`;
}
function fmtSecs(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h)      return `${h}h`;
  if (m)      return `${m}m`;
  return      `${s % 60}s`;
}
function updatedLabel(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/* ─── Accent config ───────────────────────────────────────────── */
const A = {
  indigo: {
    card:       'border-indigo-500/25 bg-indigo-500/5',
    cardActive: 'border-indigo-400/50 bg-indigo-500/10 shadow-indigo-500/10 shadow-lg',
    label:      'text-indigo-300',
    badge:      'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
    bar:        'linear-gradient(90deg,#6366f1,#a78bfa)',
    dot:        'bg-indigo-400',
  },
  violet: {
    card:       'border-violet-500/25 bg-violet-500/5',
    cardActive: 'border-violet-400/50 bg-violet-500/10 shadow-violet-500/10 shadow-lg',
    label:      'text-violet-300',
    badge:      'bg-violet-500/15 text-violet-300 border-violet-500/25',
    bar:        'linear-gradient(90deg,#7c3aed,#c4b5fd)',
    dot:        'bg-violet-400',
  },
};
const getA = (accent) => A[accent] || A.indigo;

/* ─── ProgressBar ─────────────────────────────────────────────── */
function ProgressBar({ pct, gradient, height = 'h-2' }) {
  return (
    <div className={`${height} bg-slate-800 rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(pct, 100)}%`, background: gradient }}
      />
    </div>
  );
}

/* ─── StatPill ────────────────────────────────────────────────── */
function StatPill({ label, value, color = 'text-slate-300' }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800">
      <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

/* ─── SubjectCard ─────────────────────────────────────────────── */
function SubjectCard({ subj, data, isActive, running }) {
  const [showLectures, setShowLectures] = useState(true);
  const ac         = getA(subj.accent);
  const goalMins   = data?.goalMins ?? subj.defaultDailyGoalMins;
  const hasGoal    = goalMins > 0;
  const contentMin = data?.todayCourseMins ?? 0;
  const studySecs  = data?.todayStudySecs  ?? 0;
  const totalDone  = data?.totalCompleted  ?? 0;
  const totalLec   = data?.totalLectures   ?? subj.lectures.length;
  const coursePct  = data?.coursePct       ?? 0;
  const goalPct    = hasGoal ? Math.min((contentMin / goalMins) * 100, 100) : 0;
  const goalMet    = hasGoal && contentMin >= goalMins;
  const lectures   = data?.completedToday  ?? [];

  return (
    <div className={`rounded-2xl border p-5 flex flex-col gap-4 transition-all duration-300 ${
      isActive ? ac.cardActive : ac.card
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{subj.icon}</span>
          <div>
            <p className={`text-sm font-bold leading-none ${ac.label}`}>{subj.name}</p>
            {isActive && running && (
              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${ac.dot} animate-pulse`} />
                Studying now
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {goalMet && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={10} /> Goal met
            </span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${ac.badge}`}>
            {totalDone}/{totalLec}
          </span>
        </div>
      </div>

      {/* Today's stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Focus time</p>
          <p className={`text-lg font-bold font-mono ${studySecs > 0 ? ac.label : 'text-slate-600'}`}>
            {studySecs > 0 ? fmtSecs(studySecs) : '—'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Content</p>
          <p className={`text-lg font-bold font-mono ${contentMin > 0 ? 'text-emerald-300' : 'text-slate-600'}`}>
            {contentMin > 0 ? fmtMins(contentMin) : '—'}
          </p>
        </div>
      </div>

      {/* Daily goal bar */}
      {hasGoal && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Target size={9} /> Daily goal
            </span>
            <span className={`text-[10px] font-mono font-semibold ${goalMet ? 'text-emerald-400' : 'text-slate-500'}`}>
              {fmtMins(contentMin)} / {fmtMins(goalMins)}
            </span>
          </div>
          <ProgressBar
            pct={goalPct}
            gradient={
              goalMet      ? 'linear-gradient(90deg,#10b981,#34d399)' :
              goalPct > 75 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                             ac.bar
            }
          />
          {!goalMet && contentMin > 0 && (
            <p className="text-[10px] text-slate-600 mt-1 font-mono">
              {fmtMins(Math.max(goalMins - contentMin, 0))} left to goal
            </p>
          )}
        </div>
      )}

      {/* Course progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={9} /> Course progress
          </span>
          <span className={`text-[10px] font-mono font-semibold ${ac.label}`}>
            {coursePct.toFixed(1)}%
          </span>
        </div>
        <ProgressBar pct={coursePct} gradient={coursePct === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : ac.bar} height="h-1.5" />
        <p className="text-[10px] text-slate-600 mt-1 font-mono">
          {totalDone} of {totalLec} lectures · {fmtMins(data?.totalCourseMins ?? 0)} total
        </p>
      </div>

      {/* Lectures completed today */}
      {lectures.length > 0 && (
        <div>
          <button
            className="flex items-center justify-between w-full text-left mb-2"
            onClick={() => setShowLectures(v => !v)}
          >
            <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={9} className="text-emerald-500" />
              Completed today ({lectures.length})
            </span>
            {showLectures
              ? <ChevronUp size={11} className="text-slate-600" />
              : <ChevronDown size={11} className="text-slate-600" />
            }
          </button>
          {showLectures && (
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {lectures.map((title, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-400 leading-snug">{title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main LiveView ───────────────────────────────────────────── */
export default function LiveView() {
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [displaySecs, setDisplaySecs] = useState(0);
  const snapshotBaseRef               = useRef({ secs: 0, ts: Date.now() });

  /* ── Firebase listener */
  useEffect(() => {
    const unsub = onValue(ref(db, 'users/rahul/liveStats'), (snap) => {
      const data = snap.val();
      if (data) {
        setStats(data);
        snapshotBaseRef.current = { secs: data.todayStudySeconds ?? 0, ts: Date.now() };
        setDisplaySecs(data.todayStudySeconds ?? 0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ── Live tick between Firebase pushes */
  useEffect(() => {
    if (!stats?.timerRunning) return;
    const id = setInterval(() => {
      const elapsed = Math.floor((Date.now() - snapshotBaseRef.current.ts) / 1000);
      setDisplaySecs(snapshotBaseRef.current.secs + elapsed);
    }, 1000);
    return () => clearInterval(id);
  }, [stats?.timerRunning, stats?.updatedAt]);

  /* ── Derived values */
  const subjects = stats?.subjects  ?? {};
  const streak   = stats?.streak    ?? 0;
  const running  = stats?.timerRunning ?? false;

  // Only subjects with actual activity today
  const studiedSubjects = SUBJECT_LIST.filter(s => {
    const sd = subjects[s.id];
    return (sd?.todayStudySecs ?? 0) > 0 || (sd?.todayCourseMins ?? 0) > 0;
  });

  // Combined goal: only when 2+ studied subjects have a goal
  const studiedWithGoal  = studiedSubjects.filter(s => (subjects[s.id]?.goalMins ?? 0) > 0);
  const showCombined     = studiedWithGoal.length >= 2;
  const combinedGoalMins = studiedWithGoal.reduce((n, s) => n + (subjects[s.id]?.goalMins ?? 0), 0);
  const combinedContent  = studiedWithGoal.reduce((n, s) => n + (subjects[s.id]?.todayCourseMins ?? 0), 0);
  const combinedPct      = combinedGoalMins > 0 ? Math.min((combinedContent / combinedGoalMins) * 100, 100) : 0;
  const combinedMet      = combinedGoalMins > 0 && combinedContent >= combinedGoalMins;

  // Hero stats (across ALL studied subjects, not just those with goals)
  const totalContentToday  = studiedSubjects.reduce((n, s) => n + (subjects[s.id]?.todayCourseMins ?? 0), 0);
  const totalLectureToday  = studiedSubjects.reduce((n, s) => n + (subjects[s.id]?.completedToday?.length ?? 0), 0);

  // All-time course progress
  const totalAllLectures = SUBJECT_LIST.reduce((n, s) => n + s.lectures.length, 0);
  const totalAllDone     = SUBJECT_LIST.reduce((n, s) => n + (subjects[s.id]?.totalCompleted ?? 0), 0);
  const totalAllPct      = totalAllLectures > 0 ? (totalAllDone / totalAllLectures) * 100 : 0;

  // Active subject metadata
  const activeSubj = stats?.activeSubject ? (SUBJECTS[stats.activeSubject] || null) : null;

  /* ── Loading */
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm tracking-wide font-medium">Loading live stats…</p>
        </div>
      </div>
    );
  }

  /* ── Render */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen size={14} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100 leading-none">Study Tracker</p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-none">Live Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Flame size={11} /> {streak}d streak
              </span>
            )}
            <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${
              running
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {running ? 'Live' : 'Paused'}
            </div>
            {stats?.updatedAt && (
              <span className="hidden sm:block text-[10px] text-slate-600 font-mono">
                {updatedLabel(stats.updatedAt)}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Hero Timer */}
        <div className={`rounded-2xl border p-6 text-center transition-all duration-500 ${
          running
            ? 'border-indigo-500/30 bg-gradient-to-b from-indigo-500/10 to-slate-900/50 shadow-indigo-500/10 shadow-xl'
            : 'border-slate-800 bg-slate-900/40'
        }`}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-4">
            Today's Total Study Time
          </p>

          <div className={`text-7xl font-bold font-mono tracking-widest tabular-nums transition-colors duration-300 ${
            running ? 'text-indigo-300' : 'text-slate-500'
          }`}>
            {fmtClock(displaySecs)}
          </div>

          {activeSubj && running && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className={`w-2 h-2 rounded-full ${getA(activeSubj.accent).dot} animate-pulse`} />
              <span className="text-sm text-slate-400">
                Studying{' '}
                <span className={`font-semibold ${getA(activeSubj.accent).label}`}>
                  {activeSubj.icon} {activeSubj.name}
                </span>
              </span>
            </div>
          )}
          {!running && displaySecs > 0 && (
            <p className="text-xs text-slate-600 mt-3">Session paused</p>
          )}
          {!running && displaySecs === 0 && (
            <p className="text-xs text-slate-600 mt-3">Start the timer on the main dashboard</p>
          )}

          {/* Quick stats */}
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            <StatPill
              label="Focus today"
              value={displaySecs > 0 ? fmtSecs(displaySecs) : '—'}
              color={displaySecs > 0 ? 'text-indigo-300' : 'text-slate-600'}
            />
            <StatPill
              label="Content today"
              value={totalContentToday > 0 ? fmtMins(totalContentToday) : '—'}
              color={totalContentToday > 0 ? 'text-emerald-300' : 'text-slate-600'}
            />
            <StatPill
              label="Lectures today"
              value={totalLectureToday || '—'}
              color="text-violet-300"
            />
            {streak > 0 && (
              <StatPill label="Streak" value={`${streak}d 🔥`} color="text-amber-300" />
            )}
          </div>
        </div>

        {/* Combined daily goal — only when 2+ subjects with goals were studied */}
        {showCombined && (
          <div className={`rounded-2xl border p-4 transition-colors ${
            combinedMet ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={14} className={combinedMet ? 'text-emerald-400' : 'text-amber-400'} />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Combined Daily Goal
                </span>
                <span className="text-[10px] text-slate-600">
                  ({studiedWithGoal.map(s => s.shortName).join(' + ')})
                </span>
              </div>
              <span className={`text-xs font-bold font-mono ${combinedMet ? 'text-emerald-400' : 'text-slate-400'}`}>
                {combinedMet
                  ? `✓ ${fmtMins(combinedContent)} — Done!`
                  : `${fmtMins(combinedContent)} / ${fmtMins(combinedGoalMins)}`}
              </span>
            </div>
            <ProgressBar
              pct={combinedPct}
              gradient={
                combinedMet     ? 'linear-gradient(90deg,#10b981,#34d399)' :
                combinedPct > 75 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' :
                                  'linear-gradient(90deg,#6366f1,#a78bfa)'
              }
              height="h-2.5"
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-600 font-mono">{combinedPct.toFixed(0)}% complete</span>
              {!combinedMet && (
                <span className="text-[10px] text-slate-600 font-mono">
                  {fmtMins(Math.max(combinedGoalMins - combinedContent, 0))} remaining
                </span>
              )}
            </div>
          </div>
        )}

        {/* Subject cards — adaptive: only show studied subjects */}
        {studiedSubjects.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className="text-slate-500" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {studiedSubjects.length === 1 ? studiedSubjects[0].name : 'Subject Breakdown'}
              </h2>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <div className={`grid gap-4 ${studiedSubjects.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              {studiedSubjects.map(subj => (
                <SubjectCard
                  key={subj.id}
                  subj={subj}
                  data={subjects[subj.id]}
                  isActive={stats?.activeSubject === subj.id}
                  running={running}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-sm text-slate-400 font-medium">No study activity yet today</p>
            <p className="text-xs text-slate-600 mt-1">
              Start the timer or tick off a lecture on the main dashboard
            </p>
          </div>
        )}

        {/* All-course progress — always shown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={13} className="text-slate-500" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">All-Course Progress</h2>
            </div>
            <span className="text-xs font-bold font-mono text-slate-400">
              {totalAllDone} / {totalAllLectures} lectures
            </span>
          </div>

          <div className="space-y-3 mb-3">
            {SUBJECT_LIST.map(subj => {
              const sd    = subjects[subj.id];
              const done  = sd?.totalCompleted ?? 0;
              const total = sd?.totalLectures  ?? subj.lectures.length;
              const pct   = sd?.coursePct      ?? 0;
              const ac    = getA(subj.accent);
              return (
                <div key={subj.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span>{subj.icon}</span> {subj.shortName}
                    </span>
                    <span className={`text-[10px] font-mono font-semibold ${ac.label}`}>
                      {done}/{total} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <ProgressBar pct={pct} gradient={ac.bar} height="h-1.5" />
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Combined</span>
              <span className="text-[10px] font-mono text-slate-500">{totalAllPct.toFixed(1)}%</span>
            </div>
            <ProgressBar
              pct={totalAllPct}
              gradient="linear-gradient(90deg,#6366f1,#7c3aed,#c4b5fd)"
              height="h-2"
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="pb-6 text-center">
          <p className="text-[10px] text-slate-700 font-mono">
            Live via Firebase · auto-refreshes
            {stats?.updatedAt && ` · last push ${updatedLabel(stats.updatedAt)}`}
          </p>
        </footer>
      </main>
    </div>
  );
}

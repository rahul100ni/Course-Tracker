import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from './firebase';
import {
  BookOpen, CheckCircle2, Flame,
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
    cardActive: 'border-indigo-400/50 bg-indigo-500/10',
    label:      'text-indigo-300',
    badge:      'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
    bar:        'linear-gradient(90deg,#6366f1,#a78bfa)',
    dot:        'bg-indigo-400',
    glow:       'shadow-indigo-500/20',
  },
  violet: {
    card:       'border-violet-500/25 bg-violet-500/5',
    cardActive: 'border-violet-400/50 bg-violet-500/10',
    label:      'text-violet-300',
    badge:      'bg-violet-500/15 text-violet-300 border-violet-500/25',
    bar:        'linear-gradient(90deg,#7c3aed,#c4b5fd)',
    dot:        'bg-violet-400',
    glow:       'shadow-violet-500/20',
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

/* ─── StatBox ─────────────────────────────────────────────────── */
function StatBox({ label, value, color = 'text-slate-300', sub }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
      <span className={`text-base font-bold font-mono leading-none ${color}`}>{value}</span>
      <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5 text-center leading-tight">{label}</span>
      {sub && <span className="text-[9px] text-slate-600 font-mono">{sub}</span>}
    </div>
  );
}

/* ─── SubjectCard ─────────────────────────────────────────────── */
function SubjectCard({ subj, data, isActive, running }) {
  const [showLectures, setShowLectures] = useState(false);
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
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-300 ${
      isActive ? `${ac.cardActive} shadow-lg ${ac.glow}` : ac.card
    }`}>

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{subj.icon}</span>
          <div className="min-w-0">
            <p className={`text-sm font-bold leading-none truncate ${ac.label}`}>{subj.name}</p>
            {isActive && running && (
              <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                <span className={`w-1 h-1 rounded-full ${ac.dot} animate-pulse flex-shrink-0`} />
                Studying now
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {goalMet && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <CheckCircle2 size={8} /> Done
            </span>
          )}
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${ac.badge}`}>
            {totalDone}/{totalLec}
          </span>
        </div>
      </div>

      {/* Today's stats — horizontal 2-col, compact on mobile */}
      <div className="flex gap-2">
        <StatBox
          label="Focus time"
          value={studySecs > 0 ? fmtSecs(studySecs) : '—'}
          color={studySecs > 0 ? ac.label : 'text-slate-600'}
        />
        <StatBox
          label="Content"
          value={contentMin > 0 ? fmtMins(contentMin) : '—'}
          color={contentMin > 0 ? 'text-emerald-300' : 'text-slate-600'}
        />
      </div>

      {/* Daily goal bar */}
      {hasGoal && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Target size={8} /> Daily goal
            </span>
            <span className={`text-[9px] font-mono font-semibold ${goalMet ? 'text-emerald-400' : 'text-slate-500'}`}>
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
            <p className="text-[9px] text-slate-600 mt-0.5 font-mono">
              {fmtMins(Math.max(goalMins - contentMin, 0))} left
            </p>
          )}
        </div>
      )}

      {/* Course progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={8} /> Course
          </span>
          <span className={`text-[9px] font-mono font-semibold ${ac.label}`}>
            {coursePct.toFixed(1)}%
          </span>
        </div>
        <ProgressBar
          pct={coursePct}
          gradient={coursePct === 100 ? 'linear-gradient(90deg,#10b981,#34d399)' : ac.bar}
          height="h-1.5"
        />
        <p className="text-[9px] text-slate-600 mt-0.5 font-mono">
          {totalDone} of {totalLec} lectures
        </p>
      </div>

      {/* Completed today — collapsible */}
      {lectures.length > 0 && (
        <div>
          <button
            className="flex items-center justify-between w-full text-left py-1"
            onClick={() => setShowLectures(v => !v)}
          >
            <span className="text-[9px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={8} className="text-emerald-500" />
              Done today ({lectures.length})
            </span>
            {showLectures
              ? <ChevronUp size={10} className="text-slate-600" />
              : <ChevronDown size={10} className="text-slate-600" />
            }
          </button>
          {showLectures && (
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1 mt-1">
              {lectures.map((title, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400 leading-snug">{title}</p>
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
  // Per-subject live display secs: { [subjectId]: number }
  const [displaySubjectSecs, setDisplaySubjectSecs] = useState({});
  const snapshotBaseRef = useRef({ secs: 0, ts: Date.now(), switchBase: 0, subjects: {} });

  /* ── Firebase listener */
  useEffect(() => {
    const unsub = onValue(ref(db, 'users/rahul/liveStats'), (snap) => {
      const data = snap.val();
      if (data) {
        setStats(data);
        const baseSecs    = data.todayStudySeconds ?? 0;
        const switchBase  = data.subjectSwitchBase ?? baseSecs;
        const subjSnap    = data.subjects ?? {};
        snapshotBaseRef.current = {
          secs:        baseSecs,
          ts:          Date.now(),
          switchBase,
          subjects:    subjSnap,
          activeSubject: data.activeSubject,
        };
        setDisplaySecs(baseSecs);
        // Initialise per-subject display from the push
        const initSubj = {};
        Object.keys(subjSnap).forEach(id => {
          initSubj[id] = subjSnap[id]?.todayStudySecs ?? 0;
        });
        setDisplaySubjectSecs(initSubj);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* ── Live tick between Firebase pushes */
  useEffect(() => {
    if (!stats?.timerRunning) return;
    const id = setInterval(() => {
      const snap    = snapshotBaseRef.current;
      const elapsed = Math.floor((Date.now() - snap.ts) / 1000);
      const liveTot = snap.secs + elapsed;
      setDisplaySecs(liveTot);

      // Extrapolate active subject time
      // liveExtra = how much the active subject has earned since the last push
      // = (liveTotal - subjectSwitchBase)
      // The push already included liveExtra at push-time; the snap.subjects[activeId].todayStudySecs
      // is the value AT push time. So between pushes we only add the ADDITIONAL elapsed
      // since the push: (elapsed) since snap.switchBase was already at liveTot at push time.
      const activeId   = snap.activeSubject;
      if (activeId) {
        const baseSubjSecs = snap.subjects[activeId]?.todayStudySecs ?? 0;
        const extraSinceSnap = elapsed; // 1s increments since the snapshot
        setDisplaySubjectSecs(prev => ({
          ...prev,
          [activeId]: baseSubjSecs + extraSinceSnap,
        }));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [stats?.timerRunning, stats?.updatedAt]);


  /* ── Derived values */
  const rawSubjects = stats?.subjects ?? {};
  const streak      = stats?.streak   ?? 0;
  const running     = stats?.timerRunning ?? false;
  const activeSubjectId = stats?.activeSubject ?? null;

  // Merge live-extrapolated subject secs into the subjects map
  const subjects = {};
  Object.entries(rawSubjects).forEach(([id, sd]) => {
    subjects[id] = {
      ...sd,
      todayStudySecs: displaySubjectSecs[id] ?? sd?.todayStudySecs ?? 0,
    };
  });

  const studiedSubjects = SUBJECT_LIST.filter(s => {
    const sd = subjects[s.id];
    return (sd?.todayStudySecs ?? 0) > 0 || (sd?.todayCourseMins ?? 0) > 0;
  });

  const studiedWithGoal  = studiedSubjects.filter(s => (subjects[s.id]?.goalMins ?? 0) > 0);
  const showCombined     = studiedWithGoal.length >= 2;
  const combinedGoalMins = studiedWithGoal.reduce((n, s) => n + (subjects[s.id]?.goalMins ?? 0), 0);
  const combinedContent  = studiedWithGoal.reduce((n, s) => n + (subjects[s.id]?.todayCourseMins ?? 0), 0);
  const combinedPct      = combinedGoalMins > 0 ? Math.min((combinedContent / combinedGoalMins) * 100, 100) : 0;
  const combinedMet      = combinedGoalMins > 0 && combinedContent >= combinedGoalMins;

  const totalContentToday = studiedSubjects.reduce((n, s) => n + (subjects[s.id]?.todayCourseMins ?? 0), 0);
  const totalLectureToday = studiedSubjects.reduce((n, s) => n + (subjects[s.id]?.completedToday?.length ?? 0), 0);

  const totalAllLectures = SUBJECT_LIST.reduce((n, s) => n + s.lectures.length, 0);
  const totalAllDone     = SUBJECT_LIST.reduce((n, s) => n + (subjects[s.id]?.totalCompleted ?? 0), 0);
  const totalAllPct      = totalAllLectures > 0 ? (totalAllDone / totalAllLectures) * 100 : 0;

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

      {/* ── Sticky Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/90 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
              <BookOpen size={12} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100 leading-none">Study Tracker</p>
              <p className="text-[9px] text-slate-600 leading-none mt-0.5">Live Dashboard</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                <Flame size={9} /> {streak}d
              </span>
            )}
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${
              running
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              {running ? 'Live' : 'Paused'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 py-4 space-y-4 pb-8">

        {/* ── Hero Timer ────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-5 text-center transition-all duration-500 ${
          running
            ? 'border-indigo-500/30 bg-gradient-to-b from-indigo-500/10 to-slate-900/50 shadow-xl shadow-indigo-500/10'
            : 'border-slate-800 bg-slate-900/40'
        }`}>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
            Today's Study Time
          </p>

          {/* Clock — responsive font size */}
          <div className={`font-bold font-mono tabular-nums transition-colors duration-300 leading-none ${
            running ? 'text-indigo-300' : 'text-slate-500'
          }`} style={{ fontSize: 'clamp(2.5rem, 14vw, 4.5rem)', letterSpacing: '0.06em' }}>
            {fmtClock(displaySecs)}
          </div>

          {/* Active subject indicator */}
          {activeSubj && running && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${getA(activeSubj.accent).dot} animate-pulse flex-shrink-0`} />
              <span className="text-xs text-slate-400">
                Studying{' '}
                <span className={`font-semibold ${getA(activeSubj.accent).label}`}>
                  {activeSubj.icon} {activeSubj.name}
                </span>
              </span>
            </div>
          )}
          {!running && displaySecs > 0 && (
            <p className="text-xs text-slate-600 mt-2">Session paused</p>
          )}
          {!running && displaySecs === 0 && (
            <p className="text-xs text-slate-600 mt-2">Start the timer on the main dashboard</p>
          )}

          {/* Quick stats — 4 equal pills in a row */}
          <div className="mt-4 flex gap-2">
            <StatBox
              label="Focus"
              value={displaySecs > 0 ? fmtSecs(displaySecs) : '—'}
              color={displaySecs > 0 ? 'text-indigo-300' : 'text-slate-600'}
            />
            <StatBox
              label="Content"
              value={totalContentToday > 0 ? fmtMins(totalContentToday) : '—'}
              color={totalContentToday > 0 ? 'text-emerald-300' : 'text-slate-600'}
            />
            <StatBox
              label="Lectures"
              value={totalLectureToday || '—'}
              color="text-violet-300"
            />
            {streak > 0 && (
              <StatBox label="Streak" value={`${streak}🔥`} color="text-amber-300" />
            )}
          </div>
        </div>

        {/* ── Combined daily goal ────────────────────────────────── */}
        {showCombined && (
          <div className={`rounded-2xl border p-4 transition-colors ${
            combinedMet ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-slate-800 bg-slate-900/30'
          }`}>
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Target size={12} className={`flex-shrink-0 ${combinedMet ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 truncate">
                  Combined Goal
                </span>
                <span className="text-[9px] text-slate-600 flex-shrink-0">
                  ({studiedWithGoal.map(s => s.shortName).join(' + ')})
                </span>
              </div>
              <span className={`text-[10px] font-bold font-mono flex-shrink-0 ${combinedMet ? 'text-emerald-400' : 'text-slate-400'}`}>
                {combinedMet
                  ? `✓ Done!`
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
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-slate-600 font-mono">{combinedPct.toFixed(0)}%</span>
              {!combinedMet && (
                <span className="text-[9px] text-slate-600 font-mono">
                  {fmtMins(Math.max(combinedGoalMins - combinedContent, 0))} left
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Subject cards ──────────────────────────────────────── */}
        {studiedSubjects.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} className="text-slate-500 flex-shrink-0" />
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {studiedSubjects.length === 1 ? studiedSubjects[0].name : 'Subject Breakdown'}
              </h2>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            {/* Always single column on mobile, 2-col on sm+ when multiple */}
            <div className={`grid gap-3 ${studiedSubjects.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
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
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm text-slate-400 font-medium">No activity yet today</p>
            <p className="text-xs text-slate-600 mt-1">
              Start the timer or tick a lecture on the main dashboard
            </p>
          </div>
        )}

        {/* ── All-course progress ────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={12} className="text-slate-500" />
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">All-Course Progress</h2>
            </div>
            <span className="text-[10px] font-bold font-mono text-slate-400">
              {totalAllDone}/{totalAllLectures}
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
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 min-w-0 truncate">
                      <span className="flex-shrink-0">{subj.icon}</span>
                      <span className="truncate">{subj.shortName}</span>
                    </span>
                    <span className={`text-[9px] font-mono font-semibold flex-shrink-0 ${ac.label}`}>
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
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">Combined</span>
              <span className="text-[9px] font-mono text-slate-500">{totalAllPct.toFixed(1)}%</span>
            </div>
            <ProgressBar
              pct={totalAllPct}
              gradient="linear-gradient(90deg,#6366f1,#7c3aed,#c4b5fd)"
              height="h-2"
            />
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <p className="text-center text-[9px] text-slate-700 font-mono pb-2">
          Live via Firebase
          {stats?.updatedAt && ` · ${updatedLabel(stats.updatedAt)}`}
        </p>
      </main>
    </div>
  );
}

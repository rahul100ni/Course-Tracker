import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, ChevronDown, ChevronRight, ChevronUp,
  Clock, CheckCircle2, BookOpen, Zap, Timer, TrendingUp,
  Circle, CheckSquare, Target, Flame, BarChart3, Calendar, Settings,
} from 'lucide-react';
import { SUBJECTS, SUBJECT_LIST } from './subjects/index';
import { ref, set, get } from 'firebase/database';
import { db } from './firebase';

/* ═══════════════════════════════════════════════════════════════
   STORAGE KEYS (v5 — multi-subject)
═══════════════════════════════════════════════════════════════ */
const K = {
  TIMER:               'cst_v5_global_timer',
  DAILY_STUDY:         'cst_v5_global_daily_study',
  SUBJECT_DAILY_STUDY: 'cst_v5_subject_daily_study',
  ACTIVE_SUBJECT:      'cst_v5_active_subject',
  SUBJECT_SETTINGS:    'cst_v5_subject_settings',
  // Per-subject: cst_v5_{id}_completed  and  cst_v5_{id}_lecture_dates
  completed:    (id) => `cst_v5_${id}_completed`,
  lectureDates: (id) => `cst_v5_${id}_lecture_dates`,
};

/* ═══════════════════════════════════════════════════════════════
   PURE UTILITIES
═══════════════════════════════════════════════════════════════ */
const ls  = (key, fb) => { try { return JSON.parse(localStorage.getItem(key)) ?? fb; } catch { return fb; } };
const ss  = (key, v)  => localStorage.setItem(key, JSON.stringify(v));

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupBySection(data) {
  const map = new Map();
  data.forEach(item => {
    if (!map.has(item.section)) map.set(item.section, []);
    map.get(item.section).push(item);
  });
  return [...map.entries()].map(([section, lectures]) => ({
    section,
    lectures,
    totalMins: lectures.reduce((s, l) => s + l.duration, 0),
  }));
}

function fmtClock(s) {
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(n => String(n).padStart(2, '0'))
    .join(':');
}
function fmtMins(m) {
  const h = Math.floor(m / 60), min = m % 60;
  if (h && min) return `${h}h ${min}m`;
  if (h)        return `${h}h`;
  return        `${min}m`;
}
function fmtSecs(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h)      return `${h}h`;
  if (m)      return `${m}m`;
  return      `${s % 60}s`;
}

function dateLabel(ds) {
  const d   = new Date(ds + 'T00:00:00');
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7)   return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}
function fullDateLabel(ds) {
  return new Date(ds + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ═══════════════════════════════════════════════════════════════
   TIMER INIT — unchanged logic, new key
═══════════════════════════════════════════════════════════════ */
function initTimer() {
  const saved = ls(K.TIMER, {});
  if (saved.sessionStartTs) {
    const elapsed = Math.max(0, Math.floor((Date.now() - saved.sessionStartTs) / 1000));
    return { elapsed, running: true, startTs: saved.sessionStartTs };
  }
  return { elapsed: saved.sessionElapsed ?? 0, running: false, startTs: null };
}

function initDailyStudy() {
  const ds    = { ...ls(K.DAILY_STUDY, {}) };
  const saved = ls(K.TIMER, {});
  if (saved.sessionStartTs && saved.lastSavedTs) {
    const awaySeconds = Math.max(0, Math.floor((Date.now() - saved.lastSavedTs) / 1000));
    if (awaySeconds > 0) {
      const today = todayISO();
      ds[today]   = (ds[today] ?? 0) + awaySeconds;
      ss(K.DAILY_STUDY, ds);
    }
  }
  return ds;
}

/* ═══════════════════════════════════════════════════════════════
   ACCENT COLOUR MAP (used by MetricCard, DailyGoalCard, tabs)
═══════════════════════════════════════════════════════════════ */
const ACCENT = {
  indigo: {
    wrap: 'border-indigo-500/20 bg-indigo-500/10',
    icon: 'text-indigo-400 bg-indigo-500/15',
    text: 'text-indigo-300',
    tab:  'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    ring: 'ring-indigo-500/30',
  },
  violet: {
    wrap: 'border-violet-500/20 bg-violet-500/10',
    icon: 'text-violet-400 bg-violet-500/15',
    text: 'text-violet-300',
    tab:  'bg-violet-500/20 text-violet-300 border-violet-500/40',
    ring: 'ring-violet-500/30',
  },
  emerald: {
    wrap: 'border-emerald-500/20 bg-emerald-500/10',
    icon: 'text-emerald-400 bg-emerald-500/15',
    text: 'text-emerald-300',
    tab:  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    ring: 'ring-emerald-500/30',
  },
  amber: {
    wrap: 'border-amber-500/20 bg-amber-500/10',
    icon: 'text-amber-400 bg-amber-500/15',
    text: 'text-amber-300',
    tab:  'bg-amber-500/20 text-amber-300 border-amber-500/40',
    ring: 'ring-amber-500/30',
  },
};

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: MetricCard
═══════════════════════════════════════════════════════════════ */
function MetricCard({ icon: Icon, label, value, sub, accent = 'indigo' }) {
  const s = ACCENT[accent] || ACCENT.indigo;
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${s.wrap}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.icon}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">{label}</p>
        <p className={`text-xl font-bold font-mono leading-none ${s.text}`}>{value}</p>
        {sub && <p className="text-xs text-slate-600 mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: CourseProgressBar
═══════════════════════════════════════════════════════════════ */
function CourseProgressBar({ pct, accent = 'indigo' }) {
  const gradients = {
    indigo: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)',
    violet: 'linear-gradient(90deg,#7c3aed,#8b5cf6,#c4b5fd)',
    emerald: 'linear-gradient(90deg,#10b981,#34d399)',
    amber: 'linear-gradient(90deg,#f59e0b,#fbbf24)',
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Overall Progress</span>
        <span className={`text-sm font-bold font-mono ${ACCENT[accent]?.text || 'text-indigo-300'}`}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: gradients[accent] || gradients.indigo }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-slate-600">0%</span>
        <span className="text-xs text-slate-600">100%</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: Stopwatch
   ─────────────────────────────────────────────────────────────
   Props:
     onTick(delta)           called every second while running
     onAdjust(deltaMinutes)  called when user manually edits time
     onReset()               called when user resets (App zeros dailyStudy)
     firebaseInitialElapsed  seconds loaded once from Firebase on mount
     onRunningChange(bool)   called when start/pause/reset

   KEY DESIGN RULES (never violate):
   - setInterval is NEVER started inside a React state-updater function.
     Doing so causes React StrictMode to double-invoke it and creates
     duplicate intervals (observed as 1→2→4 jumps).
   - The interval is exclusively managed by a useEffect that watches
     the `running` boolean.
   - elapsedRef is the single source of truth for elapsed seconds;
     `elapsed` state is only for rendering.
   - firebaseInitialElapsed is consumed exactly once via a ref-guard;
     it must not be passed as a live-changing value from the parent.
═══════════════════════════════════════════════════════════════ */
function Stopwatch({ onTick, onAdjust, onReset, firebaseInitialElapsed, onRunningChange }) {
  const [elapsed, setElapsed] = useState(() => initTimer().elapsed);
  const [running, setRunning] = useState(() => initTimer().running);
  const elapsedRef            = useRef(elapsed);
  const runningRef            = useRef(running);
  const startTsRef            = useRef(null);          // wall-clock start
  const firebaseInitSyncedRef = useRef(false);
  const onTickRef             = useRef(onTick);        // always-current refs so the
  const persistTimerStableRef = useRef(null);         //   interval closure never goes stale

  // Keep onTick ref current
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  // ── persistTimer (stable, no closure over state) ─────────────
  const persistTimer = useCallback((el, run, startTs) => {
    const payload = run
      ? { sessionStartTs: startTs, sessionElapsed: el, lastSavedTs: Date.now() }
      : { sessionElapsed: el, sessionStartTs: null,    lastSavedTs: Date.now() };
    ss(K.TIMER, payload);
    set(ref(db, 'users/rahul/global/timer'), payload).catch(console.error);
  }, []);
  useEffect(() => { persistTimerStableRef.current = persistTimer; }, [persistTimer]);

  // ── Sync from Firebase exactly once ──────────────────────────
  useEffect(() => {
    if (firebaseInitialElapsed === null) return;
    if (firebaseInitSyncedRef.current) return;
    firebaseInitSyncedRef.current = true;
    elapsedRef.current = firebaseInitialElapsed;
    setElapsed(firebaseInitialElapsed);
  }, [firebaseInitialElapsed]);

  // ── Interval managed entirely by useEffect (StrictMode-safe) ─
  useEffect(() => {
    if (!running) {
      // Cleanup if interval is still running (e.g. after reset)
      return;
    }
    // Compute startTs from current elapsed so resuming is seamless
    const startTs = Date.now() - elapsedRef.current * 1000;
    startTsRef.current = startTs;
    persistTimerStableRef.current?.(elapsedRef.current, true, startTs);

    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
      onTickRef.current?.(1);
      if (elapsedRef.current % 10 === 0) {
        persistTimerStableRef.current?.(elapsedRef.current, true, startTs);
      }
    }, 1000);

    return () => {
      clearInterval(id);
      // Persist paused state when effect tears down
      persistTimerStableRef.current?.(elapsedRef.current, false, null);
    };
  }, [running]); // ← only re-runs when running flips

  // ── Controls ─────────────────────────────────────────────────
  const toggle = useCallback(() => {
    setRunning(prev => {
      const next = !prev;
      runningRef.current = next;
      onRunningChange?.(next);
      return next;
    });
  }, [onRunningChange]);

  const reset = useCallback(() => {
    // 1. Stop running → useEffect cleanup will clear the interval
    setRunning(false);
    runningRef.current = false;
    onRunningChange?.(false);
    // 2. Zero the display
    elapsedRef.current = 0;
    setElapsed(0);
    // 3. Persist zero to localStorage + Firebase
    persistTimer(0, false, null);
    // 4. Tell App to zero today's dailyStudy so reload doesn't resurrect the old time
    onReset?.();
  }, [onRunningChange, persistTimer, onReset]);

  // ── Edit mode ────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editH, setEditH]       = useState('');
  const [editM, setEditM]       = useState('');

  const startEdit = () => {
    setEditH(String(Math.floor(elapsed / 3600)));
    setEditM(String(Math.floor((elapsed % 3600) / 60)));
    setEditMode(true);
  };
  const saveEdit = () => {
    const newElapsed = (parseInt(editH || '0') * 3600) + (parseInt(editM || '0') * 60);
    const delta      = newElapsed - elapsedRef.current;
    elapsedRef.current = newElapsed;
    setElapsed(newElapsed);
    onAdjust(Math.round(delta / 60));
    persistTimer(newElapsed, running, running ? Date.now() - newElapsed * 1000 : null);
    setEditMode(false);
  };

  if (editMode) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 flex flex-col gap-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Adjust Today's Time</p>
        <div className="flex items-center gap-3 justify-center">
          <div className="flex flex-col items-center gap-1">
            <input
              type="number" min="0" max="23"
              value={editH}
              onChange={e => setEditH(e.target.value)}
              className="w-20 text-center text-2xl font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500">hours</span>
          </div>
          <span className="text-2xl text-slate-500 font-bold pb-4">:</span>
          <div className="flex flex-col items-center gap-1">
            <input
              type="number" min="0" max="59"
              value={editM}
              onChange={e => setEditM(e.target.value)}
              className="w-20 text-center text-2xl font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500">minutes</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">
            Save
          </button>
          <button onClick={() => setEditMode(false)} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-slate-400 border border-slate-700/60 hover:bg-slate-700/40 transition-all">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-3 transition-colors duration-300 ${
      running ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-slate-700/60 bg-slate-800/40'
    }`}>
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Timer size={14} className={running ? 'text-indigo-400' : 'text-slate-500'} />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Today's Study Time</span>
        <span className={`ml-auto flex items-center gap-1.5 text-xs font-semibold ${
          running ? 'text-emerald-400' : 'text-slate-600'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          {running ? 'Live' : 'Paused'}
        </span>
      </div>

      {/* Clock */}
      <div className="text-center py-2">
        <span className={`text-5xl font-bold font-mono tracking-widest tabular-nums transition-colors duration-300 ${
          running ? 'text-indigo-300' : 'text-slate-500'
        }`}>
          {fmtClock(elapsed)}
        </span>
        <p className="text-xs text-slate-600 mt-1.5 h-4">
          {elapsed > 0 ? `${fmtSecs(elapsed)} studied today` : 'Timer not started yet'}
        </p>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          id="timer-toggle"
          onClick={toggle}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            running
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
          }`}
        >
          {running ? <Pause size={14} /> : <Play size={14} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          id="timer-reset"
          onClick={reset}
          className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-semibold text-slate-500 border border-slate-700/60 hover:bg-slate-700/40 hover:text-slate-300 transition-all duration-200"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Subtle adjust link */}
      <div className="text-center">
        <button
          onClick={startEdit}
          className="text-[10px] text-slate-700 hover:text-slate-500 transition-colors uppercase tracking-widest font-semibold"
        >
          ··· adjust time
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: DailyGoalCard (with hidden ⚙ goal editor)
═══════════════════════════════════════════════════════════════ */
function DailyGoalCard({ todayCourseMins, streak, goalMins, onGoalChange, accent = 'indigo' }) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const [noGoal,  setNoGoal]  = useState(false);

  const hasGoal   = goalMins > 0;
  const pct       = hasGoal ? Math.min((todayCourseMins / goalMins) * 100, 100) : 0;
  const remaining = hasGoal ? Math.max(goalMins - todayCourseMins, 0) : 0;
  const met       = hasGoal && todayCourseMins >= goalMins;
  const over      = met ? todayCourseMins - goalMins : 0;

  const barBg = met
    ? 'linear-gradient(90deg,#10b981,#34d399)'
    : pct > 75
    ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
    : accent === 'violet'
    ? 'linear-gradient(90deg,#7c3aed,#8b5cf6)'
    : 'linear-gradient(90deg,#6366f1,#a78bfa)';

  const openEdit = () => {
    setEditVal(hasGoal ? String(Math.round(goalMins / 60)) : '4');
    setNoGoal(!hasGoal);
    setEditing(true);
  };
  const saveEdit = () => {
    if (noGoal) {
      onGoalChange(0);
    } else {
      const h = parseInt(editVal || '4', 10);
      onGoalChange(Math.max(1, h) * 60);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 flex flex-col gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Daily Content Goal</p>
        <div className="flex items-center gap-3">
          <input
            type="number" min="1" max="24"
            value={editVal}
            disabled={noGoal}
            onChange={e => setEditVal(e.target.value)}
            className="w-20 text-center text-xl font-bold font-mono bg-slate-900 border border-slate-700 rounded-lg py-2 text-slate-100 focus:outline-none focus:border-indigo-500 disabled:opacity-30"
          />
          <span className="text-sm text-slate-400">hrs / day</span>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setNoGoal(n => !n)}
            className={`w-8 h-4 rounded-full transition-colors ${noGoal ? 'bg-indigo-500' : 'bg-slate-700'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${noGoal ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-xs text-slate-400">No goal — just study</span>
        </label>
        <div className="flex gap-2">
          <button onClick={saveEdit} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all">Save</button>
          <button onClick={() => setEditing(false)} className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-400 border border-slate-700/60 hover:bg-slate-700/40 transition-all">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors duration-500 ${
      met ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/50 bg-slate-800/30'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className={met ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Daily Content Goal
          </span>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              <Flame size={11} /> {streak}d
            </span>
          )}
          {hasGoal && (
            <span className="text-[10px] font-semibold text-slate-600 font-mono">/ {fmtMins(goalMins)}</span>
          )}
          <button
            onClick={openEdit}
            className="text-slate-700 hover:text-slate-400 transition-colors"
            title="Customise goal"
          >
            <Settings size={12} />
          </button>
        </div>
      </div>

      {/* No-goal mode */}
      {!hasGoal ? (
        <div className="flex flex-col gap-1">
          <p className={`text-2xl font-bold font-mono leading-none ${todayCourseMins > 0 ? 'text-slate-200' : 'text-slate-600'}`}>
            {fmtMins(todayCourseMins) || '0m'}
          </p>
          <p className="text-[10px] text-slate-600">watched today · no goal set</p>
          {todayCourseMins === 0 && (
            <p className="text-xs text-slate-600 mt-1">Tick off lectures below to track today's content</p>
          )}
        </div>
      ) : (
        <>
          {/* Progress numbers — clean two-column */}
          <div className="flex items-end justify-between">
            <div>
              <p className={`text-2xl font-bold font-mono leading-none ${
                met ? 'text-emerald-300' : todayCourseMins > 0 ? 'text-slate-200' : 'text-slate-600'
              }`}>
                {fmtMins(todayCourseMins) || '0m'}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">watched today</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold font-mono leading-none ${met ? 'text-emerald-400' : 'text-slate-500'}`}>
                {met ? `+${fmtMins(over) || '0m'}` : fmtMins(remaining)}
              </p>
              <p className="text-[10px] text-slate-600 mt-1">{met ? 'over goal' : 'remaining'}</p>
            </div>
          </div>

          {/* Bar */}
          <div>
            <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: barBg }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className={`text-[10px] font-semibold font-mono ${met ? 'text-emerald-500' : 'text-slate-600'}`}>
                {pct.toFixed(0)}% complete
              </span>
              <span className="text-[10px] text-slate-700 font-mono">{fmtMins(goalMins)}</span>
            </div>
          </div>

          {/* Status text */}
          <p className="text-xs">
            {met ? (
              <span className="text-emerald-400 font-semibold">🎯 Daily goal hit!{over > 0 ? ` +${fmtMins(over)} bonus` : ''}</span>
            ) : todayCourseMins === 0 ? (
              <span className="text-slate-600">Tick off lectures below to track today's content</span>
            ) : (
              <span className="text-slate-400">
                <span className="text-slate-200 font-semibold">{fmtMins(remaining)}</span> of content left to hit goal
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: LectureRow
═══════════════════════════════════════════════════════════════ */
function LectureRow({ lecture, isCompleted, completedDate, onToggle }) {
  return (
    <button
      id={`lecture-${lecture.id}`}
      onClick={() => onToggle(lecture.id)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 group border-b border-slate-800/40 last:border-b-0 ${
        isCompleted ? 'bg-slate-800/20 hover:bg-slate-800/30' : 'hover:bg-slate-700/20'
      }`}
    >
      <span className="flex-shrink-0 mt-0.5">
        {isCompleted
          ? <CheckSquare size={15} className="text-emerald-400" />
          : <Circle size={15} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
        }
      </span>
      <span className={`flex-1 text-sm leading-snug transition-all ${
        isCompleted ? 'line-through text-slate-600' : 'text-slate-300 group-hover:text-slate-100'
      }`}>
        {lecture.title}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {isCompleted && completedDate && (
          <span className="text-xs text-slate-700 hidden lg:block font-mono">{dateLabel(completedDate)}</span>
        )}
        <span className={`text-xs font-mono tabular-nums ${isCompleted ? 'text-slate-700' : 'text-slate-500'}`}>
          {lecture.duration}m
        </span>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: SectionAccordion
═══════════════════════════════════════════════════════════════ */
const SECTION_ACCENTS = [
  { border: 'border-l-indigo-500',  badge: 'bg-indigo-500/15 text-indigo-300'   },
  { border: 'border-l-violet-500',  badge: 'bg-violet-500/15 text-violet-300'   },
  { border: 'border-l-cyan-500',    badge: 'bg-cyan-500/15 text-cyan-300'       },
  { border: 'border-l-emerald-500', badge: 'bg-emerald-500/15 text-emerald-300' },
  { border: 'border-l-amber-500',   badge: 'bg-amber-500/15 text-amber-300'     },
  { border: 'border-l-rose-500',    badge: 'bg-rose-500/15 text-rose-300'       },
  { border: 'border-l-sky-500',     badge: 'bg-sky-500/15 text-sky-300'         },
  { border: 'border-l-fuchsia-500', badge: 'bg-fuchsia-500/15 text-fuchsia-300' },
];

function SectionAccordion({ sectionData, completedIds, lectureDates, onToggle, sectionIndex }) {
  const [open, setOpen] = useState(false);
  const { section, lectures, totalMins } = sectionData;

  const completedLectures = lectures.filter(l => completedIds.has(l.id));
  const completedCount    = completedLectures.length;
  const completedMins     = completedLectures.reduce((s, l) => s + l.duration, 0);
  const pct               = lectures.length > 0 ? (completedCount / lectures.length) * 100 : 0;
  const allDone           = completedCount === lectures.length;
  const a                 = SECTION_ACCENTS[sectionIndex % SECTION_ACCENTS.length];

  return (
    <div className={`rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden border-l-2 ${a.border} hover:border-slate-700/70 transition-colors`}>
      <button
        id={`section-${sectionIndex}`}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-700/20 transition-colors text-left group"
      >
        <span className="flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className={`flex-1 text-sm font-semibold leading-snug ${allDone ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
          {section}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:block w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: allDone ? '#34d399' : 'linear-gradient(90deg,#6366f1,#a78bfa)' }}
            />
          </div>
          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${a.badge}`}>
            {completedCount}/{lectures.length}
          </span>
          <span className="text-xs text-slate-500 font-mono hidden md:block">
            {allDone ? `✓ ${fmtMins(totalMins)}` : `${fmtMins(completedMins)} / ${fmtMins(totalMins)}`}
          </span>
          {allDone && <CheckCircle2 size={15} className="text-emerald-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-700/40">
          {lectures.map(l => (
            <LectureRow
              key={l.id}
              lecture={l}
              isCompleted={completedIds.has(l.id)}
              completedDate={lectureDates[l.id]}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: StudyHistory — multi-subject aware
═══════════════════════════════════════════════════════════════ */
function StudyHistory({ mergedHistory, subjectSettings }) {
  const [expanded, setExpanded] = useState(true);

  const days = useMemo(
    () => Object.entries(mergedHistory).sort(([a], [b]) => b.localeCompare(a)).slice(0, 90),
    [mergedHistory]
  );

  const totalGoalMins = useMemo(() => {
    return SUBJECT_LIST.reduce((sum, s) => {
      const g = subjectSettings[s.id]?.dailyGoalMins;
      return sum + (g !== undefined ? g : s.defaultDailyGoalMins);
    }, 0);
  }, [subjectSettings]);

  const statsSummary = useMemo(() => {
    const entries = Object.entries(mergedHistory);
    if (entries.length === 0) return null;

    let totalSecs = 0, totalContentMins = 0, goalsMetCount = 0, maxMins = 0, maxDate = '';
    const oneWeekAgoStr = (() => {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return d.toLocaleDateString('en-CA');
    })();
    let weeklySecs = 0, weeklyMins = 0;

    entries.forEach(([date, data]) => {
      const secs  = data.studiedSeconds || 0;
      const mins  = Object.values(data.subjects || {}).reduce((s, sd) => s + (sd.courseMinutesWatched || 0), 0);
      totalSecs  += secs;
      totalContentMins += mins;
      if (mins >= totalGoalMins && totalGoalMins > 0) goalsMetCount++;
      if (mins > maxMins) { maxMins = mins; maxDate = date; }
      if (date >= oneWeekAgoStr) { weeklySecs += secs; weeklyMins += mins; }
    });

    return {
      totalSecs, totalContentMins, goalsMetCount,
      successRate: entries.length > 0 ? (goalsMetCount / entries.length) * 100 : 0,
      maxMins, maxDate, weeklySecs, weeklyMins, activeDays: entries.length,
    };
  }, [mergedHistory, totalGoalMins]);

  if (days.length === 0) {
    return (
      <section id="study-history" className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 text-center">
        <BarChart3 size={28} className="text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Study History</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No study history yet. Start the timer or tick off a lecture to see daily stats here.
        </p>
      </section>
    );
  }

  const summary = statsSummary;

  return (
    <section id="study-history">
      <button className="w-full flex items-center gap-2 mb-4" onClick={() => setExpanded(e => !e)}>
        <BarChart3 size={15} className="text-slate-400" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Study History</h2>
        <div className="flex-1 h-px bg-slate-800 ml-2" />
        <div className="flex items-center gap-3 mr-2">
          <span className="text-xs text-slate-500 font-mono hidden sm:block">
            {fmtSecs(summary.totalSecs)} timer · {summary.goalsMetCount}/{days.length} goals
          </span>
          <Calendar size={13} className="text-slate-600" />
          <span className="text-xs text-slate-600 font-mono">{days.length}d</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Goal Success Rate', value: `${summary.successRate.toFixed(0)}%`, sub: `${summary.goalsMetCount} / ${summary.activeDays} days`, color: 'text-emerald-400' },
              { label: 'Last 7 Days',        value: fmtSecs(summary.weeklySecs),          sub: `${fmtMins(summary.weeklyMins)} content`,              color: 'text-indigo-300'  },
              { label: 'All-Time Focus',     value: `${Math.round(summary.totalSecs / 3600)}h`, sub: 'total studied',                                  color: 'text-sky-400'     },
              { label: 'Personal Best',      value: summary.maxMins > 0 ? fmtMins(summary.maxMins) : '—', sub: summary.maxDate ? dateLabel(summary.maxDate) : '', color: 'text-amber-400' },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 flex flex-col justify-between">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{item.label}</span>
                <div className="mt-2">
                  <span className={`text-lg font-bold font-mono ${item.color}`}>{item.value}</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Daily records */}
          <div className="space-y-2">
            {days.map(([date, rec]) => {
              const studiedSecs     = rec.studiedSeconds ?? 0;
              const subjectEntries  = Object.entries(rec.subjects || {}).filter(([, sd]) => sd.courseMinutesWatched > 0 || sd.lecturesCompleted > 0);
              const totalContentMin = subjectEntries.reduce((s, [, sd]) => s + (sd.courseMinutesWatched || 0), 0);
              const met             = totalGoalMins > 0 && totalContentMin >= totalGoalMins;
              const goalPct         = totalGoalMins > 0 ? Math.min((totalContentMin / totalGoalMins) * 100, 100) : 0;
              const isToday         = date === todayISO();

              return (
                <div
                  key={date}
                  className={`rounded-xl border p-4 transition-colors ${
                    isToday ? 'border-indigo-500/30 bg-indigo-500/5'
                    : met   ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-slate-700/40 bg-slate-800/20'
                  }`}
                >
                  {/* Top row: date + timer + goal badge */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex-shrink-0 w-24 sm:w-28">
                      <p className={`text-sm font-bold ${isToday ? 'text-indigo-300' : 'text-slate-200'}`}>{dateLabel(date)}</p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{fullDateLabel(date)}</p>
                    </div>

                    <div className="flex-1 flex flex-col gap-1.5">
                      {/* Global timer */}
                      <div className="flex items-center gap-2">
                        <Clock size={11} className="text-sky-500 flex-shrink-0" />
                        <span className={`text-sm font-bold font-mono ${studiedSecs > 0 ? 'text-sky-300' : 'text-slate-600'}`}>
                          {studiedSecs > 0 ? fmtSecs(studiedSecs) : '—'}
                        </span>
                        <span className="text-xs text-slate-500">total study time</span>
                      </div>

                      {/* Per-subject rows */}
                      {subjectEntries.length === 0 ? (
                        <p className="text-xs text-slate-600">No lectures ticked this day</p>
                      ) : (
                        subjectEntries.map(([subId, sd]) => {
                          const subj = SUBJECTS[subId];
                          if (!subj) return null;
                          const subAccent = ACCENT[subj.accent] || ACCENT.indigo;
                          return (
                            <div key={subId} className="flex items-center gap-2">
                              <span className="text-sm flex-shrink-0">{subj.icon}</span>
                              <span className={`text-xs font-semibold ${subAccent.text}`}>{subj.shortName}</span>
                              <span className="text-xs text-slate-400 font-mono">
                                {sd.studiedSeconds > 0 ? fmtSecs(sd.studiedSeconds) + ' · ' : ''}
                                {sd.courseMinutesWatched > 0 ? fmtMins(sd.courseMinutesWatched) + ' content · ' : ''}
                                {sd.lecturesCompleted} lec
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Goal badge */}
                    {totalGoalMins > 0 && (
                      <div className="flex-shrink-0 text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/40 text-slate-600'}`}>
                          {met ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </div>
                        <p className={`text-xs mt-0.5 font-medium ${met ? 'text-emerald-500' : 'text-slate-600'}`}>
                          {met ? 'Met' : 'Missed'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Combined goal bar (only when goal is set and there's content) */}
                  {totalGoalMins > 0 && totalContentMin > 0 && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${goalPct}%`,
                            background: met ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#6366f1,#a78bfa)',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[10px] text-slate-700 font-mono">{fmtMins(totalContentMin)} content</span>
                        <span className="text-[10px] text-slate-700 font-mono">{fmtMins(totalGoalMins)} goal</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════════ */
export default function App() {
  // ── Active subject ────────────────────────────────────────────
  const [activeSubjectId, setActiveSubjectId] = useState(
    () => localStorage.getItem(K.ACTIVE_SUBJECT) || 'algorithms'
  );
  const activeSubject  = SUBJECTS[activeSubjectId] || SUBJECTS.algorithms;
  const lectureList    = activeSubject.lectures;
  const TOTAL_MINS     = useMemo(() => lectureList.reduce((s, l) => s + l.duration, 0), [activeSubjectId]);
  const SECTIONS       = useMemo(() => groupBySection(lectureList), [activeSubjectId]);
  const LECTURE_MAP    = useMemo(() => Object.fromEntries(lectureList.map(l => [l.id, l])), [activeSubjectId]);

  // ── Subject goal settings ─────────────────────────────────────
  const [subjectSettings, setSubjectSettings] = useState(() => ls(K.SUBJECT_SETTINGS, {}));
  const goalMins = useMemo(() => {
    const s = subjectSettings[activeSubjectId];
    return s !== undefined ? s.dailyGoalMins : activeSubject.defaultDailyGoalMins;
  }, [subjectSettings, activeSubjectId]);

  const handleGoalChange = useCallback((newGoalMins) => {
    const next = { ...subjectSettings, [activeSubjectId]: { dailyGoalMins: newGoalMins } };
    setSubjectSettings(next);
    ss(K.SUBJECT_SETTINGS, next);
    set(ref(db, 'users/rahul/global/settings/subjects'), next).catch(console.error);
  }, [subjectSettings, activeSubjectId]);

  // ── Per-subject state: { [subjectId]: { completedIds, lectureDates } } ──
  const [allSubjectsData, setAllSubjectsData] = useState({});
  const allSubjectsDataRef = useRef({});
  useEffect(() => { allSubjectsDataRef.current = allSubjectsData; }, [allSubjectsData]);

  // Convenience accessors for the active subject
  const completedIds = useMemo(() => allSubjectsData[activeSubjectId]?.completedIds ?? new Set(), [allSubjectsData, activeSubjectId]);
  const lectureDates = useMemo(() => allSubjectsData[activeSubjectId]?.lectureDates ?? {}, [allSubjectsData, activeSubjectId]);
  const completedIdsRef = useRef(completedIds);
  const lectureDatesRef = useRef(lectureDates);
  useEffect(() => { completedIdsRef.current = completedIds; }, [completedIds]);
  useEffect(() => { lectureDatesRef.current = lectureDates; }, [lectureDates]);

  // ── Global timer + daily study ────────────────────────────────
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [dailyStudy,     setDailyStudy]     = useState({});
  const dailyStudyRef = useRef(dailyStudy);
  useEffect(() => { dailyStudyRef.current = dailyStudy; }, [dailyStudy]);

  // ── Per-subject timer tracking ────────────────────────────────
  // subjectDailyStudy: { "YYYY-MM-DD": { algorithms: secs, toc: secs } }
  const [subjectDailyStudy, setSubjectDailyStudy] = useState(() => ls(K.SUBJECT_DAILY_STUDY, {}));
  const subjectDailyStudyRef = useRef(subjectDailyStudy);
  useEffect(() => { subjectDailyStudyRef.current = subjectDailyStudy; }, [subjectDailyStudy]);
  // Records the value of dailyStudy[today] at the moment of the last subject switch
  const subjectSwitchBaseRef = useRef(null);

  // ── Derived analytics for active subject ─────────────────────
  const completedMins = useMemo(
    () => lectureList.filter(l => completedIds.has(l.id)).reduce((s, l) => s + l.duration, 0),
    [completedIds, lectureList]
  );
  const remainingMins = TOTAL_MINS - completedMins;
  const coursePct     = TOTAL_MINS > 0 ? (completedMins / TOTAL_MINS) * 100 : 0;

  const todayCourseMins = useMemo(() => {
    const today = todayISO();
    return lectureList
      .filter(l => completedIds.has(l.id) && lectureDates[l.id] === today)
      .reduce((s, l) => s + l.duration, 0);
  }, [completedIds, lectureDates, lectureList]);

  // ── Merged history (multi-subject aware) ─────────────────────
  const mergedHistory = useMemo(() => {
    const result = {};

    // Aggregate lecture data per day per subject
    SUBJECT_LIST.forEach(subj => {
      const subjData = allSubjectsData[subj.id];
      if (!subjData) return;
      const ld = subjData.lectureDates || {};
      const lm = Object.fromEntries(subj.lectures.map(l => [l.id, l]));
      Object.entries(ld).forEach(([idStr, date]) => {
        const lecture = lm[Number(idStr)];
        if (!lecture) return;
        if (!result[date]) result[date] = { studiedSeconds: 0, subjects: {} };
        if (!result[date].subjects[subj.id]) {
          result[date].subjects[subj.id] = { lecturesCompleted: 0, courseMinutesWatched: 0, studiedSeconds: 0 };
        }
        result[date].subjects[subj.id].lecturesCompleted++;
        result[date].subjects[subj.id].courseMinutesWatched += lecture.duration;
      });
    });

    // Add global timer seconds per day
    Object.entries(dailyStudy).forEach(([date, secs]) => {
      if (!result[date]) result[date] = { studiedSeconds: 0, subjects: {} };
      result[date].studiedSeconds = secs;
    });

    // Add per-subject timer seconds per day
    Object.entries(subjectDailyStudy).forEach(([date, subjSecs]) => {
      if (!result[date]) result[date] = { studiedSeconds: 0, subjects: {} };
      Object.entries(subjSecs).forEach(([subId, secs]) => {
        if (!result[date].subjects[subId]) {
          result[date].subjects[subId] = { lecturesCompleted: 0, courseMinutesWatched: 0, studiedSeconds: 0 };
        }
        result[date].subjects[subId].studiedSeconds = secs;
      });
    });

    return result;
  }, [allSubjectsData, dailyStudy, subjectDailyStudy]);

  // ── Streak (based on active subject's goal) ───────────────────
  const streak = useMemo(() => {
    if (goalMins <= 0) return 0;
    let s = 0;
    const d = new Date();
    while (true) {
      const ds   = d.toLocaleDateString('en-CA');
      const subj = mergedHistory[ds]?.subjects?.[activeSubjectId];
      const mins = subj?.courseMinutesWatched ?? 0;
      if (mins < goalMins) break;
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [mergedHistory, activeSubjectId, goalMins]);

  // ── Firebase load + migration ─────────────────────────────────
  useEffect(() => {
    const globalRef  = ref(db, 'users/rahul/global');
    const oldStatsRef = ref(db, 'users/rahul/stats');

    get(globalRef).then(async (globalSnap) => {
      // ── ONE-TIME MIGRATION from v4 (stats/) to v5 (global/ + subjects/) ──
      if (!globalSnap.exists() || !globalSnap.val()?.migrated) {
        const oldSnap = await get(oldStatsRef);
        const old     = oldSnap.exists() ? oldSnap.val() : {};

        // Build migrated data
        const migratedCompleted    = old.completed    || [];
        const migratedLectureDates = old.lectureDates || {};
        const migratedDailyStudy   = old.dailyStudy   || {};
        const migratedTimer        = old.timer        || {};
        const migratedSettings     = ls(K.SUBJECT_SETTINGS, {});

        // Seed subjectDailyStudy: credit all old time to algorithms
        const migratedSubjectDs = {};
        Object.entries(migratedDailyStudy).forEach(([date, secs]) => {
          migratedSubjectDs[date] = { algorithms: secs };
        });

        // Write to new paths
        await set(ref(db, 'users/rahul/global/dailyStudy'),         migratedDailyStudy);
        await set(ref(db, 'users/rahul/global/timer'),               migratedTimer);
        await set(ref(db, 'users/rahul/global/subjectDailyStudy'),   migratedSubjectDs);
        await set(ref(db, 'users/rahul/global/settings/subjects'),   migratedSettings);
        await set(ref(db, 'users/rahul/global/migrated'),            true);
        await set(ref(db, 'users/rahul/subjects/algorithms/completed'),    migratedCompleted);
        await set(ref(db, 'users/rahul/subjects/algorithms/lectureDates'), migratedLectureDates);

        // Init all other subjects with empty data
        for (const subj of SUBJECT_LIST) {
          if (subj.id === 'algorithms') continue;
          await set(ref(db, `users/rahul/subjects/${subj.id}/completed`),    []);
          await set(ref(db, `users/rahul/subjects/${subj.id}/lectureDates`), {});
        }

        // Update localStorage keys
        ss(K.DAILY_STUDY,         migratedDailyStudy);
        ss(K.TIMER,               migratedTimer);
        ss(K.SUBJECT_DAILY_STUDY, migratedSubjectDs);
        ss(K.SUBJECT_SETTINGS,    migratedSettings);
        ss(K.completed('algorithms'),    migratedCompleted);
        ss(K.lectureDates('algorithms'), migratedLectureDates);

        // Proceed using migrated data in memory
        const today       = todayISO();
        const todaySecs   = migratedDailyStudy[today] || 0;
        const timerForSW  = { sessionElapsed: todaySecs, sessionStartTs: null, lastSavedTs: Date.now() };
        ss(K.TIMER, timerForSW);

        const newAllSubj = {
          algorithms: { completedIds: new Set(migratedCompleted), lectureDates: migratedLectureDates },
        };
        SUBJECT_LIST.forEach(s => { if (s.id !== 'algorithms') newAllSubj[s.id] = { completedIds: new Set(), lectureDates: {} }; });

        setAllSubjectsData(newAllSubj);
        setDailyStudy(migratedDailyStudy);
        setSubjectDailyStudy(migratedSubjectDs);
        setFirebaseLoaded(true);
        return;
      }

      // ── NORMAL LOAD (already migrated) ──
      const [allSubjSnap, settingsSnap] = await Promise.all([
        get(ref(db, 'users/rahul/subjects')),
        get(ref(db, 'users/rahul/global/settings/subjects')),
      ]);

      // Load global timer + daily study
      const gv              = globalSnap.val() || {};
      let   savedDailyStudy = gv.dailyStudy || {};
      const savedTimer      = gv.timer || {};
      const savedSubjDs     = gv.subjectDailyStudy || {};
      const savedSettings   = settingsSnap.exists() ? settingsSnap.val() : {};

      // Reconcile away-time if timer was running
      if (savedTimer.sessionStartTs && savedTimer.lastSavedTs) {
        const away = Math.max(0, Math.floor((Date.now() - savedTimer.lastSavedTs) / 1000));
        if (away > 0) {
          const today = todayISO();
          savedDailyStudy = { ...savedDailyStudy, [today]: (savedDailyStudy[today] ?? 0) + away };
        }
      }

      // Force elapsed = today's total
      const today     = todayISO();
      const todaySecs = savedDailyStudy[today] || 0;
      const calcTimer = {
        sessionElapsed:  todaySecs,
        sessionStartTs:  savedTimer.sessionStartTs ? Date.now() - todaySecs * 1000 : null,
        lastSavedTs:     Date.now(),
      };
      ss(K.TIMER, calcTimer);
      ss(K.DAILY_STUDY, savedDailyStudy);
      ss(K.SUBJECT_DAILY_STUDY, savedSubjDs);
      ss(K.SUBJECT_SETTINGS, savedSettings);
      set(ref(db, 'users/rahul/global/dailyStudy'), savedDailyStudy).catch(console.error);
      set(ref(db, 'users/rahul/global/timer'), calcTimer).catch(console.error);

      // Load all subjects
      const subjVal    = allSubjSnap.exists() ? allSubjSnap.val() : {};
      const newAllSubj = {};
      for (const subj of SUBJECT_LIST) {
        const sd = subjVal[subj.id] || {};
        const completedArr  = sd.completed    || [];
        const ldObj         = sd.lectureDates || {};
        ss(K.completed(subj.id),    completedArr);
        ss(K.lectureDates(subj.id), ldObj);
        newAllSubj[subj.id] = { completedIds: new Set(completedArr), lectureDates: ldObj };
      }

      setAllSubjectsData(newAllSubj);
      setDailyStudy(savedDailyStudy);
      setSubjectDailyStudy(savedSubjDs);
      setSubjectSettings(savedSettings);
      setFirebaseLoaded(true);
    }).catch(err => {
      console.error('Firebase load failed, using localStorage:', err);
      // Fallback: read everything from localStorage
      const newAllSubj = {};
      SUBJECT_LIST.forEach(s => {
        newAllSubj[s.id] = {
          completedIds: new Set(ls(K.completed(s.id), [])),
          lectureDates: ls(K.lectureDates(s.id), {}),
        };
      });
      setAllSubjectsData(newAllSubj);
      setDailyStudy(initDailyStudy());
      setSubjectDailyStudy(ls(K.SUBJECT_DAILY_STUDY, {}));
      setSubjectSettings(ls(K.SUBJECT_SETTINGS, {}));
      setFirebaseLoaded(true);
    });
  }, []);

  // ── Sync Live Stats to Firebase ──────────────────────────────
  const [timerRunning, setTimerRunning] = useState(false);
  useEffect(() => {
    if (!firebaseLoaded) return;
    const today   = todayISO();
    const subjects = {};

    SUBJECT_LIST.forEach(subj => {
      const sd            = allSubjectsData[subj.id] || {};
      const totalCompleted = sd.completedIds?.size ?? 0;
      const totalLectures  = subj.lectures.length;
      const coursePct      = totalLectures > 0 ? (totalCompleted / totalLectures) * 100 : 0;

      // Content watched today
      const todayEntries = sd.lectureDates
        ? Object.entries(sd.lectureDates).filter(([, d]) => d === today)
        : [];
      const todayCourseMinsSubj = todayEntries.reduce((s, [idStr]) => {
        const lec = subj.lectures.find(l => l.id === Number(idStr));
        return s + (lec?.duration || 0);
      }, 0);
      const completedToday = todayEntries
        .map(([idStr]) => subj.lectures.find(l => l.id === Number(idStr))?.title)
        .filter(Boolean);

      // Effective goal
      const settingsGoal = subjectSettings[subj.id]?.dailyGoalMins;
      const goalMins     = settingsGoal !== undefined ? settingsGoal : subj.defaultDailyGoalMins;

      subjects[subj.id] = {
        todayStudySecs:   subjectDailyStudy[today]?.[subj.id] || 0,
        todayCourseMins:  todayCourseMinsSubj,
        completedToday,
        totalCompleted,
        totalLectures,
        coursePct,
        goalMins,
        totalCourseMins:  subj.lectures.reduce((s, l) => s + l.duration, 0),
      };
    });

    set(ref(db, 'users/rahul/liveStats'), {
      todayStudySeconds: dailyStudy[today] || 0,
      timerRunning,
      activeSubject:     activeSubjectId,
      streak,
      subjects,
      updatedAt:         new Date().toISOString(),
    }).catch(err => console.error('Firebase liveStats sync failed:', err));
  }, [dailyStudy, allSubjectsData, subjectDailyStudy, firebaseLoaded, timerRunning, activeSubjectId, subjectSettings, streak]);

  // ── Timer tick ────────────────────────────────────────────────
  const handleTimerTick = useCallback((delta = 1) => {
    if (dailyStudyRef.current == null) return;
    const today = todayISO();

    // Global daily study
    const nextDs = { ...dailyStudyRef.current, [today]: (dailyStudyRef.current[today] ?? 0) + delta };
    dailyStudyRef.current = nextDs;
    ss(K.DAILY_STUDY, nextDs);
    // Throttle Firebase write to every 10 s
    if (nextDs[today] % 10 === 0) {
      set(ref(db, 'users/rahul/global/dailyStudy'), nextDs).catch(console.error);
    }
    setDailyStudy(nextDs);

    // Per-subject credit
    const nextSDs  = { ...subjectDailyStudyRef.current };
    if (!nextSDs[today]) nextSDs[today] = {};
    const activeId = localStorage.getItem(K.ACTIVE_SUBJECT) || 'algorithms';
    nextSDs[today][activeId] = (nextSDs[today][activeId] ?? 0) + delta;
    subjectDailyStudyRef.current = nextSDs;
    ss(K.SUBJECT_DAILY_STUDY, nextSDs);
    if (nextDs[today] % 10 === 0) {
      set(ref(db, 'users/rahul/global/subjectDailyStudy'), nextSDs).catch(console.error);
    }
    setSubjectDailyStudy(nextSDs);
  }, []);

  const handleTimerAdjust = useCallback((deltaMinutes) => {
    if (dailyStudyRef.current == null) return;
    const today  = todayISO();
    const nextDs = {
      ...dailyStudyRef.current,
      [today]: Math.max(0, (dailyStudyRef.current[today] ?? 0) + deltaMinutes * 60),
    };
    dailyStudyRef.current = nextDs;
    ss(K.DAILY_STUDY, nextDs);
    set(ref(db, 'users/rahul/global/dailyStudy'), nextDs).catch(console.error);
    setDailyStudy(nextDs);
  }, []);

  // ── Timer reset — zeros today's study time completely ─────────
  const handleTimerReset = useCallback(() => {
    const today  = todayISO();
    // Zero global daily study for today
    const nextDs = { ...dailyStudyRef.current, [today]: 0 };
    dailyStudyRef.current = nextDs;
    ss(K.DAILY_STUDY, nextDs);
    set(ref(db, 'users/rahul/global/dailyStudy'), nextDs).catch(console.error);
    setDailyStudy(nextDs);
    // Zero per-subject study for today
    const nextSDs = { ...subjectDailyStudyRef.current, [today]: {} };
    subjectDailyStudyRef.current = nextSDs;
    ss(K.SUBJECT_DAILY_STUDY, nextSDs);
    set(ref(db, 'users/rahul/global/subjectDailyStudy'), nextSDs).catch(console.error);
    setSubjectDailyStudy(nextSDs);
  }, []);

  // ── Subject switch ─────────────────────────────────────────────
  const switchSubject = useCallback((newId) => {
    if (newId === activeSubjectId) return;
    const today    = todayISO();
    const totalNow = dailyStudyRef.current[today] ?? 0;
    const base     = subjectSwitchBaseRef.current ?? 0;
    const delta    = totalNow - base;

    if (delta > 0) {
      const nextSDs = { ...subjectDailyStudyRef.current };
      if (!nextSDs[today]) nextSDs[today] = {};
      nextSDs[today][activeSubjectId] = (nextSDs[today][activeSubjectId] ?? 0) + delta;
      subjectDailyStudyRef.current = nextSDs;
      ss(K.SUBJECT_DAILY_STUDY, nextSDs);
      set(ref(db, 'users/rahul/global/subjectDailyStudy'), nextSDs).catch(console.error);
      setSubjectDailyStudy(nextSDs);
    }

    subjectSwitchBaseRef.current = totalNow;
    localStorage.setItem(K.ACTIVE_SUBJECT, newId);
    setActiveSubjectId(newId);
  }, [activeSubjectId]);

  // ── Lecture toggle ────────────────────────────────────────────
  const toggleLecture = useCallback((id) => {
    const today       = todayISO();
    const subjId      = activeSubjectId;
    const current     = allSubjectsDataRef.current[subjId] || { completedIds: new Set(), lectureDates: {} };
    const isCompleted = current.completedIds.has(id);

    const nextIds   = new Set(current.completedIds);
    const nextDates = { ...current.lectureDates };

    if (isCompleted) {
      nextIds.delete(id);
      delete nextDates[id];
    } else {
      nextIds.add(id);
      nextDates[id] = today;
    }

    const arrayIds = [...nextIds];
    ss(K.completed(subjId),    arrayIds);
    ss(K.lectureDates(subjId), nextDates);
    set(ref(db, `users/rahul/subjects/${subjId}/completed`),    arrayIds).catch(console.error);
    set(ref(db, `users/rahul/subjects/${subjId}/lectureDates`), nextDates).catch(console.error);

    setAllSubjectsData(prev => ({
      ...prev,
      [subjId]: { completedIds: nextIds, lectureDates: nextDates },
    }));
  }, [activeSubjectId]);

  /* ── Render ─────────────────────────────────────────────────── */
  if (!firebaseLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium tracking-wide">Syncing study progress...</p>
        </div>
      </div>
    );
  }

  const subjectAccent = ACCENT[activeSubject.accent] || ACCENT.indigo;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen size={14} className="text-indigo-400" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-slate-100 leading-none">Study Tracker</h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-none">Deep Focus Dashboard</p>
            </div>
          </div>

          {/* Subject Tab Switcher */}
          <div className="flex items-center gap-1.5 flex-1 overflow-x-auto scrollbar-none">
            {SUBJECT_LIST.map(subj => {
              const isActive = subj.id === activeSubjectId;
              const subjData = allSubjectsData[subj.id] || {};
              const done     = subjData.completedIds?.size ?? 0;
              const total    = subj.lectures.length;
              const ac       = ACCENT[subj.accent] || ACCENT.indigo;
              return (
                <button
                  key={subj.id}
                  onClick={() => switchSubject(subj.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? `${ac.tab} shadow-sm`
                      : 'text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700 bg-transparent'
                  }`}
                >
                  <span>{subj.icon}</span>
                  <span>{subj.shortName}</span>
                  <span className={`font-mono text-[10px] ${isActive ? 'opacity-70' : 'opacity-40'}`}>
                    {done}/{total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: streak + progress dot */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {streak > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Flame size={11} /> {streak}d
              </span>
            )}
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: coursePct === 100 ? '#34d399' : coursePct > 0 ? '#6366f1' : '#475569' }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Row 1: Analytics + Timer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <MetricCard icon={Clock}        label="Total Duration" value={fmtMins(TOTAL_MINS)}    sub={`${lectureList.length} lectures`}              accent={activeSubject.accent} />
              <MetricCard icon={CheckCircle2} label="Completed"      value={fmtMins(completedMins)} sub={`${completedIds.size} done`}                   accent="emerald" />
              <MetricCard icon={TrendingUp}   label="Remaining"      value={fmtMins(remainingMins)} sub={`${lectureList.length - completedIds.size} left`} accent="amber" />
            </div>
            <div className="flex-1 rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={13} className={subjectAccent.text} />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {activeSubject.icon} {activeSubject.name} — Course Progress
                </span>
              </div>
              <CourseProgressBar pct={coursePct} accent={activeSubject.accent} />
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Sections',  value: SECTIONS.length,                              color: subjectAccent.text    },
                  { label: 'Done',      value: completedIds.size,                            color: 'text-emerald-300' },
                  { label: 'Remaining', value: lectureList.length - completedIds.size,       color: 'text-amber-300'   },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-slate-900/50 border border-slate-800/80 py-2.5">
                    <p className={`text-base font-bold font-mono ${item.color}`}>{item.value}</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-3">
            <Stopwatch
              onTick={handleTimerTick}
              onAdjust={handleTimerAdjust}
              onReset={handleTimerReset}
              firebaseInitialElapsed={firebaseLoaded ? (dailyStudy[todayISO()] ?? 0) : null}
              onRunningChange={setTimerRunning}
            />
            <DailyGoalCard
              todayCourseMins={todayCourseMins}
              streak={streak}
              goalMins={goalMins}
              onGoalChange={handleGoalChange}
              accent={activeSubject.accent}
            />
          </div>
        </div>

        {/* Syllabus */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              {activeSubject.icon} {activeSubject.name} — Syllabus
            </h2>
            <div className="flex-1 h-px bg-slate-800 ml-2" />
            <span className="text-xs text-slate-600 font-mono">{SECTIONS.length} sections</span>
          </div>
          <div className="space-y-2">
            {SECTIONS.map((sec, idx) => (
              <SectionAccordion
                key={sec.section}
                sectionData={sec}
                completedIds={completedIds}
                lectureDates={lectureDates}
                onToggle={toggleLecture}
                sectionIndex={idx}
              />
            ))}
          </div>
        </section>

        {/* Study History */}
        <StudyHistory mergedHistory={mergedHistory} subjectSettings={subjectSettings} />

        {/* Footer */}
        <footer className="py-4 border-t border-slate-800/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              All progress synced to Firebase · backed up locally · {new Date().getFullYear()}
            </p>
            <div className="flex gap-2">
              <button
                id="export-data"
                onClick={() => {
                  const subjExport = {};
                  SUBJECT_LIST.forEach(s => {
                    subjExport[s.id] = {
                      completed:    ls(K.completed(s.id), []),
                      lectureDates: ls(K.lectureDates(s.id), {}),
                    };
                  });
                  const payload = {
                    version: 5,
                    exportedAt:        new Date().toISOString(),
                    subjects:          subjExport,
                    dailyStudy:        ls(K.DAILY_STUDY, {}),
                    subjectDailyStudy: ls(K.SUBJECT_DAILY_STUDY, {}),
                    timer:             ls(K.TIMER, {}),
                    subjectSettings:   ls(K.SUBJECT_SETTINGS, {}),
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                  const a    = document.createElement('a');
                  a.href     = URL.createObjectURL(blob);
                  a.download = `study-tracker-backup-${todayISO()}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
              >
                ↓ Export backup
              </button>
              <label
                id="import-data"
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all cursor-pointer"
              >
                ↑ Import backup
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      try {
                        const data = JSON.parse(ev.target.result);
                        if (data.version !== 5) { alert('Incompatible backup version (expected v5).'); return; }
                        if (!confirm('This will overwrite your current progress. Continue?')) return;
                        SUBJECT_LIST.forEach(s => {
                          if (data.subjects?.[s.id]?.completed)    ss(K.completed(s.id),    data.subjects[s.id].completed);
                          if (data.subjects?.[s.id]?.lectureDates) ss(K.lectureDates(s.id), data.subjects[s.id].lectureDates);
                        });
                        if (data.dailyStudy)        ss(K.DAILY_STUDY,         data.dailyStudy);
                        if (data.subjectDailyStudy) ss(K.SUBJECT_DAILY_STUDY, data.subjectDailyStudy);
                        if (data.timer)             ss(K.TIMER,               data.timer);
                        if (data.subjectSettings)   ss(K.SUBJECT_SETTINGS,    data.subjectSettings);
                        localStorage.setItem('cst_backup_imported', 'true');
                        window.location.reload();
                      } catch { alert('Invalid backup file.'); }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

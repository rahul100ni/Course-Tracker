import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, ChevronDown, ChevronRight, ChevronUp,
  Clock, CheckCircle2, BookOpen, Zap, Timer, TrendingUp,
  Circle, CheckSquare, Target, Flame, BarChart3, Calendar,
} from 'lucide-react';
import { COURSE_DATA } from './courseData';
import { ref, set, get } from 'firebase/database';
import { db } from './firebase';

/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const DAILY_GOAL_MINS = 240; // 4 hours of course content

const K = {
  COMPLETED:     'cst_v4_completed_ids',
  // Timer: when RUNNING save only { sessionStartTs }
  //        when PAUSED  save only { sessionElapsed, sessionStartTs: null }
  // This prevents the double-add bug on restore.
  TIMER:        'cst_v4_timer',
  LECTURE_DATES:'cst_v4_lecture_dates',  // { [id]: "YYYY-MM-DD" }
  DAILY_STUDY:  'cst_v4_daily_study',    // { "YYYY-MM-DD": totalSeconds }
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
   MODULE-LEVEL CONSTANTS
═══════════════════════════════════════════════════════════════ */
const TOTAL_MINS  = COURSE_DATA.reduce((s, l) => s + l.duration, 0);
const SECTIONS    = groupBySection(COURSE_DATA);
const LECTURE_MAP = Object.fromEntries(COURSE_DATA.map(l => [l.id, l]));

/* ═══════════════════════════════════════════════════════════════
   TIMER INIT
   ─────────────────────────────────────────────────────────────
   KEY FIX: when the timer is RUNNING we store ONLY sessionStartTs
   (the anchor point = Date.now() – elapsed * 1000).
   On restore we compute:  elapsed = Date.now() – sessionStartTs
   This avoids double-counting sessionElapsed + awayTime.
═══════════════════════════════════════════════════════════════ */
function initTimer() {
  const saved = ls(K.TIMER, {});
  if (saved.sessionStartTs) {
    // Timer was running – derive elapsed purely from anchor
    const elapsed = Math.max(0, Math.floor((Date.now() - saved.sessionStartTs) / 1000));
    return { elapsed, running: true, startTs: saved.sessionStartTs };
  }
  // Timer was paused (or never started)
  return { elapsed: saved.sessionElapsed ?? 0, running: false, startTs: null };
}

/* ═══════════════════════════════════════════════════════════════
   DAILY STUDY INIT
   Adds away-seconds (based on lastSavedTs) to today when restore happens.
═══════════════════════════════════════════════════════════════ */
function initDailyStudy() {
  const ds    = { ...ls(K.DAILY_STUDY, {}) };
  const saved = ls(K.TIMER, {});
  if (saved.sessionStartTs && saved.lastSavedTs) {
    const awaySeconds = Math.max(0, Math.floor((Date.now() - saved.lastSavedTs) / 1000));
    if (awaySeconds > 0) {
      const today     = todayISO();
      ds[today]       = (ds[today] ?? 0) + awaySeconds;
      ss(K.DAILY_STUDY, ds);
    }
  }
  return ds;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: MetricCard
═══════════════════════════════════════════════════════════════ */
function MetricCard({ icon: Icon, label, value, sub, accent }) {
  const styles = {
    indigo:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 ${styles[accent]}`}>
      <div className="mt-0.5 flex-shrink-0"><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-widest opacity-60 mb-1">{label}</p>
        <p className="text-2xl font-bold font-mono leading-none">{value}</p>
        {sub && <p className="text-xs opacity-50 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: CourseProgressBar
═══════════════════════════════════════════════════════════════ */
function CourseProgressBar({ pct }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Overall Progress</span>
        <span className="text-sm font-bold text-indigo-300 font-mono">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)' }}
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
   Fixes:
   1. persistTimer saves ONLY anchor when running (no double-add).
   2. setInterval callback is side-effect only (no setState updater
      side effects → no StrictMode double-fire).
   3. beforeunload shows browser popup when timer is active.
   4. onTick called once per second for daily study tracking.
═══════════════════════════════════════════════════════════════ */
function Stopwatch({ onTick, onAdjust, firebaseInitialElapsed, onRunningChange }) {
  const timerInit              = useMemo(initTimer, []);
  const [elapsed, setElapsed]  = useState(timerInit.elapsed);
  const [running, setRunning]  = useState(timerInit.running);

  const [isEditing, setIsEditing] = useState(false);
  const [editH, setEditH] = useState(0);
  const [editM, setEditM] = useState(0);
  const [editS, setEditS] = useState(0);

  const elapsedRef  = useRef(timerInit.elapsed);
  const runningRef  = useRef(timerInit.running);
  const startTsRef  = useRef(timerInit.startTs);  // anchor: Date.now() – elapsed*1000
  const onTickRef   = useRef(onTick);
  const onAdjustRef = useRef(onAdjust);

  useEffect(() => { elapsedRef.current = elapsed; }, [elapsed]);
  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { onTickRef.current  = onTick;  }, [onTick]);
  useEffect(() => { onAdjustRef.current = onAdjust; }, [onAdjust]);

  // Sync to Firebase-loaded value once it arrives (overrides stale localStorage init)
  const firebaseInitApplied = useRef(false);
  useEffect(() => {
    if (firebaseInitialElapsed == null || firebaseInitApplied.current) return;
    firebaseInitApplied.current = true;
    const newElapsed = firebaseInitialElapsed;
    elapsedRef.current = newElapsed;
    setElapsed(newElapsed);
    // If currently running, re-anchor startTs to keep timer continuous
    if (runningRef.current) {
      startTsRef.current = Date.now() - newElapsed * 1000;
    }
  }, [firebaseInitialElapsed]);

  // persistTimer: ONLY anchor when running, ONLY elapsed when paused, plus lastSavedTs
  const persistTimer = useCallback((el, run) => {
    const timerData = run
      ? { sessionStartTs: startTsRef.current, lastSavedTs: Date.now() }
      : { sessionElapsed: el, sessionStartTs: null, lastSavedTs: Date.now() };
    ss(K.TIMER, timerData);
    set(ref(db, 'users/rahul/stats/timer'), timerData).catch(err => console.error('Timer sync failed:', err));
  }, []);

  // Tick every second — all side effects outside state updaters
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const currentElapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
      const delta = currentElapsed - elapsedRef.current;
      if (delta > 0) {
        elapsedRef.current = currentElapsed;
        setElapsed(currentElapsed);
        persistTimer(currentElapsed, true);
        onTickRef.current?.(delta);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [running, persistTimer]);

  // Catch up and save on visibility change
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistTimer(elapsedRef.current, runningRef.current);
      } else if (document.visibilityState === 'visible' && runningRef.current) {
        const currentElapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        const delta = currentElapsed - elapsedRef.current;
        if (delta > 0) {
          elapsedRef.current = currentElapsed;
          setElapsed(currentElapsed);
          onTickRef.current?.(delta);
          persistTimer(currentElapsed, true);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [persistTimer]);

  // beforeunload: show popup when running, catch up and save
  useEffect(() => {
    const onUnload = (e) => {
      if (runningRef.current) {
        const currentElapsed = Math.floor((Date.now() - startTsRef.current) / 1000);
        const delta = currentElapsed - elapsedRef.current;
        if (delta > 0) {
          onTickRef.current?.(delta);
        }
        persistTimer(currentElapsed, true);

        // Triggers browser's "Leave site?" dialog
        e.preventDefault();
        e.returnValue = '';
      } else {
        persistTimer(elapsedRef.current, false);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [persistTimer]);

  const toggle = () => {
    const next = !runningRef.current;
    if (next) {
      // Set anchor: always derived from current elapsed
      startTsRef.current = Date.now() - elapsedRef.current * 1000;
    }
    setRunning(next);
    persistTimer(elapsedRef.current, next);
    onRunningChange?.(next);
  };

  const reset = () => {
    if (!confirm("Are you sure you want to reset today's study timer? This will clear today's study progress.")) return;
    const oldElapsed = elapsedRef.current;
    setRunning(false);
    setElapsed(0);
    elapsedRef.current  = 0;
    runningRef.current  = false;
    startTsRef.current  = null;
    const resetData = { sessionElapsed: 0, sessionStartTs: null, lastSavedTs: null };
    ss(K.TIMER, resetData);
    set(ref(db, 'users/rahul/stats/timer'), resetData).catch(err => console.error(err));
    onAdjustRef.current?.(-oldElapsed);
    onRunningChange?.(false);
  };

  const startEdit = () => {
    const h = Math.floor(elapsedRef.current / 3600);
    const m = Math.floor((elapsedRef.current % 3600) / 60);
    const s = elapsedRef.current % 60;
    setEditH(h);
    setEditM(m);
    setEditS(s);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const newElapsed = Math.max(0, editH * 3600 + editM * 60 + editS);
    const delta = newElapsed - elapsedRef.current;
    
    elapsedRef.current = newElapsed;
    setElapsed(newElapsed);
    
    if (runningRef.current) {
      startTsRef.current = Date.now() - newElapsed * 1000;
    }
    
    persistTimer(newElapsed, runningRef.current);
    onAdjustRef.current?.(delta);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Timer size={15} />
          <span className="text-xs font-semibold uppercase tracking-widest">Adjust Session Timer</span>
        </div>

        <div className="flex justify-center items-center gap-2 py-2">
          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max="23"
              value={editH}
              onChange={e => setEditH(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-14 bg-slate-900 border border-slate-700 text-slate-200 text-center font-mono text-xl py-1 rounded focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">hr</span>
          </div>
          <span className="text-xl text-slate-600 font-mono">:</span>
          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max="59"
              value={editM}
              onChange={e => setEditM(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-14 bg-slate-900 border border-slate-700 text-slate-200 text-center font-mono text-xl py-1 rounded focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">min</span>
          </div>
          <span className="text-xl text-slate-600 font-mono">:</span>
          <div className="flex flex-col items-center">
            <input
              type="number"
              min="0"
              max="59"
              value={editS}
              onChange={e => setEditS(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-14 bg-slate-900 border border-slate-700 text-slate-200 text-center font-mono text-xl py-1 rounded focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">sec</span>
          </div>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={saveEdit}
            className="px-4 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold hover:bg-indigo-500/30 transition-all duration-200"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-1.5 bg-slate-750/30 text-slate-400 border border-slate-700/40 rounded-lg text-xs font-semibold hover:bg-slate-700/40 transition-all duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Timer size={15} />
        <span className="text-xs font-semibold uppercase tracking-widest">Session Timer</span>
        {running && (
          <span className="ml-auto flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="text-center py-1">
        <span
          className={`text-6xl font-bold font-mono tracking-widest tabular-nums transition-colors duration-300 ${
            running ? 'text-indigo-300' : 'text-slate-400'
          }`}
        >
          {fmtClock(elapsed)}
        </span>
        {elapsed > 0 && !running && (
          <p className="text-xs text-slate-500 mt-1.5">{fmtSecs(elapsed)} this session · paused</p>
        )}
      </div>

      <div className="flex gap-2 justify-center">
        <button
          id="timer-toggle"
          onClick={toggle}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            running
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
          }`}
        >
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button
          id="timer-reset"
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-400 border border-slate-700/60 hover:bg-slate-700/40 hover:text-slate-200 transition-all duration-200"
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      <div className="text-center mt-0.5">
        <button
          onClick={startEdit}
          className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-wider font-bold"
        >
          Adjust Time
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT: DailyGoalCard — based on course content ticked today
═══════════════════════════════════════════════════════════════ */
function DailyGoalCard({ todayCourseMins, streak }) {
  const pct       = Math.min((todayCourseMins / DAILY_GOAL_MINS) * 100, 100);
  const remaining = Math.max(DAILY_GOAL_MINS - todayCourseMins, 0);
  const met       = todayCourseMins >= DAILY_GOAL_MINS;
  const over      = todayCourseMins > DAILY_GOAL_MINS ? todayCourseMins - DAILY_GOAL_MINS : 0;

  const barBg = met
    ? 'linear-gradient(90deg,#10b981,#34d399)'
    : pct > 75
    ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
    : 'linear-gradient(90deg,#6366f1,#a78bfa)';

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-3 transition-colors duration-500 ${
        met ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/50 bg-slate-800/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className={met ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Daily Content Goal · 4h
          </span>
        </div>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <Flame size={11} /> {streak}d
          </span>
        )}
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-2">
          <span className={`text-xl font-bold font-mono ${met ? 'text-emerald-300' : 'text-slate-200'}`}>
            {todayCourseMins > 0 ? fmtMins(todayCourseMins) : '0m'}
          </span>
          <span className="text-xs text-slate-500 font-mono">/ 4h 0m of content</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barBg }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-600 font-mono">{pct.toFixed(0)}%</span>
          <span className="text-xs text-slate-600 font-mono">240m</span>
        </div>
      </div>

      <p className="text-xs">
        {met ? (
          <span className="text-emerald-400 font-semibold">
            🎯 Goal met!{over > 0 ? ` · +${fmtMins(over)} bonus` : ''}
          </span>
        ) : todayCourseMins === 0 ? (
          <span className="text-slate-500">Tick off lectures below to track today's content</span>
        ) : (
          <span className="text-slate-400">
            <span className="text-slate-200 font-semibold">{fmtMins(remaining)}</span> of content left to hit goal
          </span>
        )}
      </p>
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
      <span
        className={`flex-1 text-sm leading-snug transition-all ${
          isCompleted ? 'line-through text-slate-600' : 'text-slate-300 group-hover:text-slate-100'
        }`}
      >
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
const ACCENTS = [
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
  const a                 = ACCENTS[sectionIndex % ACCENTS.length];

  return (
    <div
      className={`rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden border-l-2 ${a.border} hover:border-slate-700/70 transition-colors`}
    >
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
   COMPONENT: StudyHistory
   Shows both session timer hours AND course content per day.
═══════════════════════════════════════════════════════════════ */
function StudyHistory({ mergedHistory }) {
  const [expanded, setExpanded] = useState(true);

  const days = useMemo(
    () => Object.entries(mergedHistory).sort(([a], [b]) => b.localeCompare(a)).slice(0, 90),
    [mergedHistory]
  );

  const statsSummary = useMemo(() => {
    const entries = Object.entries(mergedHistory);
    if (entries.length === 0) return null;

    let totalSecs = 0;
    let totalMins = 0;
    let goalsMetCount = 0;
    let maxMins = 0;
    let maxMinsDate = '';

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = `${oneWeekAgo.getFullYear()}-${String(oneWeekAgo.getMonth() + 1).padStart(2, '0')}-${String(oneWeekAgo.getDate()).padStart(2, '0')}`;
    
    let weeklySecs = 0;
    let weeklyMins = 0;

    entries.forEach(([date, data]) => {
      const mins = data.courseMinutesWatched || 0;
      const secs = data.studiedSeconds || 0;
      totalSecs += secs;
      totalMins += mins;
      if (mins >= DAILY_GOAL_MINS) {
        goalsMetCount++;
      }
      if (mins > maxMins) {
        maxMins = mins;
        maxMinsDate = date;
      }
      if (date >= oneWeekAgoStr) {
        weeklySecs += secs;
        weeklyMins += mins;
      }
    });

    const successRate = entries.length > 0 ? (goalsMetCount / entries.length) * 100 : 0;

    return {
      totalSecs,
      totalMins,
      goalsMetCount,
      successRate,
      maxMins,
      maxMinsDate,
      weeklySecs,
      weeklyMins,
      activeDays: entries.length
    };
  }, [mergedHistory]);

  if (days.length === 0) {
    return (
      <section id="study-history" className="rounded-xl border border-slate-800 bg-slate-900/20 p-6 text-center">
        <BarChart3 size={28} className="text-slate-600 mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-widest text-slate-400">Study History</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No study history recorded yet. Start the timer or complete a lecture to see your daily stats here!
        </p>
      </section>
    );
  }

  const summary = statsSummary || {
    totalSecs: 0,
    totalMins: 0,
    goalsMetCount: 0,
    successRate: 0,
    maxMins: 0,
    maxMinsDate: '',
    weeklySecs: 0,
    weeklyMins: 0,
    activeDays: 0
  };

  return (
    <section id="study-history">
      <button className="w-full flex items-center gap-2 mb-4" onClick={() => setExpanded(e => !e)}>
        <BarChart3 size={15} className="text-slate-400" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Study History</h2>
        <div className="flex-1 h-px bg-slate-800 ml-2" />
        <div className="flex items-center gap-3 mr-2">
          <span className="text-xs text-slate-500 font-mono hidden sm:block">
            {fmtMins(summary.totalMins)} content · {fmtSecs(summary.totalSecs)} timer · {summary.goalsMetCount}/{days.length} goals
          </span>
          <Calendar size={13} className="text-slate-600" />
          <span className="text-xs text-slate-600 font-mono">{days.length}d</span>
        </div>
        {expanded
          ? <ChevronUp size={14} className="text-slate-500" />
          : <ChevronDown size={14} className="text-slate-500" />
        }
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* Dashboard-style Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Goal Success Rate</span>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-lg font-bold font-mono text-emerald-400">{summary.successRate.toFixed(0)}%</span>
                <span className="text-[10px] text-slate-500">{summary.goalsMetCount} / {summary.activeDays} days</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Last 7 Days</span>
              <div className="flex flex-col mt-2">
                <span className="text-sm font-bold font-mono text-indigo-300">{fmtSecs(summary.weeklySecs)} timer</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{fmtMins(summary.weeklyMins)} content</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">All-Time Focus</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-lg font-bold font-mono text-sky-400">{Math.round(summary.totalSecs / 3600)} hrs</span>
                <span className="text-[10px] text-slate-500">total studied</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Personal Best</span>
              <div className="flex flex-col mt-2">
                <span className="text-sm font-bold font-mono text-amber-400">{summary.maxMins > 0 ? fmtMins(summary.maxMins) : '—'}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 truncate">{summary.maxMinsDate ? dateLabel(summary.maxMinsDate) : ''}</span>
              </div>
            </div>
          </div>

          {/* Daily Records List */}
          <div className="space-y-2">
            {days.map(([date, rec]) => {
              const mins          = rec.courseMinutesWatched ?? 0;
              const studiedSecs   = rec.studiedSeconds ?? 0;
              const met           = mins >= DAILY_GOAL_MINS;
              const goalPct       = Math.min((mins / DAILY_GOAL_MINS) * 100, 100);
              const isToday       = date === todayISO();

              return (
                <div
                  key={date}
                  className={`rounded-xl border p-4 transition-colors ${
                    isToday
                      ? 'border-indigo-500/30 bg-indigo-500/5'
                      : met
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : 'border-slate-700/40 bg-slate-800/20'
                  }`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Date */}
                    <div className="flex-shrink-0 w-24 sm:w-28">
                      <p className={`text-sm font-bold ${isToday ? 'text-indigo-300' : 'text-slate-200'}`}>
                        {dateLabel(date)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{fullDateLabel(date)}</p>
                    </div>

                    {/* Stats grid — 4 cols */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Session timer */}
                      <div>
                        <p className={`text-sm font-bold font-mono ${studiedSecs > 0 ? 'text-sky-300' : 'text-slate-600'}`}>
                          {studiedSecs > 0 ? fmtSecs(studiedSecs) : '—'}
                        </p>
                        <p className="text-xs text-slate-500">timer</p>
                      </div>
                      {/* Content watched */}
                      <div>
                        <p className={`text-sm font-bold font-mono ${met ? 'text-emerald-300' : mins > 0 ? 'text-slate-300' : 'text-slate-600'}`}>
                          {mins > 0 ? fmtMins(mins) : '—'}
                        </p>
                        <p className="text-xs text-slate-500">content</p>
                      </div>
                      {/* Lectures */}
                      <div>
                        <p className={`text-sm font-bold font-mono ${(rec.lecturesCompleted ?? 0) > 0 ? 'text-violet-300' : 'text-slate-600'}`}>
                          {rec.lecturesCompleted ?? 0}
                        </p>
                        <p className="text-xs text-slate-500">lectures</p>
                      </div>
                      {/* Cumulative % */}
                      <div>
                        <p className="text-sm font-bold font-mono text-indigo-300">
                          {(rec.completionPct ?? 0).toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">cumul.</p>
                      </div>
                    </div>

                    {/* Goal badge */}
                    <div className="flex-shrink-0 text-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                          met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700/40 text-slate-600'
                        }`}
                      >
                        {met ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </div>
                      <p className={`text-xs mt-0.5 font-medium ${met ? 'text-emerald-500' : 'text-slate-600'}`}>
                        {met ? 'Met' : 'Missed'}
                      </p>
                    </div>
                  </div>

                  {/* Goal bar */}
                  <div className="mt-3">
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${goalPct}%`,
                          background: met
                            ? 'linear-gradient(90deg,#10b981,#34d399)'
                            : 'linear-gradient(90deg,#6366f1,#a78bfa)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between mt-0.5">
                      <span className="text-xs text-slate-700 font-mono">0m content</span>
                      <span className="text-xs text-slate-700 font-mono">240m goal</span>
                    </div>
                  </div>
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
  // ── Persistent state ─────────────────────────────────────────
  const [firebaseLoaded, setFirebaseLoaded] = useState(false);
  const [completedIds, setCompletedIds] = useState(() => new Set());
  const [lectureDates, setLectureDates] = useState({});
  const [dailyStudy,   setDailyStudy]   = useState({});

  // Refs: latest values for use in callbacks without stale closures
  const completedIdsRef = useRef(completedIds);
  const lectureDatesRef = useRef(lectureDates);
  const dailyStudyRef   = useRef(dailyStudy);
  useEffect(() => { completedIdsRef.current = completedIds; }, [completedIds]);
  useEffect(() => { lectureDatesRef.current = lectureDates; }, [lectureDates]);
  useEffect(() => { dailyStudyRef.current   = dailyStudy;   }, [dailyStudy]);

  // ── Derived: course analytics ─────────────────────────────────
  const completedMins = useMemo(
    () => COURSE_DATA.filter(l => completedIds.has(l.id)).reduce((s, l) => s + l.duration, 0),
    [completedIds]
  );
  const remainingMins = TOTAL_MINS - completedMins;
  const coursePct     = TOTAL_MINS > 0 ? (completedMins / TOTAL_MINS) * 100 : 0;

  // ── Derived: today's course minutes (for DailyGoalCard) ───────
  const todayCourseMins = useMemo(() => {
    const today = todayISO();
    return COURSE_DATA
      .filter(l => completedIds.has(l.id) && lectureDates[l.id] === today)
      .reduce((s, l) => s + l.duration, 0);
  }, [completedIds, lectureDates]);

  // ── Derived: course history by day (from lectureDates) ────────
  const courseHistoryByDay = useMemo(() => {
    const map = {};
    Object.entries(lectureDates).forEach(([idStr, date]) => {
      const lecture = LECTURE_MAP[Number(idStr)];
      if (!lecture) return;
      if (!map[date]) map[date] = { lecturesCompleted: 0, courseMinutesWatched: 0, completionPct: 0 };
      map[date].lecturesCompleted++;
      map[date].courseMinutesWatched += lecture.duration;
    });
    // Cumulative completion % in chronological order
    let cumulative = 0;
    Object.keys(map).sort().forEach(day => {
      cumulative += map[day].lecturesCompleted;
      map[day].completionPct = (cumulative / COURSE_DATA.length) * 100;
    });
    return map;
  }, [lectureDates]);

  // ── Derived: merged history (course + timer per day) ──────────
  const mergedHistory = useMemo(() => {
    const result = {};
    Object.entries(courseHistoryByDay).forEach(([date, data]) => {
      result[date] = { ...data };
    });
    Object.entries(dailyStudy).forEach(([date, seconds]) => {
      if (!result[date]) result[date] = { lecturesCompleted: 0, courseMinutesWatched: 0, completionPct: 0 };
      result[date].studiedSeconds = seconds;
    });
    return result;
  }, [courseHistoryByDay, dailyStudy]);

  // ── Derived: streak ──────────────────────────────────────────
  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    while (true) {
      const ds   = d.toLocaleDateString('en-CA');
      const mins = ds === todayISO()
        ? todayCourseMins
        : (courseHistoryByDay[ds]?.courseMinutesWatched ?? 0);
      if (mins < DAILY_GOAL_MINS) break;
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [courseHistoryByDay, todayCourseMins]);

  // ── Fetch Initial Stats from Firebase ─────────────────────────
  useEffect(() => {
    const statsRef = ref(db, 'users/rahul/stats');
    get(statsRef)
      .then((snapshot) => {
        const isBackupImported = localStorage.getItem('cst_backup_imported') === 'true';
        const localTimer = ls(K.TIMER, {});

        let stats = snapshot.val();
        let useLocalCache = isBackupImported;

        // Conflict Resolution: If localStorage has a newer save than Firebase,
        // use local cache to avoid overwriting recent unsaved changes (e.g. on closed tabs)
        if (snapshot.exists() && !isBackupImported) {
          const firebaseTimer = stats.timer || { sessionElapsed: 0, sessionStartTs: null, lastSavedTs: 0 };
          if (localTimer.lastSavedTs && firebaseTimer.lastSavedTs && localTimer.lastSavedTs > firebaseTimer.lastSavedTs) {
            useLocalCache = true;
          }
        }

        if (snapshot.exists() && !useLocalCache) {
          const savedCompleted = stats.completed || [];
          const savedLectureDates = stats.lectureDates || {};
          const savedDailyStudy = stats.dailyStudy || {};
          const savedTimer = stats.timer || { sessionElapsed: 0, sessionStartTs: null, lastSavedTs: null };

          let calculatedDailyStudy = { ...savedDailyStudy };
          let calculatedTimer = { ...savedTimer };
          if (savedTimer.sessionStartTs && savedTimer.lastSavedTs) {
            const awaySeconds = Math.max(0, Math.floor((Date.now() - savedTimer.lastSavedTs) / 1000));
            if (awaySeconds > 0) {
              const today = todayISO();
              calculatedDailyStudy[today] = (calculatedDailyStudy[today] ?? 0) + awaySeconds;
              calculatedTimer.lastSavedTs = Date.now();
            }
          }

          // Force the timer to start from today's cumulative daily study time!
          const today = todayISO();
          const todaySeconds = calculatedDailyStudy[today] || 0;
          calculatedTimer.sessionElapsed = todaySeconds;
          if (calculatedTimer.sessionStartTs) {
            calculatedTimer.sessionStartTs = Date.now() - todaySeconds * 1000;
          }

          // Update localStorage cache
          ss(K.COMPLETED, savedCompleted);
          ss(K.LECTURE_DATES, savedLectureDates);
          ss(K.DAILY_STUDY, calculatedDailyStudy);
          ss(K.TIMER, calculatedTimer);

          // Update Firebase with recalculated daily study/timer
          set(ref(db, 'users/rahul/stats/dailyStudy'), calculatedDailyStudy).catch(err => console.error(err));
          set(ref(db, 'users/rahul/stats/timer'), calculatedTimer).catch(err => console.error(err));

          setCompletedIds(new Set(savedCompleted));
          setLectureDates(savedLectureDates);
          setDailyStudy(calculatedDailyStudy);
        } else {
          // Database is empty OR backup was just imported OR local cache is newer.
          const initialCompleted = ls(K.COMPLETED, []);
          const initialLectureDates = ls(K.LECTURE_DATES, {});
          const initialDailyStudy = ls(K.DAILY_STUDY, {});
          
          // Force initial timer to match today's daily study progress
          const today = todayISO();
          const todaySeconds = initialDailyStudy[today] || 0;
          const initialTimer = {
            sessionElapsed: todaySeconds,
            sessionStartTs: null,
            lastSavedTs: Date.now()
          };

          if (isBackupImported) {
            localStorage.removeItem('cst_backup_imported');
          }

          const initialStats = {
            completed: initialCompleted,
            lectureDates: initialLectureDates,
            dailyStudy: initialDailyStudy,
            timer: initialTimer
          };

          // Save to Firebase
          set(statsRef, initialStats)
            .then(() => {
              ss(K.COMPLETED, initialCompleted);
              ss(K.LECTURE_DATES, initialLectureDates);
              ss(K.DAILY_STUDY, initialDailyStudy);
              ss(K.TIMER, initialTimer);

              setCompletedIds(new Set(initialCompleted));
              setLectureDates(initialLectureDates);
              setDailyStudy(initialDailyStudy);
            })
            .catch(err => console.error('Failed to initialize stats in Firebase:', err));
        }
      })
      .catch((err) => {
        console.error('Failed to fetch stats from Firebase:', err);
        // Fallback to localStorage on error
        setCompletedIds(new Set(ls(K.COMPLETED, [])));
        setLectureDates(ls(K.LECTURE_DATES, {}));
        setDailyStudy(initDailyStudy());
      })
      .finally(() => {
        setFirebaseLoaded(true);
      });
  }, []);

  // ── Sync Live Stats to Firebase ──────────────────────────────
  const [timerRunning, setTimerRunning] = useState(false);
  useEffect(() => {
    if (!firebaseLoaded) return;
    const today = todayISO();
    const completedLecturesToday = COURSE_DATA
      .filter(l => completedIds.has(l.id) && lectureDates[l.id] === today)
      .map(l => l.title);
    
    set(ref(db, 'users/rahul/liveStats'), {
      todayStudySeconds: dailyStudy[today] || 0,
      todayCourseMins,
      completedLecturesToday,
      timerRunning,
      updatedAt: new Date().toISOString()
    }).catch(err => console.error('Firebase sync failed:', err));
  }, [dailyStudy, todayCourseMins, completedIds, lectureDates, firebaseLoaded, timerRunning]);

  // ── Timer tick: update daily study seconds ────────────────────
  // Uses ref-based pattern: read ref → compute next → update ref + storage + state
  // (Never calls setState inside another setState updater)
  const handleTimerTick = useCallback((delta = 1) => {
    if (!dailyStudyRef.current) return;
    const today = todayISO();
    const next  = {
      ...dailyStudyRef.current,
      [today]: (dailyStudyRef.current[today] ?? 0) + delta,
    };
    dailyStudyRef.current = next;   // immediate ref update
    ss(K.DAILY_STUDY, next);        // persist

    // Sync to Firebase
    set(ref(db, 'users/rahul/stats/dailyStudy'), next).catch(err => console.error(err));

    setDailyStudy(next);            // schedule re-render
    setTimerRunning(true);          // keep liveStats in sync
  }, []);

  const handleTimerAdjust = useCallback((delta) => {
    if (!dailyStudyRef.current) return;
    const today = todayISO();
    const next  = {
      ...dailyStudyRef.current,
      [today]: Math.max(0, (dailyStudyRef.current[today] ?? 0) + delta),
    };
    dailyStudyRef.current = next;   // immediate ref update
    ss(K.DAILY_STUDY, next);        // persist

    // Sync to Firebase
    set(ref(db, 'users/rahul/stats/dailyStudy'), next).catch(err => console.error(err));

    setDailyStudy(next);            // schedule re-render
  }, []);

  // ── Lecture toggle ────────────────────────────────────────────
  // Compute both next states from refs, then call both setters with values (no nesting)
  const toggleLecture = useCallback((id) => {
    const today       = todayISO();
    const isCompleted = completedIdsRef.current.has(id);

    const nextIds   = new Set(completedIdsRef.current);
    const nextDates = { ...lectureDatesRef.current };

    if (isCompleted) {
      nextIds.delete(id);
      delete nextDates[id];
    } else {
      nextIds.add(id);
      nextDates[id] = today;
    }

    const arrayIds = [...nextIds];
    ss(K.COMPLETED, arrayIds);
    ss(K.LECTURE_DATES, nextDates);

    // Sync to Firebase
    set(ref(db, 'users/rahul/stats/completed'), arrayIds).catch(err => console.error(err));
    set(ref(db, 'users/rahul/stats/lectureDates'), nextDates).catch(err => console.error(err));

    setCompletedIds(nextIds);
    setLectureDates(nextDates);
  }, []);

  /* ── Render ─────────────────────────────────────────────────── */
  if (!firebaseLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium tracking-wide">Syncing study progress...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <BookOpen size={14} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-none">Algorithms Course Tracker</h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-none">Deep Focus Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                <Flame size={11} /> {streak}d streak
              </span>
            )}
            <span className="text-xs text-slate-500 font-mono">{completedIds.size}/{COURSE_DATA.length}</span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: coursePct === 100 ? '#34d399' : coursePct > 0 ? '#6366f1' : '#475569' }}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Row 1: Analytics + Timer column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Left: metric cards + progress */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCard icon={Clock}        label="Total Duration" value={fmtMins(TOTAL_MINS)}    sub={`${COURSE_DATA.length} lectures`}              accent="indigo"  />
              <MetricCard icon={CheckCircle2} label="Completed"      value={fmtMins(completedMins)} sub={`${completedIds.size} lectures done`}           accent="emerald" />
              <MetricCard icon={TrendingUp}   label="Remaining"      value={fmtMins(remainingMins)} sub={`${COURSE_DATA.length - completedIds.size} left`} accent="amber"   />
            </div>
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className="text-indigo-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Course Progress</span>
              </div>
              <CourseProgressBar pct={coursePct} />
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'Sections',  value: SECTIONS.length },
                  { label: 'Done',      value: completedIds.size },
                  { label: 'Remaining', value: COURSE_DATA.length - completedIds.size },
                ].map(item => (
                  <div key={item.label} className="rounded-lg bg-slate-900/60 border border-slate-800 py-2">
                    <p className="text-lg font-bold font-mono text-slate-200">{item.value}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: timer + daily goal */}
          <div className="lg:col-span-1 flex flex-col gap-3">
            <Stopwatch
              onTick={handleTimerTick}
              onAdjust={handleTimerAdjust}
              firebaseInitialElapsed={firebaseLoaded ? (dailyStudy[todayISO()] ?? 0) : null}
              onRunningChange={setTimerRunning}
            />
            <DailyGoalCard todayCourseMins={todayCourseMins} streak={streak} />
          </div>
        </div>

        {/* Syllabus */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={15} className="text-slate-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Course Syllabus</h2>
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
        <StudyHistory mergedHistory={mergedHistory} />

        {/* Footer */}
        <footer className="py-4 border-t border-slate-800/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">
              All progress synced to Firebase · backed up locally · {new Date().getFullYear()}
            </p>
            <div className="flex gap-2">
              {/* Export */}
              <button
                id="export-data"
                onClick={() => {
                  const payload = {
                    version: 4,
                    exportedAt: new Date().toISOString(),
                    completed:     ls(K.COMPLETED, []),
                    lectureDates:  ls(K.LECTURE_DATES, {}),
                    dailyStudy:    ls(K.DAILY_STUDY, {}),
                    timer:         ls(K.TIMER, {}),
                  };
                  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                  const a    = document.createElement('a');
                  a.href     = URL.createObjectURL(blob);
                  a.download = `course-tracker-backup-${todayISO()}.json`;
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
              >
                ↓ Export backup
              </button>
              {/* Import */}
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
                        if (data.version !== 4) { alert('Incompatible backup version.'); return; }
                        if (!confirm('This will overwrite your current progress. Continue?')) return;
                        if (data.completed)    ss(K.COMPLETED,     data.completed);
                        if (data.lectureDates) ss(K.LECTURE_DATES, data.lectureDates);
                        if (data.dailyStudy)   ss(K.DAILY_STUDY,   data.dailyStudy);
                        if (data.timer)        ss(K.TIMER,         data.timer);
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

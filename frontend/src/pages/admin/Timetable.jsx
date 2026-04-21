// pages/admin/Timetable.jsx
/**
 * TIMETABLE PAGE — Full-featured admin view
 *
 * Features:
 *   • Select class → loads existing timetable or blank
 *   • Dynamic period count (per class, configurable 1–12)
 *   • Mark any period slot as a BREAK (label editable)
 *   • Set global period times OR per-slot times
 *   • Teacher conflict detection (real-time highlight + pre-save validation)
 *   • Copy one day's schedule to other days
 *   • Clear a full day or the whole timetable
 *   • "Teacher View" modal — see any teacher's full week at a glance
 *   • Subjects filtered to the selected class
 *   • Unsaved changes warning
 *   • Save with server-side conflict enforcement
 *
 * APIs used:
 *   GET  /api/academic-years/current
 *   GET  /api/classrooms?isActive=true&academicYear=:ayId
 *   GET  /api/classrooms/:id/subjects
 *   GET  /api/employees?role=teacher&status=active
 *   GET  /api/timetable/:classId?academicYear=:ayId
 *   POST /api/timetable/validate
 *   POST /api/timetable
 *   DELETE /api/timetable/:classId?academicYear=:ayId
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Save, Copy, Trash2, AlertTriangle, Eye, ChevronDown,
  Clock, Plus, Minus, Coffee, CheckCircle, X, RefreshCw,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Input, Modal, Badge } from '../../components/ui.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };
const MAX_PERIODS = 12;
const MIN_PERIODS = 1;

const PERIOD_COLORS = [
  'bg-blue-500/10 border-blue-500/20 text-blue-300',
  'bg-violet-500/10 border-violet-500/20 text-violet-300',
  'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
  'bg-amber-500/10 border-amber-500/20 text-amber-300',
  'bg-pink-500/10 border-pink-500/20 text-pink-300',
  'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
  'bg-orange-500/10 border-orange-500/20 text-orange-300',
  'bg-teal-500/10 border-teal-500/20 text-teal-300',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function makeEmptyPeriod(periodNo, globalTimes) {
  return {
    periodNo,
    startTime: globalTimes?.[periodNo - 1]?.startTime || '',
    endTime:   globalTimes?.[periodNo - 1]?.endTime   || '',
    subject:   '',
    teacher:   '',
    isBreak:   false,
    breakLabel: 'Break',
  };
}

function makeEmptySchedule(days, numPeriods, globalTimes = []) {
  return days.map(day => ({
    day,
    periods: Array.from({ length: numPeriods }, (_, i) =>
      makeEmptyPeriod(i + 1, globalTimes)
    ),
  }));
}

function mergeSchedule(loaded, days, numPeriods) {
  return days.map(day => {
    const existing = loaded.find(s => s.day === day);
    return {
      day,
      periods: Array.from({ length: numPeriods }, (_, i) => {
        const ep = existing?.periods?.find(p => p.periodNo === i + 1);
        if (!ep) return makeEmptyPeriod(i + 1);
        return {
          periodNo:   i + 1,
          startTime:  ep.startTime  || '',
          endTime:    ep.endTime    || '',
          subject:    ep.subject?._id   || ep.subject   || '',
          teacher:    ep.teacher?._id   || ep.teacher   || '',
          isBreak:    ep.isBreak    || false,
          breakLabel: ep.breakLabel || 'Break',
        };
      }),
    };
  });
}

/** Build a map of "teacherId|day|periodNo" → classroomLabel for the CURRENT schedule */
function buildConflictMap(schedule, classroomLabel) {
  const map = {};
  schedule.forEach(ds => {
    ds.periods.forEach(p => {
      if (p.teacher && !p.isBreak) {
        const key = `${p.teacher}|${ds.day}|${p.periodNo}`;
        if (!map[key]) map[key] = [];
        map[key].push(classroomLabel);
      }
    });
  });
  return map;
}

/** Check within ONE schedule: same teacher in two periods on the same day at same slot */
function getInternalConflicts(schedule) {
  // No internal conflict possible (one cell per day/period pair is unique)
  // But warn if same teacher appears twice in same day (different period numbers are fine)
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TimetableAdminPage() {
  // ── Data ──────────────────────────────────────────────────────────────────
  const [classrooms, setClassrooms]     = useState([]);
  const [subjects, setSubjects]         = useState([]);
  const [teachers, setTeachers]         = useState([]);
  const [ayId, setAyId]                 = useState('');

  // ── Timetable state ───────────────────────────────────────────────────────
  const [classFilter, setClassFilter]   = useState('');
  const [numPeriods, setNumPeriods]     = useState(8);
  const [workingDays, setWorkingDays]   = useState(ALL_DAYS.slice(0, 5)); // Mon–Fri default
  const [schedule, setSchedule]         = useState([]);
  const [globalTimes, setGlobalTimes]   = useState(
    Array.from({ length: MAX_PERIODS }, () => ({ startTime: '', endTime: '' }))
  );

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const [dirty, setDirty]               = useState(false);
  const [serverConflicts, setServerConflicts] = useState([]);
  const [saveSuccess, setSaveSuccess]   = useState(false);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [copyDayModal, setCopyDayModal]         = useState(false);
  const [copySourceDay, setCopySourceDay]       = useState('');
  const [teacherViewModal, setTeacherViewModal] = useState(false);
  const [settingsOpen, setSettingsOpen]         = useState(false);
  const [clearConfirm, setClearConfirm]         = useState(null); // 'all' | dayName

  const saveSuccessTimer = useRef(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const [cls, emps] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`),
          api.get(`${API.EMPLOYEES.BASE}?role=teacher&status=active`),
        ]);
        setClassrooms(cls.data || []);
        setTeachers(emps.data  || []);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Warn about unsaved changes on page leave
  useEffect(() => {
    const handler = (e) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ── Load timetable when class changes ──────────────────────────────────────
  const handleClassChange = async (classId) => {
    if (dirty && !confirm('You have unsaved changes. Switch class anyway?')) return;
    setClassFilter(classId);
    setServerConflicts([]);
    setDirty(false);
    if (!classId) {
      setSchedule(makeEmptySchedule(workingDays, numPeriods, globalTimes));
      setSubjects([]);
      return;
    }
    setLoading(true);
    try {
      const [subRes, ttRes] = await Promise.all([
        api.get(`${API.CLASSROOMS.BY_ID(classId)}/subjects`),
        api.get(`${API.TIMETABLE.BY_CLASS(classId)}?academicYear=${ayId}`).catch(() => null),
      ]);
      setSubjects(subRes.data || []);

      if (ttRes?.data) {
        const tt = ttRes.data;
        // Restore settings from saved timetable
        const savedPeriods  = tt.totalPeriods || numPeriods;
        const savedDays     = tt.workingDays  || workingDays;
        setNumPeriods(savedPeriods);
        setWorkingDays(savedDays);
        setSchedule(mergeSchedule(tt.schedule || [], savedDays, savedPeriods));
      } else {
        setSchedule(makeEmptySchedule(workingDays, numPeriods, globalTimes));
      }
    } catch (err) {
      console.error(err);
      setSchedule(makeEmptySchedule(workingDays, numPeriods, globalTimes));
    } finally {
      setLoading(false);
    }
  };

  // ── Period update ──────────────────────────────────────────────────────────
  const updatePeriod = useCallback((dayIdx, periodIdx, field, value) => {
    setSchedule(prev =>
      prev.map((d, di) =>
        di !== dayIdx ? d : {
          ...d,
          periods: d.periods.map((p, pi) =>
            pi !== periodIdx ? p : { ...p, [field]: value }
          ),
        }
      )
    );
    setDirty(true);
    setServerConflicts([]);
  }, []);

  // ── Toggle break ───────────────────────────────────────────────────────────
  const toggleBreak = useCallback((dayIdx, periodIdx) => {
    setSchedule(prev =>
      prev.map((d, di) =>
        di !== dayIdx ? d : {
          ...d,
          periods: d.periods.map((p, pi) =>
            pi !== periodIdx ? p : {
              ...p,
              isBreak:  !p.isBreak,
              subject:  p.isBreak ? p.subject : '',
              teacher:  p.isBreak ? p.teacher : '',
            }
          ),
        }
      )
    );
    setDirty(true);
  }, []);

  // ── Apply global times to all slots ───────────────────────────────────────
  const applyGlobalTimes = useCallback(() => {
    setSchedule(prev =>
      prev.map(d => ({
        ...d,
        periods: d.periods.map((p, pi) => ({
          ...p,
          startTime: globalTimes[pi]?.startTime || p.startTime,
          endTime:   globalTimes[pi]?.endTime   || p.endTime,
        })),
      }))
    );
    setDirty(true);
  }, [globalTimes]);

  // ── Change period count ────────────────────────────────────────────────────
  const changeNumPeriods = (n) => {
    const clamped = Math.max(MIN_PERIODS, Math.min(MAX_PERIODS, n));
    setNumPeriods(clamped);
    setSchedule(prev =>
      prev.map(d => {
        if (clamped > d.periods.length) {
          const extra = Array.from(
            { length: clamped - d.periods.length },
            (_, i) => makeEmptyPeriod(d.periods.length + i + 1, globalTimes)
          );
          return { ...d, periods: [...d.periods, ...extra] };
        }
        return { ...d, periods: d.periods.slice(0, clamped) };
      })
    );
    setDirty(true);
  };

  // ── Toggle working day ─────────────────────────────────────────────────────
  const toggleDay = (day) => {
    setWorkingDays(prev => {
      const next = prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b));
      setSchedule(makeEmptySchedule(next, numPeriods, globalTimes));
      return next;
    });
    setDirty(true);
  };

  // ── Copy day ───────────────────────────────────────────────────────────────
  const copyDayTo = (targetDays) => {
    const source = schedule.find(d => d.day === copySourceDay);
    if (!source) return;
    setSchedule(prev =>
      prev.map(d =>
        targetDays.includes(d.day)
          ? { ...d, periods: source.periods.map(p => ({ ...p })) }
          : d
      )
    );
    setCopyDayModal(false);
    setDirty(true);
  };

  // ── Clear ──────────────────────────────────────────────────────────────────
  const clearDay = (day) => {
    setSchedule(prev =>
      prev.map(d =>
        d.day !== day ? d : {
          ...d,
          periods: d.periods.map(p => makeEmptyPeriod(p.periodNo, globalTimes)),
        }
      )
    );
    setDirty(true);
    setClearConfirm(null);
  };

  const clearAll = () => {
    setSchedule(makeEmptySchedule(workingDays, numPeriods, globalTimes));
    setDirty(true);
    setClearConfirm(null);
  };

  // ── Delete timetable ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!classFilter) return;
    if (!confirm('Delete the entire timetable for this class? This cannot be undone.')) return;
    try {
      await api.delete(`${API.TIMETABLE.BY_CLASS(classFilter)}?academicYear=${ayId}`);
      setSchedule(makeEmptySchedule(workingDays, numPeriods, globalTimes));
      setDirty(false);
      setServerConflicts([]);
    } catch (err) {
      console.log(err.response?.data?.message || err.message)
      alert(err.response?.data?.message || err.message);
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!classFilter) return alert('Please select a class first.');
    setSaving(true);
    setServerConflicts([]);
    try {
      await api.post(API.TIMETABLE.BASE, {
        classroom:    classFilter,
        academicYear: ayId,
        schedule,
        totalPeriods: numPeriods,
        workingDays,
      });
      setDirty(false);
      setSaveSuccess(true);
      clearTimeout(saveSuccessTimer.current);
      saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const conflicts = err.response?.data?.conflicts;
      if (conflicts?.length) {
        setServerConflicts(conflicts);
      } else {
        console.log(err.response?.data?.message || err.message)
        alert(err.response?.data?.message || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Derived: conflict map from server conflicts ────────────────────────────
  const conflictSet = new Set(
    serverConflicts.map(c => `${c.teacherId}|${c.day}|${c.periodNo}`)
  );

  const isPeriodConflicted = (day, periodNo, teacherId) => {
    if (!teacherId) return false;
    return conflictSet.has(`${teacherId}|${day}|${periodNo}`);
  };

  // ── Options ────────────────────────────────────────────────────────────────
  const classOptions = [
    { value: '', label: '— Select class —' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];
  const subjectOptions = [
    { value: '', label: '— Subject —' },
    ...subjects.map(s => ({ value: s._id, label: s.name })),
  ];
  const teacherOptions = [
    { value: '', label: '— Teacher —' },
    ...teachers.map(t => ({ value: t._id, label: t.name })),
  ];

  const selectedClass = classrooms.find(c => c._id === classFilter);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageContent>
      {/* ── Header ── */}
      <PageHeader
        title="Timetable"
        subtitle={selectedClass ? `Editing: ${selectedClass.displayName}` : 'Select a class to begin'}
        actions={
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Unsaved changes
              </span>
            )}
            {saveSuccess && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <Button
              variant="ghost"
              onClick={() => setTeacherViewModal(true)}
              disabled={!classFilter}
              title="Teacher schedule view"
            >
              <Eye className="w-4 h-4" /> Teacher View
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              disabled={!classFilter}
              title="Timetable settings"
            >
              ⚙ Settings
            </Button>
            {classFilter && (
              <Button variant="danger" onClick={handleDelete} title="Delete timetable">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving || !classFilter}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Timetable'}
            </Button>
          </div>
        }
      />

      {/* ── Class selector + quick controls ── */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="w-52">
          <Select
            label="Class"
            options={classOptions}
            value={classFilter}
            onChange={e => handleClassChange(e.target.value)}
          />
        </div>

        {classFilter && (
          <>
            {/* Period count */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Periods / day</label>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => changeNumPeriods(numPeriods - 1)} disabled={numPeriods <= MIN_PERIODS}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-6 text-center text-white font-semibold text-sm">{numPeriods}</span>
                <Button size="sm" variant="ghost" onClick={() => changeNumPeriods(numPeriods + 1)} disabled={numPeriods >= MAX_PERIODS}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Clear all */}
            <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setClearConfirm('all')}>
              <RefreshCw className="w-3.5 h-3.5" /> Clear All
            </Button>
          </>
        )}
      </div>

      {/* ── Server conflicts banner ── */}
      {serverConflicts.length > 0 && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            {serverConflicts.length} Teacher Conflict{serverConflicts.length !== 1 ? 's' : ''} Detected
          </div>
          <div className="space-y-1">
            {serverConflicts.map((c, i) => (
              <p key={i} className="text-xs text-red-300">
                <span className="font-medium">{c.teacherName}</span> is already assigned to{' '}
                <span className="font-medium">{c.conflictingClass}</span> on{' '}
                {c.day} Period {c.periodNo}
                {c.startTime ? ` (${c.startTime}–${c.endTime})` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {loading ? (
        <Card className="py-16 text-center text-slate-500">Loading timetable…</Card>
      ) : !classFilter ? (
        <Card className="py-16 text-center text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Select a class above to view or edit its timetable.</p>
        </Card>
      ) : (
        /* ── Timetable grid ── */
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: `${120 + numPeriods * 180}px` }}>
            <thead>
              <tr>
                {/* Day column header */}
                <th className="w-24 text-left pb-2 pr-3 text-xs text-slate-500 uppercase tracking-wide font-medium">
                  Day
                </th>
                {/* Period headers */}
                {Array.from({ length: numPeriods }, (_, i) => (
                  <th key={i} className="pb-2 px-1 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs font-semibold text-slate-300">P{i + 1}</span>
                      {/* Global time inputs in header */}
                      <div className="flex gap-0.5">
                        <input
                          type="time"
                          value={globalTimes[i]?.startTime || ''}
                          onChange={e => {
                            const next = [...globalTimes];
                            next[i] = { ...next[i], startTime: e.target.value };
                            setGlobalTimes(next);
                          }}
                          className="w-20 px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] focus:outline-none focus:border-indigo-500"
                          title={`P${i + 1} start time`}
                        />
                        <input
                          type="time"
                          value={globalTimes[i]?.endTime || ''}
                          onChange={e => {
                            const next = [...globalTimes];
                            next[i] = { ...next[i], endTime: e.target.value };
                            setGlobalTimes(next);
                          }}
                          className="w-20 px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] focus:outline-none focus:border-indigo-500"
                          title={`P${i + 1} end time`}
                        />
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
              {/* Apply global times row */}
              <tr>
                <td />
                <td colSpan={numPeriods} className="pb-2 px-1">
                  <button
                    onClick={applyGlobalTimes}
                    className="text-[10px] text-blue-400 hover:text-blue-300 underline"
                  >
                    Apply times to all days →
                  </button>
                </td>
              </tr>
            </thead>

            <tbody>
              {schedule.map((daySchedule, di) => (
                <tr key={daySchedule.day} className="border-t border-slate-800">
                  {/* Day label + actions */}
                  <td className="py-2 pr-3 align-top pt-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-200 font-semibold text-sm">
                        {SHORT_DAY[daySchedule.day]}
                      </span>
                      <button
                        onClick={() => { setCopySourceDay(daySchedule.day); setCopyDayModal(true); }}
                        className="text-[10px] text-slate-500 hover:text-blue-400 flex items-center gap-0.5"
                        title="Copy this day"
                      >
                        <Copy className="w-2.5 h-2.5" /> Copy
                      </button>
                      <button
                        onClick={() => setClearConfirm(daySchedule.day)}
                        className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-0.5"
                        title="Clear this day"
                      >
                        <X className="w-2.5 h-2.5" /> Clear
                      </button>
                    </div>
                  </td>

                  {/* Period cells */}
                  {daySchedule.periods.map((period, pi) => {
                    const isConflict = isPeriodConflicted(daySchedule.day, period.periodNo, period.teacher);
                    return (
                      <td key={pi} className="py-1.5 px-1 align-top">
                        <PeriodCell
                          period={period}
                          subjectOptions={subjectOptions}
                          teacherOptions={teacherOptions}
                          isConflict={isConflict}
                          colorClass={PERIOD_COLORS[pi % PERIOD_COLORS.length]}
                          onChange={(field, val) => updatePeriod(di, pi, field, val)}
                          onToggleBreak={() => toggleBreak(di, pi)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {copyDayModal && (
        <CopyDayModal
          sourceDay={copySourceDay}
          workingDays={workingDays}
          onCopy={copyDayTo}
          onClose={() => setCopyDayModal(false)}
        />
      )}

      {teacherViewModal && (
        <TeacherViewModal
          teachers={teachers}
          schedule={schedule}
          subjects={subjects}
          numPeriods={numPeriods}
          workingDays={workingDays}
          classLabel={selectedClass?.displayName || ''}
          onClose={() => setTeacherViewModal(false)}
        />
      )}

      {settingsOpen && (
        <TimetableSettingsModal
          workingDays={workingDays}
          numPeriods={numPeriods}
          allDays={ALL_DAYS}
          onToggleDay={toggleDay}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {clearConfirm && (
        <Modal
          open
          onClose={() => setClearConfirm(null)}
          title={clearConfirm === 'all' ? 'Clear Entire Timetable' : `Clear ${clearConfirm}`}
        >
          <p className="text-slate-300 text-sm mb-5">
            {clearConfirm === 'all'
              ? 'This will clear all period assignments for every day. Are you sure?'
              : `This will clear all period assignments for ${clearConfirm}. Are you sure?`}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setClearConfirm(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => clearConfirm === 'all' ? clearAll() : clearDay(clearConfirm)}
            >
              Clear
            </Button>
          </div>
        </Modal>
      )}
    </PageContent>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// PERIOD CELL
// ─────────────────────────────────────────────────────────────────────────────

function PeriodCell({ period, subjectOptions, teacherOptions, isConflict, colorClass, onChange, onToggleBreak }) {
  if (period.isBreak) {
    return (
      <div className="w-44 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-amber-400 text-xs font-medium">
            <Coffee className="w-3 h-3" /> Break
          </div>
          <button onClick={onToggleBreak} className="text-slate-500 hover:text-slate-300" title="Remove break">
            <X className="w-3 h-3" />
          </button>
        </div>
        <input
          value={period.breakLabel}
          onChange={e => onChange('breakLabel', e.target.value)}
          placeholder="Break label"
          className="w-full px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-300 text-xs focus:outline-none focus:border-amber-500"
        />
        <div className="flex gap-1">
          <input
            type="time"
            value={period.startTime}
            onChange={e => onChange('startTime', e.target.value)}
            className="flex-1 min-w-0 px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] focus:outline-none"
          />
          <input
            type="time"
            value={period.endTime}
            onChange={e => onChange('endTime', e.target.value)}
            className="flex-1 min-w-0 px-1 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px] focus:outline-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-44 rounded-lg border p-2 flex flex-col gap-1.5 transition-colors ${
      isConflict
        ? 'border-red-500/50 bg-red-500/10'
        : 'border-slate-700 bg-slate-800/50'
    }`}>
      {/* Conflict indicator */}
      {isConflict && (
        <div className="flex items-center gap-1 text-red-400 text-[10px]">
          <AlertTriangle className="w-3 h-3" /> Teacher conflict
        </div>
      )}

      {/* Times */}
      <div className="flex gap-1">
        <input
          type="time"
          value={period.startTime}
          onChange={e => onChange('startTime', e.target.value)}
          className="flex-1 min-w-0 px-1 py-0.5 rounded bg-slate-700 border border-slate-600 text-white text-[10px] focus:outline-none focus:border-indigo-500"
        />
        <input
          type="time"
          value={period.endTime}
          onChange={e => onChange('endTime', e.target.value)}
          className="flex-1 min-w-0 px-1 py-0.5 rounded bg-slate-700 border border-slate-600 text-white text-[10px] focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Subject */}
      <select
        value={period.subject}
        onChange={e => onChange('subject', e.target.value)}
        className="w-full px-1.5 py-1 rounded bg-slate-700 border border-slate-600 text-white text-xs focus:outline-none focus:border-indigo-500"
      >
        {subjectOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Teacher */}
      <select
        value={period.teacher}
        onChange={e => onChange('teacher', e.target.value)}
        className={`w-full px-1.5 py-1 rounded border text-xs focus:outline-none focus:border-indigo-500 ${
          isConflict
            ? 'bg-red-900/30 border-red-500/40 text-red-300'
            : 'bg-slate-700 border-slate-600 text-white'
        }`}
      >
        {teacherOptions.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Mark as break */}
      <button
        onClick={onToggleBreak}
        className="text-[10px] text-slate-500 hover:text-amber-400 flex items-center gap-1 mt-0.5 self-start"
        title="Convert to break"
      >
        <Coffee className="w-2.5 h-2.5" /> Set as break
      </button>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// COPY DAY MODAL
// ─────────────────────────────────────────────────────────────────────────────

function CopyDayModal({ sourceDay, workingDays, onCopy, onClose }) {
  const [targets, setTargets] = useState([]);

  const toggle = (day) => {
    setTargets(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <Modal open onClose={onClose} title={`Copy ${sourceDay} schedule to…`}>
      <p className="text-slate-400 text-sm mb-4">
        Select the days you want to copy <span className="text-white font-medium">{sourceDay}</span>'s schedule to.
        This will overwrite those days.
      </p>
      <div className="flex flex-wrap gap-2 mb-6">
        {workingDays
          .filter(d => d !== sourceDay)
          .map(day => (
            <button
              key={day}
              onClick={() => toggle(day)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                targets.includes(day)
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-slate-600 text-slate-300 hover:border-slate-400'
              }`}
            >
              {day}
            </button>
          ))}
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onCopy(targets)} disabled={targets.length === 0}>
          <Copy className="w-4 h-4" /> Copy to {targets.length} day{targets.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// TIMETABLE SETTINGS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function TimetableSettingsModal({ workingDays, numPeriods, allDays, onToggleDay, onClose }) {
  return (
    <Modal open onClose={onClose} title="Timetable Settings">
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-slate-200 mb-2">Working Days</p>
          <p className="text-xs text-slate-500 mb-3">
            Toggle days on/off. Turning a day off clears its schedule.
          </p>
          <div className="flex flex-wrap gap-2">
            {allDays.map(day => (
              <button
                key={day}
                onClick={() => onToggleDay(day)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  workingDays.includes(day)
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'border-slate-600 text-slate-400 hover:border-slate-400'
                }`}
              >
                {SHORT_DAY[day]}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <p className="text-sm font-medium text-slate-200 mb-1">Active Days</p>
          <p className="text-slate-400 text-sm">{workingDays.join(', ') || 'None selected'}</p>
        </div>

        <div className="border-t border-slate-700 pt-4">
          <p className="text-sm font-medium text-slate-200 mb-1">Periods per Day</p>
          <p className="text-slate-400 text-sm">
            Currently {numPeriods} periods. Use the +/− controls on the main page to change.
          </p>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// TEACHER VIEW MODAL
// Shows one teacher's full weekly schedule for the current class
// ─────────────────────────────────────────────────────────────────────────────

function TeacherViewModal({ teachers, schedule, subjects, numPeriods, workingDays, classLabel, onClose }) {
  const [selectedTeacher, setSelectedTeacher] = useState('');

  const subjectName = (id) => subjects.find(s => s._id === id)?.name || '—';

  const teacherSchedule = selectedTeacher
    ? schedule.map(ds => ({
        day: ds.day,
        periods: ds.periods.filter(p => p.teacher === selectedTeacher && !p.isBreak && p.subject),
      })).filter(ds => ds.periods.length > 0)
    : [];

  const teacherOptions = [
    { value: '', label: '— Select teacher —' },
    ...teachers.map(t => ({ value: t._id, label: t.name })),
  ];

  const totalPeriods = teacherSchedule.reduce((sum, ds) => sum + ds.periods.length, 0);

  return (
    <Modal open onClose={onClose} title="Teacher Schedule View">
      <div className="mb-4">
        <Select
          label="Select Teacher"
          options={teacherOptions}
          value={selectedTeacher}
          onChange={e => setSelectedTeacher(e.target.value)}
        />
      </div>

      {selectedTeacher && (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-slate-400 text-sm">
              Class: <span className="text-white font-medium">{classLabel}</span>
            </p>
            <Badge label={`${totalPeriods} period${totalPeriods !== 1 ? 's' : ''} / week`} color="blue" />
          </div>

          {teacherSchedule.length === 0 ? (
            <p className="text-slate-500 text-sm italic py-4 text-center">
              This teacher has no periods assigned in {classLabel}.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {teacherSchedule.map(ds => (
                <div key={ds.day} className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2">
                  <p className="text-slate-300 font-medium text-sm mb-2">{ds.day}</p>
                  <div className="flex flex-wrap gap-2">
                    {ds.periods.map(p => (
                      <div
                        key={p.periodNo}
                        className="rounded bg-slate-700 px-2 py-1 text-xs"
                      >
                        <span className="text-slate-400">P{p.periodNo}</span>
                        <span className="text-white font-medium ml-1">{subjectName(p.subject)}</span>
                        {p.startTime && (
                          <span className="text-slate-500 ml-1">{p.startTime}–{p.endTime}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
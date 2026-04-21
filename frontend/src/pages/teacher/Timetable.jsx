// pages/teacher/Timetable.jsx
/**
 * TEACHER TIMETABLE PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/classrooms?isActive=true&academicYear=:ayId
 *   GET /api/timetable/:classId?academicYear=:ayId
 */
import { useEffect, useState } from 'react';
import { Clock, Coffee, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select } from '../../components/ui.jsx';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };

const PERIOD_COLORS = [
  'bg-blue-500/10 border-blue-500/30 text-blue-300',
  'bg-violet-500/10 border-violet-500/30 text-violet-300',
  'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  'bg-amber-500/10 border-amber-500/30 text-amber-300',
  'bg-pink-500/10 border-pink-500/30 text-pink-300',
  'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
  'bg-orange-500/10 border-orange-500/30 text-orange-300',
  'bg-teal-500/10 border-teal-500/30 text-teal-300',
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function mergeSchedule(loaded, days, numPeriods) {
  return days.map(day => {
    const existing = loaded.find(s => s.day === day);
    return {
      day,
      periods: Array.from({ length: numPeriods }, (_, i) => {
        const ep = existing?.periods?.find(p => p.periodNo === i + 1);
        if (!ep) return { periodNo: i + 1, startTime: '', endTime: '', subject: null, teacher: null, isBreak: false, breakLabel: 'Break' };
        return {
          periodNo:   i + 1,
          startTime:  ep.startTime  || '',
          endTime:    ep.endTime    || '',
          subject:    ep.subject    || null,
          teacher:    ep.teacher    || null,
          isBreak:    ep.isBreak    || false,
          breakLabel: ep.breakLabel || 'Break',
        };
      }),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PERIOD CELL — read-only
// ─────────────────────────────────────────────────────────────────────────────

function PeriodCell({ period, colorClass }) {
  if (period.isBreak) {
    return (
      <div className="w-40 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
          <Coffee className="w-3 h-3" />
          {period.breakLabel || 'Break'}
        </div>
        {period.startTime && period.endTime && (
          <div className="text-[10px] font-mono text-amber-300/70">
            {period.startTime} – {period.endTime}
          </div>
        )}
      </div>
    );
  }

  const hasContent = period.subject?.name || period.teacher?.name;

  return (
    <div className={`w-40 rounded-lg border p-2.5 flex flex-col gap-1 ${
      hasContent ? colorClass : 'border-slate-700/50 bg-slate-800/30'
    }`}>
      {period.startTime && period.endTime && (
        <div className="text-[10px] font-mono text-slate-500">
          {period.startTime} – {period.endTime}
        </div>
      )}
      {period.subject?.name ? (
        <div className="text-xs font-semibold text-white leading-tight">
          {period.subject.name}
        </div>
      ) : (
        <div className="text-xs text-slate-600 italic">No subject</div>
      )}
      {period.teacher?.name && (
        <div className="text-[10px] text-slate-400 truncate">
          {period.teacher.name}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function TeacherTimetable() {
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [numPeriods, setNumPeriods] = useState(0);
  const [workingDays, setWorkingDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [ayId, setAyId] = useState('');

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        const classes = cls.data || [];
        setClassrooms(classes);
        if (classes.length > 0) setClassFilter(classes[0]._id);
      } catch {}
    })();
  }, []);

  // ── Load timetable when class or AY changes ────────────────────────────────
  useEffect(() => {
    if (!classFilter || !ayId) return;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await api.get(`${API.TIMETABLE.BY_CLASS(classFilter)}?academicYear=${ayId}`);
        const tt = res.data;
        if (tt) {
          const days = tt.workingDays?.length ? tt.workingDays : ALL_DAYS.slice(0, 5);
          const periods = tt.totalPeriods || 8;
          setWorkingDays(days);
          setNumPeriods(periods);
          setSchedule(mergeSchedule(tt.schedule || [], days, periods));
        } else {
          setSchedule([]);
          setWorkingDays([]);
          setNumPeriods(0);
        }
      } catch {
        setError(true);
        setSchedule([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [classFilter, ayId]);

  // ── Options ────────────────────────────────────────────────────────────────
  const classOptions = classrooms.map(c => ({ value: c._id, label: c.displayName }));
  const selectedClass = classrooms.find(c => c._id === classFilter);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <PageContent>
      {/* ── Header ── */}
      <PageHeader
        title="Timetable"
        subtitle={selectedClass ? `Class: ${selectedClass.displayName}` : 'View class schedule'}
      />

      {/* ── Class selector ── */}
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="w-52">
          <Select
            label="Class"
            options={classOptions}
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
          />
        </div>
        {selectedClass && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pb-1">
            <Clock className="w-3.5 h-3.5" />
            {numPeriods > 0 ? `${numPeriods} periods/day` : ''}
            {workingDays.length > 0 && numPeriods > 0 && ' · '}
            {workingDays.length > 0 ? `${workingDays.length} working days` : ''}
          </div>
        )}
      </div>

      {/* ── States ── */}
      {loading ? (
        <Card className="py-16 text-center text-slate-500">Loading timetable…</Card>
      ) : error ? (
        <Card className="py-16 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500/50" />
          <p className="text-slate-400 text-sm">Failed to load timetable. Please try again.</p>
        </Card>
      ) : !classFilter ? (
        <Card className="py-16 text-center text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Select a class above to view its timetable.</p>
        </Card>
      ) : schedule.length === 0 ? (
        <Card className="py-16 text-center text-slate-500">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>No timetable found for this class.</p>
        </Card>
      ) : (
        /* ── Timetable grid ── */
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: `${120 + numPeriods * 172}px` }}>
            {/* Period header row */}
            <thead>
              <tr>
                <th className="w-20 pb-3 pr-3 text-left text-xs text-slate-500 uppercase tracking-wide font-medium">
                  Day
                </th>
                {Array.from({ length: numPeriods }, (_, i) => (
                  <th key={i} className="pb-3 px-1 text-center">
                    <span className="text-xs font-semibold text-slate-400 tracking-wide">
                      Period {i + 1}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Day rows */}
            <tbody>
              {schedule.map((daySchedule) => (
                <tr key={daySchedule.day} className="border-t border-slate-800">
                  {/* Day label */}
                  <td className="py-2 pr-3 align-middle">
                    <span className="text-slate-200 font-semibold text-sm">
                      {SHORT_DAY[daySchedule.day]}
                    </span>
                  </td>

                  {/* Period cells */}
                  {daySchedule.periods.map((period, pi) => (
                    <td key={pi} className="py-1.5 px-1 align-top">
                      <PeriodCell
                        period={period}
                        colorClass={PERIOD_COLORS[pi % PERIOD_COLORS.length]}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContent>
  );
}
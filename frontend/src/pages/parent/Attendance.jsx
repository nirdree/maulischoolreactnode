// pages/parent/Attendance.jsx
/**
 * PARENT ATTENDANCE PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/attendance/students    — attendance records
 *   GET /api/attendance/students/summary — monthly summary
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select, Badge } from '../../components/ui.jsx';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function statusColor(s) {
  const map = {
    Present: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Absent: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    Late: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    HalfDay: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    Holiday: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  };
  return map[s] || 'bg-slate-700 text-slate-400 border-slate-600';
}

export default function ParentAttendance() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year] = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        const kids = res.data || [];
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]._id);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (selectedChild && ayId) fetchAttendance();
  }, [selectedChild, month, ayId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const [recRes, sumRes] = await Promise.all([
        api.get(`${API.ATTENDANCE.STUDENTS}?studentId=${selectedChild}&fromDate=${fromDate}&toDate=${toDate}&academicYear=${ayId}`),
        api.get(`${API.ATTENDANCE.STUDENTS_SUMMARY}?studentId=${selectedChild}&month=${month}&year=${year}&academicYear=${ayId}`),
      ]);
      setRecords(recRes.data || []);
      setSummary((sumRes.data || [])[0] || null);
    } catch {} finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName} (${c.classroom?.displayName || ''})`,
  }));
  const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  // Build calendar grid
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const getRecord = (day) => {
    const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.find(r => r.date?.startsWith(d));
  };

  return (
    <PageContent>
      <PageHeader title="Attendance" subtitle="Monthly attendance tracker" />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-64" label="Child" />
        <Select options={monthOptions} value={month} onChange={e => setMonth(Number(e.target.value))} className="w-36" label="Month" />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Present', value: summary.present, color: 'text-emerald-400' },
            { label: 'Absent', value: summary.absent, color: 'text-rose-400' },
            { label: 'Late', value: summary.late || 0, color: 'text-amber-400' },
            {
              label: 'Percentage', value: `${summary.percentage}%`,
              color: summary.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400',
            },
          ].map(s => (
            <Card key={s.label}>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">
          {MONTHS[month - 1]} {year}
        </h3>
        {loading ? (
          <div className="py-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">{d}</div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const rec = getRecord(day);
                const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1;
                return (
                  <div
                    key={day}
                    className={`rounded-lg p-1.5 min-h-[52px] flex flex-col items-center gap-1 border ${
                      isToday ? 'border-violet-500 bg-violet-500/5' : 'border-slate-800'
                    }`}
                  >
                    <span className={`text-xs font-medium ${isToday ? 'text-violet-400' : 'text-slate-400'}`}>{day}</span>
                    {rec ? (
                      <span className={`text-[9px] px-1 py-0.5 rounded border font-medium leading-tight text-center ${statusColor(rec.status)}`}>
                        {rec.status === 'HalfDay' ? 'Half' : rec.status.slice(0, 4)}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-800">
              {['Present','Absent','Late','HalfDay','Holiday'].map(s => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${statusColor(s)}`}>
                    {s === 'HalfDay' ? 'Half' : s.slice(0,4)}
                  </span>
                  <span className="text-xs text-slate-500">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </PageContent>
  );
}
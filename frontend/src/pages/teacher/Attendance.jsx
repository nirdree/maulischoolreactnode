// pages/teacher/Attendance.jsx
/**
 * TEACHER ATTENDANCE PAGE
 * APIs Used:
 *   GET  /api/academic-years/current
 *   GET  /api/classrooms              — teacher's classes
 *   GET  /api/students                — students in selected class
 *   GET  /api/attendance/students     — fetch existing records for a date
 *   POST /api/attendance/students     — bulk save attendance
 */
import { useEffect, useState } from 'react';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
const STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'];

function statusBtnClass(s, active) {
  if (!active) return 'border border-slate-700 text-slate-400 hover:border-slate-500 px-2 py-1 rounded text-xs font-medium transition';
  const map = {
    Present: 'bg-emerald-600 text-white',
    Absent: 'bg-rose-600 text-white',
    Late: 'bg-amber-500 text-white',
    HalfDay: 'bg-sky-600 text-white',
    Holiday: 'bg-violet-600 text-white',
  };
  return `${map[s] || 'bg-slate-600 text-white'} px-2 py-1 rounded text-xs font-medium transition`;
}

export default function AttendancePage() {
  const { user } = useAuth();

  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
  (async () => {
    try {
      const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
      const ayId = ay.data?._id;
      setAyId(ayId);

      const cls = await api.get(
        `${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ayId}`
      );

      const classes = cls.data || [];
      const myClasses = classes.filter(
        (c) => c.classTeacher?.name === user?.name
      );
      setClassrooms(myClasses);
      if (myClasses.length > 0) {
        setClassFilter(myClasses[0]._id);
      }
    } catch (err) {
      console.error(err);
    }
  })();
}, [user]);

  useEffect(() => {
    if (classFilter && ayId) fetchAttendance();
  }, [classFilter, date, ayId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const [stuRes, attRes] = await Promise.all([
        api.get(`${API.STUDENTS.BASE}?classId=${classFilter}&status=Approved&academicYear=${ayId}&limit=100`),
        api.get(`${API.ATTENDANCE.STUDENTS}?classId=${classFilter}&date=${date}&academicYear=${ayId}`),
      ]);
      const stuList = stuRes.data || [];
      setStudents(stuList);

      const existing = {};
      (attRes.data || []).forEach(r => {
        existing[r.student?._id || r.student] = r.status;
      });
      const init = {};
      stuList.forEach(s => { init[s._id] = existing[s._id] || 'Present'; });
      setAttendance(init);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = students.map(s => ({
        student: s._id,
        classroom: classFilter,
        date,
        status: attendance[s._id] || 'Present',
        academicYear: ayId,
      }));
      await api.post(API.ATTENDANCE.STUDENTS, { records });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markAll = (status) => {
    const next = {};
    students.forEach(s => { next[s._id] = status; });
    setAttendance(next);
  };

  const summary = {
    present: Object.values(attendance).filter(s => s === 'Present').length,
    absent: Object.values(attendance).filter(s => s === 'Absent').length,
    late: Object.values(attendance).filter(s => s === 'Late').length,
  };

  const classOptions = classrooms.map(c => ({ value: c._id, label: c.displayName }));

  return (
    <PageContent>
      <PageHeader
        title="Mark Attendance"
        subtitle="Record daily student attendance"
        actions={
          <Button onClick={handleSave} disabled={saving || students.length === 0}>
            {saved ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Attendance'}
          </Button>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <Select
          label="Class"
          options={classOptions}
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          className="w-44"
        />
        <Button variant="ghost" onClick={fetchAttendance}><RefreshCw className="w-4 h-4" /></Button>

        {students.length > 0 && (
          <div className="flex gap-2 ml-auto">
            {['Present', 'Absent', 'Holiday'].map(s => (
              <Button key={s} size="sm" variant="ghost" onClick={() => markAll(s)}>
                All {s}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Summary bar */}
      {students.length > 0 && (
        <div className="flex gap-4 mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400">Total: <span className="text-white font-bold">{students.length}</span></span>
          <span className="text-xs text-slate-400">Present: <span className="text-emerald-400 font-bold">{summary.present}</span></span>
          <span className="text-xs text-slate-400">Absent: <span className="text-rose-400 font-bold">{summary.absent}</span></span>
          <span className="text-xs text-slate-400">Late: <span className="text-amber-400 font-bold">{summary.late}</span></span>
        </div>
      )}

      <Card className="!p-0">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading students...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Student</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Roll No</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No students found. Select a class.
                    </td>
                  </tr>
                ) : (
                  students.map((s, i) => (
                    <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                      <td className="py-3 px-4 text-slate-400">{i + 1}</td>
                      <td className="py-3 px-4 text-white font-medium">{s.firstName} {s.lastName}</td>
                      <td className="py-3 px-4 text-slate-400">{s.rollNumber || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {STATUSES.map(st => (
                            <button
                              key={st}
                              onClick={() => setAttendance(prev => ({ ...prev, [s._id]: st }))}
                              className={statusBtnClass(st, attendance[s._id] === st)}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContent>
  );
}
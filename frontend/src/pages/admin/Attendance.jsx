// pages/admin/Attendance.jsx
/**
 * ATTENDANCE PAGE (Admin)
 * APIs Used:
 *   GET  /api/attendance/students    — list records
 *   POST /api/attendance/students    — bulk save
 *   GET  /api/attendance/employees   — employee records
 *   POST /api/attendance/employees   — bulk save employee
 *   GET  /api/classrooms             — populate class dropdown
 *   GET  /api/students               — student list for marking
 *   GET  /api/employees              — employee list for marking
 */
import { useEffect, useState } from 'react';
import { Save, RefreshCw, Users, UserCheck } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Badge } from '../../components/ui.jsx';

const STUDENT_STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'];
const EMPLOYEE_STATUSES = ['Present', 'Absent', 'Late', 'HalfDay', 'OnLeave', 'Holiday'];

function statusColor(s) {
  const map = { Present: 'green', Absent: 'red', Late: 'yellow', HalfDay: 'blue', Holiday: 'purple', OnLeave: 'indigo' };
  return map[s] || 'slate';
}

export default function AttendanceAdminPage() {
  const [tab, setTab] = useState('students');
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch {}
    })();
  }, []);

  const fetchStudentAttendance = async () => {
    if (!classFilter || !ayId) return;
    setLoading(true);
    try {
      // Load students
      const stuRes = await api.get(`${API.STUDENTS.BASE}?classId=${classFilter}&status=Approved&academicYear=${ayId}&limit=100`);
      setStudents(stuRes.data || []);

      // Load existing attendance for the day
      const attRes = await api.get(`${API.ATTENDANCE.STUDENTS}?classId=${classFilter}&date=${date}&academicYear=${ayId}`);
      const existing = {};
      (attRes.data || []).forEach(r => { existing[r.student._id || r.student] = r.status; });
      // Default all to Present if not marked
      const initial = {};
      (stuRes.data || []).forEach(s => { initial[s._id] = existing[s._id] || 'Present'; });
      setAttendance(initial);
    } catch {} finally { setLoading(false); }
  };

  const fetchEmployeeAttendance = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const empRes = await api.get(`${API.EMPLOYEES.BASE}?status=active`);
      setEmployees(empRes.data || []);
      const attRes = await api.get(`${API.ATTENDANCE.EMPLOYEES}?date=${date}&academicYear=${ayId}`);
      const existing = {};
      (attRes.data || []).forEach(r => { existing[r.employee._id || r.employee] = r.status; });
      const initial = {};
      (empRes.data || []).forEach(e => { initial[e._id] = existing[e._id] || 'Present'; });
      setAttendance(initial);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'students') fetchStudentAttendance();
    else fetchEmployeeAttendance();
  }, [tab, classFilter, date, ayId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'students') {
        const records = students.map(s => ({
          student: s._id, classroom: classFilter, date, status: attendance[s._id] || 'Present', academicYear: ayId,
        }));
        await api.post(API.ATTENDANCE.STUDENTS, { records });
      } else {
        const records = employees.map(e => ({
          employee: e._id, date, status: attendance[e._id] || 'Present', academicYear: ayId,
        }));
        await api.post(API.ATTENDANCE.EMPLOYEES, { records });
      }
      alert('Attendance saved!');
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const classOptions = [
    { value: '', label: 'Select Class' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const markAll = (status) => {
    const list = tab === 'students' ? students : employees;
    const newAtt = {};
    list.forEach(item => { newAtt[item._id] = status; });
    setAttendance(newAtt);
  };

  return (
    <PageContent>
      <PageHeader title="Attendance" subtitle="Mark and view attendance" />

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'students' ? 'primary' : 'ghost'} onClick={() => { setTab('students'); setAttendance({}); }}>
          <Users className="w-4 h-4" /> Students
        </Button>
        <Button variant={tab === 'employees' ? 'primary' : 'ghost'} onClick={() => { setTab('employees'); setAttendance({}); }}>
          <UserCheck className="w-4 h-4" /> Employees
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {tab === 'students' && (
          <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-44" label="Class" />
        )}
        <Button variant="ghost" onClick={tab === 'students' ? fetchStudentAttendance : fetchEmployeeAttendance}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        <div className="flex gap-2 ml-auto">
          {['Present', 'Absent', 'Holiday'].map(s => (
            <Button key={s} size="sm" variant="ghost" onClick={() => markAll(s)}>All {s}</Button>
          ))}
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      <Card className="!p-0">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Name</th>
                  {tab === 'students' && <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Roll No</th>}
                  {tab === 'employees' && <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Role</th>}
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {(tab === 'students' ? students : employees).map((item, i) => (
                  <tr key={item._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-slate-400">{i + 1}</td>
                    <td className="py-3 px-4 text-white font-medium">
                      {tab === 'students' ? `${item.firstName} ${item.lastName}` : item.name}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {tab === 'students' ? item.rollNumber : item.role}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(tab === 'students' ? STUDENT_STATUSES : EMPLOYEE_STATUSES).map(s => (
                          <button key={s}
                            onClick={() => setAttendance(prev => ({ ...prev, [item._id]: s }))}
                            className={`px-2 py-1 rounded text-xs font-medium transition border ${
                              attendance[item._id] === s
                                ? `border-transparent ${s === 'Present' ? 'bg-emerald-600 text-white' : s === 'Absent' ? 'bg-rose-600 text-white' : s === 'Late' ? 'bg-amber-600 text-white' : 'bg-indigo-600 text-white'}`
                                : 'border-slate-700 text-slate-400 hover:border-slate-500'
                            }`}
                          >{s}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
                {(tab === 'students' ? students : employees).length === 0 && (
                  <tr><td colSpan={4} className="py-12 text-center text-slate-500">
                    {tab === 'students' ? 'Select a class to mark attendance' : 'No employees found'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContent>
  );
}
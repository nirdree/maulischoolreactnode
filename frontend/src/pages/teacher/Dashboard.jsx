// pages/teacher/Dashboard.jsx
/**
 * TEACHER DASHBOARD
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/classrooms             — teacher's assigned class
 *   GET /api/homework               — recent homework
 *   GET /api/notices                — recent notices
 *   GET /api/leaves                 — teacher's own leaves
 *   GET /api/attendance/students    — today's attendance for teacher's class
 */
import { useEffect, useState } from 'react';
import {
  Users, ClipboardList, Bell, CalendarDays,
  CheckSquare, BookOpen, Loader2, Clock,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, StatCard, Card } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myClass, setMyClass] = useState(null);
  const [homework, setHomework] = useState([]);
  const [notices, setNotices] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState({ present: 0, absent: 0, total: 0 });
  const [ayId, setAyId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const ayId = ay.data?._id;
        setAyId(ayId);

        const [classRes, hwRes, noticesRes, leavesRes] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?academicYear=${ayId}&isActive=true`),
          api.get(`${API.HOMEWORK.BASE}?academicYear=${ayId}&limit=5`),
          api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`),
          api.get(`${API.LEAVES.BASE}?academicYear=${ayId}`),
        ]);

        // Find class taught by this teacher (classTeacher match)
        const allClasses = classRes.data || [];
        const employeeId = user?.employeeId;
        const teacherClass = allClasses.find(c => c.classTeacher?._id === employeeId || c.classTeacher === employeeId);
        setMyClass(teacherClass || allClasses[0] || null);

        setHomework((hwRes.data || []).slice(0, 5));
        setNotices((noticesRes.data || []).slice(0, 4));
        setLeaves(leavesRes.data || []);

        // Today's attendance summary
        if (teacherClass || allClasses[0]) {
          const cls = teacherClass || allClasses[0];
          const today = new Date().toISOString().split('T')[0];
          const attRes = await api.get(
            `${API.ATTENDANCE.STUDENTS}?classId=${cls._id}&date=${today}&academicYear=${ayId}`
          );
          const records = attRes.data || [];
          const present = records.filter(r => r.status === 'Present' || r.status === 'Late').length;
          const absent = records.filter(r => r.status === 'Absent').length;
          setTodayAttendance({ present, absent, total: records.length });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;
  const approvedLeaves = leaves.filter(l => l.status === 'Approved').length;

  return (
    <PageContent>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Here's your teaching overview for today"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="My Class"
          value={myClass?.displayName || '—'}
          icon={Users}
          color="emerald"
          trend={`Capacity: ${myClass?.capacity || 0}`}
        />
        <StatCard
          label="Present Today"
          value={todayAttendance.present}
          icon={CheckSquare}
          color="sky"
          trend={`${todayAttendance.absent} absent`}
        />
        <StatCard
          label="Pending Leaves"
          value={pendingLeaves}
          icon={CalendarDays}
          color="amber"
          trend={`${approvedLeaves} approved`}
        />
        <StatCard
          label="Recent Homework"
          value={homework.length}
          icon={ClipboardList}
          color="violet"
          trend="Assigned by you"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's Attendance Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-emerald-400" /> Today's Attendance
          </h3>
          {todayAttendance.total === 0 ? (
            <p className="text-slate-500 text-sm">No attendance marked yet today.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Present', value: todayAttendance.present, color: 'bg-emerald-500' },
                { label: 'Absent', value: todayAttendance.absent, color: 'bg-rose-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{item.label}</span>
                    <span className="text-white">{item.value} / {todayAttendance.total}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${todayAttendance.total ? (item.value / todayAttendance.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Notices */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-400" /> Notices
          </h3>
          {notices.length === 0 ? (
            <p className="text-slate-500 text-sm">No notices.</p>
          ) : (
            <div className="space-y-3">
              {notices.map(n => (
                <div key={n._id} className="flex items-start gap-3">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    n.priority === 'Urgent' ? 'bg-rose-500' :
                    n.priority === 'Important' ? 'bg-amber-500' : 'bg-slate-500'
                  }`} />
                  <div>
                    <p className="text-xs font-medium text-white">{n.title}</p>
                    <p className="text-xs text-slate-500">{n.priority} · {new Date(n.publishDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Homework */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-violet-400" /> Recent Homework
          </h3>
          {homework.length === 0 ? (
            <p className="text-slate-500 text-sm">No homework assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {homework.map(hw => (
                <div key={hw._id} className="flex items-start justify-between gap-3 border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-medium text-white">{hw.title}</p>
                    <p className="text-xs text-slate-500">
                      {hw.classroom?.displayName} · {hw.subject?.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-amber-400">Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Leave Status */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-400" /> My Leaves
          </h3>
          {leaves.length === 0 ? (
            <p className="text-slate-500 text-sm">No leave applications.</p>
          ) : (
            <div className="space-y-2">
              {leaves.slice(0, 5).map(l => (
                <div key={l._id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-white text-xs font-medium">{l.leaveType}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(l.fromDate).toLocaleDateString('en-IN')} — {new Date(l.toDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    l.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400' :
                    l.status === 'Rejected' ? 'bg-rose-500/15 text-rose-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContent>
  );
}
// pages/parent/Dashboard.jsx
/**
 * PARENT DASHBOARD
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/fees                   — pending fees
 *   GET /api/notices                — recent notices
 *   GET /api/attendance/students    — recent attendance summary
 */
import { useEffect, useState } from 'react';
import {
  GraduationCap, DollarSign, Bell, CheckSquare,
  Loader2, TrendingUp, AlertCircle,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge, feeStatusBadge } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [pendingFees, setPendingFees] = useState([]);
  const [notices, setNotices] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const ayId = ay.data?._id;

        const [studentsRes, feesRes, noticesRes] = await Promise.all([
          api.get(`${API.STUDENTS.BASE}?academicYear=${ayId}`),
          api.get(`${API.FEES.BASE}?academicYear=${ayId}&status=Pending`),
          api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`),
        ]);

        const childList = studentsRes.data || [];
        setChildren(childList);
        setPendingFees(feesRes.data || []);
        setNotices((noticesRes.data || []).slice(0, 4));

        // Attendance summary for each child
        if (childList.length > 0) {
          const now = new Date();
          const summaries = await Promise.all(
            childList.map(child =>
              api.get(
                `${API.ATTENDANCE.STUDENTS_SUMMARY}?studentId=${child._id}&month=${now.getMonth() + 1}&year=${now.getFullYear()}&academicYear=${ayId}`
              ).then(r => ({ childId: child._id, data: r.data?.[0] || null })).catch(() => ({ childId: child._id, data: null }))
            )
          );
          setAttendanceSummary(summaries);
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
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const totalPendingFees = pendingFees.reduce((s, f) => s + (f.finalAmount || 0), 0);

  return (
    <PageContent>
      <PageHeader
        title={`Hello, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Your children's school overview"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Children</p>
              <p className="text-2xl font-bold text-white mt-1">{children.length}</p>
              <p className="text-xs text-slate-500 mt-1">Enrolled</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-violet-500/10">
              <GraduationCap className="w-5 h-5 text-violet-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Pending Fees</p>
              <p className="text-2xl font-bold text-white mt-1">₹{(totalPendingFees / 1000).toFixed(1)}K</p>
              <p className="text-xs text-rose-400 mt-1">{pendingFees.length} unpaid</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-500/10">
              <DollarSign className="w-5 h-5 text-rose-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Notices</p>
              <p className="text-2xl font-bold text-white mt-1">{notices.length}</p>
              <p className="text-xs text-slate-500 mt-1">Active</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">Attendance</p>
              <p className="text-2xl font-bold text-white mt-1">
                {attendanceSummary.length > 0 && attendanceSummary[0].data
                  ? `${attendanceSummary[0].data.percentage}%`
                  : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">This month</p>
            </div>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10">
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Children Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-violet-400" /> My Children
          </h3>
          {children.length === 0 ? (
            <p className="text-slate-500 text-sm">No children linked to your account.</p>
          ) : (
            <div className="space-y-3">
              {children.map((child, i) => {
                const attData = attendanceSummary.find(a => a.childId === child._id)?.data;
                return (
                  <div key={child._id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                        {child.firstName?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{child.firstName} {child.lastName}</p>
                        <p className="text-xs text-slate-500">{child.classroom?.displayName} · #{child.admissionNo}</p>
                      </div>
                    </div>
                    {attData && (
                      <span className={`text-xs font-bold ${attData.percentage >= 75 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {attData.percentage}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Pending Fees */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" /> Pending Fees
          </h3>
          {pendingFees.length === 0 ? (
            <p className="text-slate-500 text-sm">All fees are up to date! 🎉</p>
          ) : (
            <div className="space-y-2">
              {pendingFees.slice(0, 5).map(f => {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                return (
                  <div key={f._id} className="flex items-center justify-between text-sm border-b border-slate-800/50 pb-2 last:border-0">
                    <div>
                      <p className="text-white text-xs font-medium">{f.student?.firstName} {f.student?.lastName}</p>
                      <p className="text-xs text-slate-500">{months[f.month - 1]} {f.year}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-rose-400 font-semibold text-xs">₹{f.finalAmount?.toLocaleString()}</p>
                      {feeStatusBadge(f.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Notices */}
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" /> School Notices
          </h3>
          {notices.length === 0 ? (
            <p className="text-slate-500 text-sm">No notices at this time.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {notices.map(n => (
                <div key={n._id} className={`p-3 rounded-lg border-l-4 bg-slate-800 ${
                  n.priority === 'Urgent' ? 'border-l-rose-500' :
                  n.priority === 'Important' ? 'border-l-amber-500' : 'border-l-slate-600'
                }`}>
                  <p className="text-xs font-semibold text-white">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                  <p className="text-xs text-slate-600 mt-1">{new Date(n.publishDate).toLocaleDateString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContent>
  );
}
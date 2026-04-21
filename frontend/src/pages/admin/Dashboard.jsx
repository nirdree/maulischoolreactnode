// pages/admin/Dashboard.jsx - Admin dashboard with key stats and recent notices
import { useEffect, useState } from 'react';
import { Users, UserCheck, School, DollarSign, CalendarDays, Bell, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, StatCard, Card } from '../../components/ui.jsx';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current academic year first
        const ayRes = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const ayId = ayRes.data?._id;

        const [overviewRes, noticesRes] = await Promise.all([
          api.get(`${API.REPORTS.OVERVIEW}?academicYear=${ayId}`),
          api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`),
        ]);

        setOverview(overviewRes.data);
        setNotices(noticesRes.data?.slice(0, 5) || []);
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const stats = overview?.students;
  const fees = overview?.fees;
  const employees = overview?.employees;

  return (
    <PageContent>
      <PageHeader title="Dashboard" subtitle="School management overview" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students"    value={stats?.total}    icon={Users}      color="indigo" trend={`${stats?.approved} approved`} />
        <StatCard label="Active Employees"  value={employees?.active} icon={UserCheck} color="emerald" trend={`${employees?.total} total`} />
        <StatCard label="Fee Collected"     value={fees?.collected ? `₹${(fees.collected/1000).toFixed(0)}K` : '—'} icon={DollarSign} color="amber" trend="This year" />
        <StatCard label="Pending Leaves"    value={overview?.leaves?.pending} icon={CalendarDays} color="rose" trend="Awaiting action" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Under Review Students */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" /> Student Status
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Approved', value: stats?.approved, color: 'bg-emerald-500' },
              { label: 'Under Review', value: stats?.underReview, color: 'bg-amber-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{item.label}</span>
                  <span className="text-white">{item.value}</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full`}
                    style={{ width: `${stats?.total ? (item.value / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Notices */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" /> Recent Notices
          </h3>
          {notices.length === 0 ? (
            <p className="text-slate-500 text-sm">No notices yet</p>
          ) : (
            <div className="space-y-3">
              {notices.map((n) => (
                <div key={n._id} className="flex items-start gap-3">
                  <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    n.priority === 'Urgent' ? 'bg-rose-500' :
                    n.priority === 'Important' ? 'bg-amber-500' : 'bg-slate-500'
                  }`} />
                  <div>
                    <p className="text-xs font-medium text-white">{n.title}</p>
                    <p className="text-xs text-slate-500">{n.priority} · {new Date(n.publishDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Fee Summary */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-400" /> Fee Overview
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Total Expected', value: fees?.total, color: 'text-white' },
              { label: 'Collected',      value: fees?.collected, color: 'text-emerald-400' },
              { label: 'Pending',        value: fees?.pending, color: 'text-rose-400' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-slate-400">{item.label}</span>
                <span className={`font-semibold ${item.color}`}>
                  ₹{item.value?.toLocaleString() ?? 0}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* School Info */}
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <School className="w-4 h-4 text-indigo-400" /> Quick Stats
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Active Classes',   value: overview?.classes?.total },
              { label: 'Total Employees',  value: employees?.total },
              { label: 'Active Employees', value: employees?.active },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-slate-400">{item.label}</span>
                <span className="font-semibold text-white">{item.value ?? '—'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageContent>
  );
}
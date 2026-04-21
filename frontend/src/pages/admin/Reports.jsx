// pages/admin/Reports.jsx
/**
 * REPORTS PAGE (Admin)
 * APIs Used:
 *   GET /api/reports/fee-collection
 *   GET /api/reports/fee-defaulters
 *   GET /api/reports/attendance-summary
 *   GET /api/reports/low-attendance
 *   GET /api/reports/exam-results
 *   GET /api/reports/classwise-students
 *   GET /api/reports/payroll-summary
 */
import { useEffect, useState } from 'react';
import { BarChart3, Users, DollarSign, CheckSquare, FileText, Banknote } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Badge, Table } from '../../components/ui.jsx';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const REPORT_TYPES = [
  { key: 'classwise', label: 'Class-wise Students', icon: Users },
  { key: 'fee-collection', label: 'Fee Collection', icon: DollarSign },
  { key: 'fee-defaulters', label: 'Fee Defaulters', icon: DollarSign },
  { key: 'attendance', label: 'Low Attendance', icon: CheckSquare },
  { key: 'exam-results', label: 'Exam Results', icon: FileText },
  { key: 'payroll', label: 'Payroll Summary', icon: Banknote },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('classwise');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ayId, setAyId] = useState('');
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

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

  const fetchReport = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      let res;
      const params = new URLSearchParams({ academicYear: ayId });
      switch (activeReport) {
        case 'classwise':
          res = await api.get(`${API.REPORTS.CLASSWISE_STUDENTS}?${params}`);
          break;
        case 'fee-collection':
          params.set('year', year);
          res = await api.get(`${API.REPORTS.FEE_COLLECTION}?${params}`);
          break;
        case 'fee-defaulters':
          if (classFilter) params.set('classId', classFilter);
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.FEE_DEFAULTERS}?${params}`);
          break;
        case 'attendance':
          if (classFilter) params.set('classId', classFilter);
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.LOW_ATTENDANCE}?${params}`);
          break;
        case 'exam-results':
          if (classFilter) params.set('classId', classFilter);
          res = await api.get(`${API.REPORTS.EXAM_RESULTS}?${params}`);
          break;
        case 'payroll':
          params.set('month', month); params.set('year', year);
          res = await api.get(`${API.REPORTS.PAYROLL_SUMMARY}?${params}`);
          break;
      }
      setReportData(res.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchReport(); }, [activeReport, ayId]);

  const classOptions = [{ value: '', label: 'All Classes' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))];
  const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }));

  return (
    <PageContent>
      <PageHeader title="Reports" subtitle="Analytics and insights" />

      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.key}
            onClick={() => { setActiveReport(rt.key); setReportData(null); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-xs font-medium transition border ${
              activeReport === rt.key
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <rt.icon className="w-4 h-4" />
            {rt.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {['fee-defaulters', 'attendance', 'exam-results'].includes(activeReport) && (
          <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-44" />
        )}
        {['fee-collection', 'fee-defaulters', 'attendance', 'payroll'].includes(activeReport) && (
          <>
            <Select options={monthOptions} value={month} onChange={e => setMonth(e.target.value)} className="w-28" />
            <input type="number" value={year} onChange={e => setYear(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-24" />
          </>
        )}
        <Button onClick={fetchReport} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
      </div>

      {loading && <div className="py-12 text-center text-slate-500">Loading report...</div>}

      {!loading && reportData && (
        <ReportDisplay type={activeReport} data={reportData} />
      )}
    </PageContent>
  );
}

function ReportDisplay({ type, data }) {
  switch (type) {
    case 'classwise': return <ClasswiseReport data={data} />;
    case 'fee-collection': return <FeeCollectionReport data={data} />;
    case 'fee-defaulters': return <FeeDefaultersReport data={data} />;
    case 'attendance': return <AttendanceReport data={data} />;
    case 'exam-results': return <ExamResultsReport data={data} />;
    case 'payroll': return <PayrollReport data={data} />;
    default: return null;
  }
}

function ClasswiseReport({ data }) {
  const columns = [
    { key: 'class', label: 'Class', render: (r) => r._id?.displayName || '—' },
    { key: 'total', label: 'Total' },
    { key: 'approved', label: 'Active', render: (r) => <span className="text-emerald-400">{r.approved}</span> },
    { key: 'underReview', label: 'Under Review', render: (r) => <span className="text-amber-400">{r.underReview}</span> },
    { key: 'boys', label: 'Boys', render: (r) => <span className="text-sky-400">{r.boys}</span> },
    { key: 'girls', label: 'Girls', render: (r) => <span className="text-violet-400">{r.girls}</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No data" />
    </Card>
  );
}

function FeeCollectionReport({ data }) {
  const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const columns = [
    { key: 'month', label: 'Month', render: (r) => MONTHS_FULL[r.month - 1] },
    { key: 'totalExpected', label: 'Expected', render: (r) => `₹${r.totalExpected?.toLocaleString()}` },
    { key: 'totalCollected', label: 'Collected', render: (r) => <span className="text-emerald-400">₹{r.totalCollected?.toLocaleString()}</span> },
    { key: 'totalPending', label: 'Pending', render: (r) => <span className="text-rose-400">₹{r.totalPending?.toLocaleString()}</span> },
    { key: 'collectionRate', label: 'Rate', render: (r) => <span className="text-amber-400">{r.collectionRate}%</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No fee data" />
    </Card>
  );
}

function FeeDefaultersReport({ data }) {
  const columns = [
    { key: 'student', label: 'Student', render: (f) => `${f.student?.firstName} ${f.student?.lastName}` },
    { key: 'admissionNo', label: 'Adm No', render: (f) => f.student?.admissionNo },
    { key: 'classroom', label: 'Class', render: (f) => f.classroom?.displayName },
    { key: 'month', label: 'Period', render: (f) => `${f.month}/${f.year}` },
    { key: 'finalAmount', label: 'Amount', render: (f) => <span className="text-rose-400">₹{f.finalAmount?.toLocaleString()}</span> },
    { key: 'status', label: 'Status', render: (f) => <Badge label={f.status} color={f.status === 'Overdue' ? 'red' : 'yellow'} /> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No defaulters" />
    </Card>
  );
}

function AttendanceReport({ data }) {
  const columns = [
    { key: 'student', label: 'Student', render: (r) => `${r._id?.firstName || ''} ${r._id?.lastName || ''}` },
    { key: 'total', label: 'Total Days' },
    { key: 'present', label: 'Present', render: (r) => <span className="text-emerald-400">{r.present}</span> },
    { key: 'absent', label: 'Absent', render: (r) => <span className="text-rose-400">{r.absent}</span> },
    {
      key: 'percentage', label: 'Attendance %',
      render: (r) => (
        <span className={r.percentage < 75 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>{r.percentage}%</span>
      ),
    },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No attendance data" />
    </Card>
  );
}

function ExamResultsReport({ data }) {
  const columns = [
    { key: 'exam', label: 'Exam', render: (r) => r._id?.exam?.name || '—' },
    { key: 'class', label: 'Class', render: (r) => r._id?.classroom?.displayName || '—' },
    { key: 'totalStudents', label: 'Students' },
    { key: 'averageMarks', label: 'Avg Marks', render: (r) => <span className="text-indigo-400">{r.averageMarks}</span> },
    { key: 'highestMarks', label: 'Highest', render: (r) => <span className="text-emerald-400">{r.highestMarks}</span> },
    { key: 'passCount', label: 'Passed', render: (r) => <span className="text-amber-400">{r.passCount}</span> },
    { key: 'gradeF', label: 'Failed', render: (r) => <span className="text-rose-400">{r.gradeF}</span> },
  ];
  return (
    <Card className="!p-0">
      <Table columns={columns} data={data} emptyMessage="No exam data" />
    </Card>
  );
}

function PayrollReport({ data }) {
  const s = data.summary || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: s.totalEmployees },
          { label: 'Total Net Salary', value: `₹${s.totalNet?.toLocaleString() || 0}` },
          { label: 'Paid', value: s.paidCount },
          { label: 'Pending', value: s.pendingCount },
        ].map(stat => (
          <Card key={stat.label}>
            <p className="text-xs text-slate-400 uppercase">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value ?? '—'}</p>
          </Card>
        ))}
      </div>
      <Card className="!p-0">
        <Table
          columns={[
            { key: 'employee', label: 'Employee', render: (p) => p.employee?.name },
            { key: 'basicSalary', label: 'Basic', render: (p) => `₹${p.basicSalary?.toLocaleString()}` },
            { key: 'netSalary', label: 'Net', render: (p) => <span className="text-white font-semibold">₹{p.netSalary?.toLocaleString()}</span> },
            { key: 'status', label: 'Status', render: (p) => <Badge label={p.status} color={p.status === 'Paid' ? 'green' : 'yellow'} /> },
          ]}
          data={data.records || []}
          emptyMessage="No payroll records"
        />
      </Card>
    </div>
  );
}
// pages/admin/StudentDetail.jsx
/**
 * STUDENT DETAIL PAGE — Full profile, fees, marks, attendance, parent controls
 *
 * Route: /students/:id   (add to your router)
 *
 * APIs used:
 *   GET /api/students/:id/overview         — profile + summary stats
 *   GET /api/students/:id/attendance       — attendance records (filterable)
 *   GET /api/students/:id/marks            — exam marks (filterable)
 *   GET /api/students/:id/fees             — fee records + payments
 *   GET /api/students/:id/academic-history — year-over-year marks
 *   PATCH /api/students/:id/status         — change status
 *   PATCH /api/students/:id/block-parent   — block/unblock parent login
 *   PATCH /api/students/:id/parent-password— reset parent password
 *   PATCH /api/students/:id/link-parent    — re-link parent account
 *   PUT   /api/students/:id               — edit profile
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, BookOpen, Calendar, DollarSign, History,
  Edit2, KeyRound, ShieldOff, ShieldCheck, RefreshCw,
  CheckCircle2, XCircle, Clock, AlertCircle, ChevronDown,
  TrendingUp, TrendingDown, Minus, X, Search, UserPlus, ChevronRight,
  LogOut, FileText, Download,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal,
} from '../../components/ui.jsx';

// ─── Constants ────────────────────────────────────────────────

const STATUS_COLOR = {
  Approved: 'green', UnderReview: 'yellow', Rejected: 'red',
  OnHold: 'orange', Left: 'gray', Alumni: 'indigo',
};

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ATT_COLOR = {
  Present: 'text-emerald-400', Absent: 'text-red-400',
  Late: 'text-amber-400', HalfDay: 'text-blue-400', Holiday: 'text-slate-500',
};

const GRADE_COLOR = {
  'A+': 'text-emerald-400', A: 'text-emerald-400', 'B+': 'text-blue-400',
  B: 'text-blue-400', C: 'text-amber-400', D: 'text-orange-400', F: 'text-red-400',
};

const FEE_STATUS_COLOR = {
  Paid: 'green', Pending: 'yellow', Overdue: 'red',
  PartiallyPaid: 'orange', Waived: 'gray',
};

const EXAM_TYPE_LABELS = {
  UnitTest1: 'Unit Test 1', UnitTest2: 'Unit Test 2',
  MidTerm: 'Mid Term', FinalExam: 'Final Exam',
  Project: 'Project', Other: 'Other',
};

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (date) => date ? new Date(date).toLocaleDateString('en-IN') : '—';
const fmtMoney = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-semibold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">{children}</h3>;
}

function InfoPair({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-white">{value || '—'}</span>
    </div>
  );
}

function PercentBar({ pct, color = 'bg-indigo-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-400 min-w-[32px] text-right">{pct}%</span>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',  label: 'Overview',  icon: User       },
  { id: 'marks',     label: 'Marks',     icon: BookOpen   },
  { id: 'attendance',label: 'Attendance',icon: Calendar   },
  { id: 'fees',      label: 'Fees',      icon: DollarSign },
  { id: 'history',   label: 'History',   icon: History    },
];

// ─── Main Page ────────────────────────────────────────────────

export default function StudentDetailPage() {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [data,        setData]        = useState(null);
  const [activeTab,   setActiveTab]   = useState('overview');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  // modal states
  const [editOpen,   setEditOpen]   = useState(false);
  const [pwOpen,     setPwOpen]     = useState(false);
  const [leaveOpen,  setLeaveOpen]  = useState(false);
  const [linkOpen,   setLinkOpen]   = useState(null); // 'father'|'mother'

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`${API.STUDENTS.BASE}/${id}/overview`);
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <PageContent>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    </PageContent>
  );

  if (error) return (
    <PageContent>
      <div className="text-red-400 text-center py-12">{error}</div>
    </PageContent>
  );

  if (!data) return null;

  const { student, attendance, fees, exams } = data;
  const hasParent   = !!(student.fatherUser || student.motherUser);
  const parentBlocked = student.fatherUser?.status === 'inactive' || student.motherUser?.status === 'inactive';

  const handleBlockParent = async (blocked) => {
    if (!confirm(`${blocked ? 'Block' : 'Unblock'} parent login?`)) return;
    try {
      await api.patch(API.STUDENTS.BLOCK_PARENT(id), { target: 'both', blocked });
      load();
    } catch (err) { alert(err?.response?.data?.message || err.message); }
  };

  return (
    <PageContent>
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold text-white">
              {student.firstName} {student.middleName} {student.lastName}
            </h1>
            <Badge label={student.status} color={STATUS_COLOR[student.status] || 'gray'} />
            <span className="text-sm text-slate-500">{student.admissionNo}</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {student.classroom?.displayName} · {student.academicYear?.name}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
          <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
            <Edit2 className="w-3 h-3 mr-1" /> Edit
          </Button>
          {student.status === 'Approved' && (
            <Button size="sm" variant="secondary" onClick={() => setLeaveOpen(true)}>
              <LogOut className="w-3 h-3 mr-1" /> Mark Left
            </Button>
          )}
          {hasParent && (
            <>
              <Button
                size="sm"
                variant={parentBlocked ? 'success' : 'secondary'}
                onClick={() => handleBlockParent(!parentBlocked)}
              >
                {parentBlocked ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldOff className="w-3 h-3 mr-1" />}
                {parentBlocked ? 'Unblock Parent' : 'Block Parent'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPwOpen(true)}>
                <KeyRound className="w-3 h-3 mr-1" /> Password
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex gap-1 mb-6 bg-slate-800 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setActiveTab(tid)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tid ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {activeTab === 'overview'   && <OverviewTab   student={student} attendance={attendance} fees={fees} exams={exams} onLinkParent={(slot) => setLinkOpen(slot)} />}
      {activeTab === 'marks'      && <MarksTab      studentId={id} />}
      {activeTab === 'attendance' && <AttendanceTab studentId={id} />}
      {activeTab === 'fees'       && <FeesTab       studentId={id} />}
      {activeTab === 'history'    && <HistoryTab    studentId={id} />}

      {/* ── Modals ── */}
      <EditStudentModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={student}
        onSuccess={() => { load(); setEditOpen(false); }}
      />
      <ParentPasswordModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        student={student}
        onSuccess={() => setPwOpen(false)}
      />
      <LeaveModal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        student={student}
        onSuccess={() => { load(); setLeaveOpen(false); }}
      />
      <LinkParentModal
        open={!!linkOpen}
        slot={linkOpen}
        onClose={() => setLinkOpen(null)}
        student={student}
        onSuccess={() => { load(); setLinkOpen(null); }}
      />
    </PageContent>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────

function OverviewTab({ student, attendance, fees, exams, onLinkParent }) {
  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Attendance"
          value={`${attendance.percentage}%`}
          sub={`${attendance.Present} present / ${attendance.total} days`}
          color={attendance.percentage >= 75 ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatCard
          label="Fees Due"
          value={fmtMoney(fees.pending + fees.overdue)}
          sub={fees.overdue > 0 ? `₹${fees.overdue.toLocaleString('en-IN')} overdue` : 'All current'}
          color={(fees.pending + fees.overdue) > 0 ? 'text-amber-400' : 'text-emerald-400'}
        />
        <StatCard
          label="Overall %"
          value={`${exams.overallPercentage}%`}
          sub={`${exams.totalExams} exam${exams.totalExams !== 1 ? 's' : ''} taken`}
          color={exams.overallPercentage >= 75 ? 'text-emerald-400' : exams.overallPercentage >= 50 ? 'text-amber-400' : 'text-red-400'}
        />
        <StatCard
          label="Roll No"
          value={student.rollNumber || '—'}
          sub={student.classroom?.displayName}
        />
      </div>

      {/* Personal Info */}
      <Card>
        <SectionTitle>Personal Information</SectionTitle>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoPair label="Date of Birth"   value={fmt(student.dateOfBirth)} />
          <InfoPair label="Gender"          value={student.gender} />
          <InfoPair label="Blood Group"     value={student.bloodGroup} />
          <InfoPair label="Religion"        value={student.religion} />
          <InfoPair label="Caste"           value={student.caste} />
          <InfoPair label="Mother Tongue"   value={student.motherTongue} />
          <InfoPair label="Place of Birth"  value={student.placeOfBirth} />
          <InfoPair label="PEN Number"      value={student.penNumber} />
          <InfoPair label="Previous School" value={student.previousSchoolName} />
          <InfoPair label="Previous Class"  value={student.previousClass} />
          <InfoPair label="Admitted"        value={fmt(student.createdAt)} />
          <InfoPair label="Academic Year"   value={student.academicYear?.name} />
        </div>
        {student.status === 'Left' && (
          <div className="mt-4 p-3 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-400">
            Left on {fmt(student.leavingDate)} · {student.leavingReason || 'No reason given'}
          </div>
        )}
        {student.status === 'Rejected' && student.rejectionRemark && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            Rejection remark: {student.rejectionRemark}
          </div>
        )}
        {student.status === 'OnHold' && student.holdRemark && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
            Hold remark: {student.holdRemark}
          </div>
        )}
      </Card>

      {/* Parents */}
      <Card>
        <SectionTitle>Parent / Guardian</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ParentCard
            role="Father"
            name={student.fatherName}
            phone={student.fatherPhone}
            email={student.fatherEmail}
            occupation={student.fatherOccupation}
            userAccount={student.fatherUser}
            onLink={() => onLinkParent('father')}
          />
          <ParentCard
            role="Mother"
            name={student.motherName}
            phone={student.motherPhone}
            email={student.motherEmail}
            occupation={student.motherOccupation}
            userAccount={student.motherUser}
            onLink={() => onLinkParent('mother')}
          />
        </div>
      </Card>

      {/* Subject Summary */}
      {exams.subjectStats.length > 0 && (
        <Card>
          <SectionTitle>Subject Performance</SectionTitle>
          <div className="space-y-3">
            {exams.subjectStats.map((s) => (
              <div key={s.name} className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">{s.name}</span>
                  <span className="text-xs text-slate-500">{s.obtained}/{s.total}</span>
                </div>
                <PercentBar
                  pct={s.percentage}
                  color={s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Attendance */}
      <Card>
        <SectionTitle>Attendance This Year</SectionTitle>
        <div className="grid grid-cols-5 gap-3 mb-4">
          {['Present', 'Absent', 'Late', 'HalfDay', 'Holiday'].map((s) => (
            <div key={s} className="text-center">
              <p className={`text-xl font-semibold ${ATT_COLOR[s]}`}>{attendance[s] || 0}</p>
              <p className="text-xs text-slate-500">{s}</p>
            </div>
          ))}
        </div>
        {/* Mini calendar-like grid of last 30 records */}
        <div className="flex flex-wrap gap-1 mt-2">
          {(attendance.records || []).map((a, i) => (
            <div
              key={i}
              title={`${fmt(a.date)}: ${a.status}`}
              className={`w-5 h-5 rounded text-center text-xs leading-5 font-medium
                ${a.status === 'Present' ? 'bg-emerald-500/20 text-emerald-400' :
                  a.status === 'Absent'  ? 'bg-red-500/20 text-red-400'        :
                  a.status === 'Late'    ? 'bg-amber-500/20 text-amber-400'    :
                  a.status === 'HalfDay'? 'bg-blue-500/20 text-blue-400'       :
                  'bg-slate-700 text-slate-500'}`}
            >
              {a.status[0]}
            </div>
          ))}
        </div>
        {attendance.records?.length === 30 && (
          <p className="text-xs text-slate-600 mt-2">Showing last 30 records. Go to the Attendance tab for full history.</p>
        )}
      </Card>

      {/* Fee Quick Summary */}
      <Card>
        <SectionTitle>Fee Summary This Year</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xl font-semibold text-emerald-400">{fmtMoney(fees.paid)}</p>
            <p className="text-xs text-slate-500">Paid</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-amber-400">{fmtMoney(fees.pending)}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold text-red-400">{fmtMoney(fees.overdue)}</p>
            <p className="text-xs text-slate-500">Overdue</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ParentCard({ role, name, phone, email, occupation, userAccount, onLink }) {
  return (
    <div className="p-4 rounded-xl border border-slate-700 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{role}</span>
        {userAccount ? (
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            userAccount.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            Login {userAccount.status}
          </span>
        ) : (
          <button onClick={onLink} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <UserPlus className="w-3 h-3" /> Link account
          </button>
        )}
      </div>
      <p className="text-sm font-medium text-white">{name || '—'}</p>
      {phone       && <p className="text-xs text-slate-400">📱 {phone}</p>}
      {email       && <p className="text-xs text-slate-400">✉ {email}</p>}
      {occupation  && <p className="text-xs text-slate-400">💼 {occupation}</p>}
      {userAccount && (
        <p className="text-xs text-slate-500">Login: {userAccount.email}</p>
      )}
      {userAccount && (
        <button onClick={onLink} className="text-xs text-slate-500 hover:text-indigo-400 transition-colors">
          Change account →
        </button>
      )}
    </div>
  );
}

// ─── Marks Tab ────────────────────────────────────────────────

function MarksTab({ studentId }) {
  const [marks,      setMarks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [examType,   setExamType]   = useState('');
  const [groupBy,    setGroupBy]    = useState('exam'); // 'exam' | 'subject'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (examType) params.set('examType', examType);
      const res = await api.get(`${API.STUDENTS.BASE}/${studentId}/marks?${params}`);
      setMarks(res.data || []);
    } catch {} finally { setLoading(false); }
  }, [studentId, examType]);

  useEffect(() => { load(); }, [load]);

  // Group by subject
  const bySubject = {};
  for (const m of marks) {
    const key = m.subject?.name || 'Unknown';
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(m);
  }

  const marksColumns = [
    { key: 'exam',    label: 'Exam',    render: (m) => (
      <div>
        <p className="text-sm text-white">{m.exam?.name || '—'}</p>
        <p className="text-xs text-slate-500">{EXAM_TYPE_LABELS[m.exam?.examType] || m.exam?.examType}</p>
      </div>
    )},
    { key: 'subject', label: 'Subject', render: (m) => m.subject?.name || '—' },
    { key: 'date',    label: 'Date',    render: (m) => fmt(m.exam?.examDate) },
    { key: 'marks',   label: 'Marks',   render: (m) => (
      m.isAbsent
        ? <span className="text-slate-500 text-sm italic">Absent</span>
        : <span className="text-white text-sm">{m.marksObtained} / {m.exam?.totalMarks || '—'}</span>
    )},
    { key: 'grade',   label: 'Grade',   render: (m) => (
      <span className={`font-semibold ${GRADE_COLOR[m.grade] || 'text-slate-400'}`}>{m.grade || '—'}</span>
    )},
    { key: 'pct',     label: '%',       render: (m) => {
      if (m.isAbsent || !m.exam?.totalMarks) return <span className="text-slate-500">—</span>;
      const pct = Math.round((m.marksObtained / m.exam.totalMarks) * 100);
      return (
        <div className="flex items-center gap-2 min-w-[80px]">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-400">{pct}%</span>
        </div>
      );
    }},
    { key: 'remarks', label: 'Remarks', render: (m) => <span className="text-xs text-slate-500">{m.remarks || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={examType}
          onChange={(e) => setExamType(e.target.value)}
          options={[
            { value: '',          label: 'All Exam Types' },
            { value: 'UnitTest1', label: 'Unit Test 1'   },
            { value: 'UnitTest2', label: 'Unit Test 2'   },
            { value: 'MidTerm',   label: 'Mid Term'      },
            { value: 'FinalExam', label: 'Final Exam'    },
            { value: 'Project',   label: 'Project'       },
            { value: 'Other',     label: 'Other'         },
          ]}
          className="w-44"
        />
        <div className="flex rounded-lg border border-slate-700 overflow-hidden">
          {['exam', 'subject'].map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1.5 text-sm transition-colors ${groupBy === g ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              By {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {groupBy === 'exam' ? (
        <Card className="!p-0">
          <Table columns={marksColumns} data={marks} loading={loading} emptyMessage="No exam records found" />
        </Card>
      ) : (
        <div className="space-y-4">
          {loading
            ? <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>
            : Object.entries(bySubject).length === 0
              ? <div className="text-center py-8 text-slate-500">No exam records found</div>
              : Object.entries(bySubject).map(([subName, subMarks]) => {
                  const valid = subMarks.filter(m => !m.isAbsent);
                  const obt   = valid.reduce((s, m) => s + m.marksObtained, 0);
                  const tot   = valid.reduce((s, m) => s + (m.exam?.totalMarks || 100), 0);
                  const pct   = tot > 0 ? Math.round((obt / tot) * 100) : 0;
                  return (
                    <Card key={subName}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white">{subName}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-slate-400">{obt}/{tot} total</span>
                          <span className={`font-semibold text-sm ${pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
                        </div>
                      </div>
                      <PercentBar pct={pct} color={pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'} />
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                        {subMarks.map((m) => {
                          const mp = m.exam?.totalMarks ? Math.round((m.marksObtained / m.exam.totalMarks) * 100) : 0;
                          return (
                            <div key={m._id} className="p-2 rounded-lg bg-slate-800 flex justify-between items-center">
                              <div>
                                <p className="text-xs text-white">{EXAM_TYPE_LABELS[m.exam?.examType] || m.exam?.examType || '—'}</p>
                                <p className="text-xs text-slate-500">{fmt(m.exam?.examDate)}</p>
                              </div>
                              <div className="text-right">
                                {m.isAbsent
                                  ? <span className="text-xs text-slate-500">Absent</span>
                                  : <>
                                      <p className="text-sm font-medium text-white">{m.marksObtained}/{m.exam?.totalMarks}</p>
                                      <p className={`text-xs ${GRADE_COLOR[m.grade] || 'text-slate-400'}`}>{m.grade}</p>
                                    </>
                                }
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  );
                })
          }
        </div>
      )}
    </div>
  );
}

// ─── Attendance Tab ───────────────────────────────────────────

function AttendanceTab({ studentId }) {
  const now   = new Date();
  const [month,   setMonth]   = useState(String(now.getMonth() + 1));
  const [year,    setYear]    = useState(String(now.getFullYear()));
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ month, year });
      const res = await api.get(`${API.STUDENTS.BASE}/${studentId}/attendance?${params}`);
      setRecords(res.data || []);
    } catch {} finally { setLoading(false); }
  }, [studentId, month, year]);

  useEffect(() => { load(); }, [load]);

  const summary = { Present: 0, Absent: 0, Late: 0, HalfDay: 0, Holiday: 0 };
  for (const r of records) summary[r.status] = (summary[r.status] || 0) + 1;
  const working  = records.length - (summary.Holiday || 0);
  const pct      = working > 0 ? Math.round(((summary.Present + summary.Late * 0.5 + summary.HalfDay * 0.5) / working) * 100) : 0;

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = now.getFullYear() - i;
    return { value: String(y), label: String(y) };
  });
  const monthOptions = MONTH_NAMES.slice(1).map((m, i) => ({ value: String(i + 1), label: m }));

  const columns = [
    { key: 'date',    label: 'Date',    render: (r) => fmt(r.date) },
    { key: 'day',     label: 'Day',     render: (r) => new Date(r.date).toLocaleDateString('en-IN', { weekday: 'long' }) },
    { key: 'status',  label: 'Status',  render: (r) => (
      <span className={`font-medium text-sm ${ATT_COLOR[r.status]}`}>{r.status}</span>
    )},
    { key: 'remark',  label: 'Remark',  render: (r) => <span className="text-xs text-slate-500">{r.remark || '—'}</span> },
    { key: 'markedBy',label: 'Marked By',render:(r) => <span className="text-xs text-slate-500">{r.markedBy?.name || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <Select label="Month" value={month} onChange={(e) => setMonth(e.target.value)} options={monthOptions} className="w-36" />
        <Select label="Year"  value={year}  onChange={(e) => setYear(e.target.value)}  options={yearOptions}  className="w-28" />
        <Button variant="ghost" onClick={load}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {Object.entries(summary).map(([k, v]) => (
          <div key={k} className="bg-slate-800 rounded-xl p-3 text-center">
            <p className={`text-lg font-semibold ${ATT_COLOR[k]}`}>{v}</p>
            <p className="text-xs text-slate-500">{k}</p>
          </div>
        ))}
        <div className="bg-slate-800 rounded-xl p-3 text-center">
          <p className={`text-lg font-semibold ${pct >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>{pct}%</p>
          <p className="text-xs text-slate-500">Attendance</p>
        </div>
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={records} loading={loading} emptyMessage="No records for this month" />
      </Card>
    </div>
  );
}

// ─── Fees Tab ─────────────────────────────────────────────────

function FeesTab({ studentId }) {
  const [data,    setData]    = useState({ fees: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [expanded,setExpanded]= useState(null); // fee _id

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API.STUDENTS.BASE}/${studentId}/fees`);
      setData(res.data || { fees: [], payments: [] });
    } catch {} finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const paymentsByFee = {};
  for (const p of data.payments) {
    const key = String(p.fee);
    if (!paymentsByFee[key]) paymentsByFee[key] = [];
    paymentsByFee[key].push(p);
  }

  const total   = data.fees.reduce((s, f) => s + f.finalAmount, 0);
  const paid    = data.fees.filter(f => f.status === 'Paid').reduce((s, f) => s + f.finalAmount, 0);
  const pending = total - paid;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total"   value={fmtMoney(total)}   color="text-white" />
        <StatCard label="Paid"    value={fmtMoney(paid)}    color="text-emerald-400" />
        <StatCard label="Balance" value={fmtMoney(pending)} color={pending > 0 ? 'text-amber-400' : 'text-emerald-400'} />
      </div>

      {/* Monthly Records */}
      {loading
        ? <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>
        : data.fees.length === 0
          ? <div className="text-center py-8 text-slate-500">No fee records found</div>
          : (
            <div className="space-y-3">
              {data.fees.map((f) => {
                const isOpen    = expanded === f._id;
                const payments  = paymentsByFee[String(f._id)] || [];
                return (
                  <Card key={f._id} className="!p-0 overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : f._id)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">{MONTH_NAMES[f.month]} {f.year}</p>
                          <p className="text-xs text-slate-500">Due: {fmt(f.dueDate)}</p>
                        </div>
                        <Badge label={f.status} color={FEE_STATUS_COLOR[f.status] || 'gray'} />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{fmtMoney(f.finalAmount)}</p>
                          {f.discount > 0 && <p className="text-xs text-emerald-400">-{fmtMoney(f.discount)} discount</p>}
                        </div>
                        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-800 px-5 pb-4 pt-3 space-y-4">
                        {/* Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                          {[
                            ['Tuition',   f.tuitionFee],
                            ['Transport', f.transportFee],
                            ['Activity',  f.activityFee],
                            ['Other',     f.otherFee],
                            ['Late Fine', f.lateFine],
                          ].map(([label, amt]) => amt > 0 && (
                            <div key={label} className="bg-slate-800 rounded-lg px-3 py-2">
                              <p className="text-xs text-slate-500">{label}</p>
                              <p className="text-white">{fmtMoney(amt)}</p>
                            </div>
                          ))}
                        </div>

                        {/* Payments */}
                        {payments.length > 0 ? (
                          <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Payment Receipts</p>
                            <div className="space-y-2">
                              {payments.map((p) => (
                                <div key={p._id} className="flex items-center justify-between text-sm bg-slate-800 rounded-lg px-3 py-2">
                                  <div>
                                    <span className="text-white">{p.receiptNo}</span>
                                    <span className="text-slate-500 ml-2">· {p.paymentMode}</span>
                                    {p.transactionId && <span className="text-slate-600 ml-2 text-xs">{p.transactionId}</span>}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-emerald-400 font-medium">{fmtMoney(p.amountPaid)}</p>
                                    <p className="text-xs text-slate-500">{fmt(p.paymentDate)} · {p.collectedBy?.name || '—'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600">No payments recorded yet</p>
                        )}

                        {f.notes && (
                          <p className="text-xs text-slate-500 italic">{f.notes}</p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )
      }
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────────

function HistoryTab({ studentId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded,setExpanded]= useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API.STUDENTS.BASE}/${studentId}/academic-history`);
      setHistory(res.data || []);
    } catch {} finally { setLoading(false); }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex justify-center py-8"><RefreshCw className="w-5 h-5 animate-spin text-slate-500" /></div>;
  if (!history.length) return <div className="text-center py-8 text-slate-500">No academic history found</div>;

  return (
    <div className="space-y-4">
      {history.map((entry) => {
        const isOpen = expanded === entry.academicYear._id;
        const pct    = entry.summary.overallPerc;

        // Group marks by examType within this year
        const byType = {};
        for (const m of entry.marks) {
          const t = m.exam?.examType || 'Other';
          if (!byType[t]) byType[t] = [];
          byType[t].push(m);
        }

        return (
          <Card key={entry.academicYear._id} className="!p-0 overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : entry.academicYear._id)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
            >
              <div className="text-left">
                <p className="text-sm font-medium text-white">{entry.academicYear.name}</p>
                <p className="text-xs text-slate-500">{entry.summary.totalExams} exams</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-lg font-semibold ${pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</p>
                  <p className="text-xs text-slate-500">Overall</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-slate-800 px-5 pb-5 pt-4 space-y-5">
                {Object.entries(byType).map(([type, typeMarks]) => (
                  <div key={type}>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">{EXAM_TYPE_LABELS[type] || type}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 border-b border-slate-800">
                            <th className="text-left py-1 pr-4 font-normal">Subject</th>
                            <th className="text-center py-1 px-2 font-normal">Marks</th>
                            <th className="text-center py-1 px-2 font-normal">Grade</th>
                            <th className="text-left py-1 px-2 font-normal w-32">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {typeMarks.map((m) => {
                            const mp = m.exam?.totalMarks ? Math.round((m.marksObtained / m.exam.totalMarks) * 100) : 0;
                            return (
                              <tr key={m._id} className="border-b border-slate-800/50">
                                <td className="py-2 pr-4 text-slate-300">{m.subject?.name || '—'}</td>
                                <td className="py-2 px-2 text-center text-white">
                                  {m.isAbsent ? <span className="text-slate-500 italic">Absent</span> : `${m.marksObtained}/${m.exam?.totalMarks || '—'}`}
                                </td>
                                <td className={`py-2 px-2 text-center font-medium ${GRADE_COLOR[m.grade] || 'text-slate-400'}`}>{m.grade || '—'}</td>
                                <td className="py-2 px-2">
                                  {!m.isAbsent && (
                                    <div className="flex items-center gap-1">
                                      <div className="flex-1 h-1 bg-slate-700 rounded-full">
                                        <div className={`h-full rounded-full ${mp >= 75 ? 'bg-emerald-500' : mp >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${mp}%` }} />
                                      </div>
                                      <span className="text-xs text-slate-500">{mp}%</span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ─── Edit Student Modal (inline on this page) ─────────────────
// Simplified version — delegates status/parent changes separately

function EditStudentModal({ open, onClose, student, onSuccess }) {
  const [form,   setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');
  const [tab,    setTab]    = useState(0);

  useEffect(() => {
    if (!student) return;
    setTab(0); setError('');
    setForm({
      firstName: student.firstName || '', middleName: student.middleName || '',
      lastName:  student.lastName  || '', gender: student.gender || 'Male',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      bloodGroup: student.bloodGroup || '', religion: student.religion || '',
      caste: student.caste || '', motherTongue: student.motherTongue || '',
      placeOfBirth: student.placeOfBirth || '', penNumber: student.penNumber || '',
      previousSchoolName: student.previousSchoolName || '', previousClass: student.previousClass || '',
    });
  }, [student]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      await api.put(API.STUDENTS.BY_ID(student._id), form);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const GENDER_OPTIONS = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
  ];

  const EDIT_TABS = ['Personal', 'School & Status'];

  return (
    <Modal open={open} onClose={onClose} title="Edit Student Profile" width="max-w-2xl">
      <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1">
        {EDIT_TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${tab === i ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>
      {error && <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {tab === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *"   value={form.firstName || ''}   onChange={(e) => set('firstName',   e.target.value)} />
          <Input label="Last Name *"    value={form.lastName || ''}    onChange={(e) => set('lastName',    e.target.value)} />
          <Input label="Middle Name"    value={form.middleName || ''}  onChange={(e) => set('middleName',  e.target.value)} />
          <Select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} options={GENDER_OPTIONS} />
          <Input label="Date of Birth" type="date" value={form.dateOfBirth || ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
          <Input label="Blood Group"    value={form.bloodGroup || ''}   onChange={(e) => set('bloodGroup',   e.target.value)} />
          <Input label="Religion"       value={form.religion || ''}     onChange={(e) => set('religion',     e.target.value)} />
          <Input label="Caste"          value={form.caste || ''}        onChange={(e) => set('caste',        e.target.value)} />
          <Input label="Mother Tongue"  value={form.motherTongue || ''} onChange={(e) => set('motherTongue', e.target.value)} />
          <Input label="Place of Birth" value={form.placeOfBirth || ''} onChange={(e) => set('placeOfBirth', e.target.value)} />
          <Input label="PEN Number"     value={form.penNumber || ''}    onChange={(e) => set('penNumber',    e.target.value)} />
        </div>
      )}
      {tab === 1 && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Previous School" value={form.previousSchoolName || ''} onChange={(e) => set('previousSchoolName', e.target.value)} className="col-span-2" />
          <Input label="Previous Class"  value={form.previousClass || ''}      onChange={(e) => set('previousClass',      e.target.value)} />
          <div className="col-span-2 p-3 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-500">
            To change status, parent links, or class — use the dedicated controls on the student detail page header.
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
      </div>
    </Modal>
  );
}

// ─── Leave Modal ──────────────────────────────────────────────

function LeaveModal({ open, onClose, student, onSuccess }) {
  const [form,   setForm]   = useState({ leavingDate: '', leavingReason: '' });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (open) { setForm({ leavingDate: '', leavingReason: '' }); setError(''); }
  }, [open]);

  const handleSubmit = async () => {
    setError('');
    if (!form.leavingDate) { setError('Leaving date is required.'); return; }
    setSaving(true);
    try {
      await api.patch(API.STUDENTS.STATUS(student._id), { status: 'Left', ...form });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Mark Student as Left" width="max-w-md">
      {student && (
        <div className="mb-4 p-3 rounded-lg bg-slate-800 border border-slate-700">
          <p className="text-sm text-white font-medium">{student.firstName} {student.lastName}</p>
          <p className="text-xs text-slate-400">{student.admissionNo} · {student.classroom?.displayName}</p>
        </div>
      )}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 mb-4">
        Parent login accounts will be deactivated if they have no other active children.
      </div>
      {error && <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Leaving Date *" type="date" value={form.leavingDate} onChange={(e) => setForm(f => ({ ...f, leavingDate: e.target.value }))} className="col-span-2" />
        <Input label="Reason" value={form.leavingReason} onChange={(e) => setForm(f => ({ ...f, leavingReason: e.target.value }))} placeholder="Transfer, relocation…" className="col-span-2" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleSubmit} disabled={saving}>{saving ? 'Saving…' : 'Mark as Left'}</Button>
      </div>
    </Modal>
  );
}

// ─── Parent Password Modal ────────────────────────────────────

function ParentPasswordModal({ open, onClose, student, onSuccess }) {
  const [target,   setTarget]   = useState('father');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!open) return;
    setPassword(''); setConfirm(''); setError('');
    if (student?.fatherUser)      setTarget('father');
    else if (student?.motherUser) setTarget('mother');
  }, [open, student]);

  const hasFather   = !!student?.fatherUser;
  const hasMother   = !!student?.motherUser;
  const sameAccount = hasFather && hasMother &&
    String(student.fatherUser._id || student.fatherUser) ===
    String(student.motherUser._id || student.motherUser);

  const handleSubmit = async () => {
    setError('');
    if (!password)            { setError('Enter a new password.'); return; }
    if (password.length < 6)  { setError('Minimum 6 characters.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await api.patch(API.STUDENTS.PARENT_PASSWORD(student._id), { target, password });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Reset Parent Password" width="max-w-md">
      {student && <p className="mb-4 text-sm text-slate-400">Student: <span className="text-white font-medium">{student.firstName} {student.lastName}</span></p>}
      {error && <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      {!sameAccount && (hasFather || hasMother) && (
        <div className="flex gap-2 mb-4">
          {hasFather && (
            <button onClick={() => setTarget('father')}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${target === 'father' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 text-slate-400'}`}>
              Father<br/><span className="text-xs opacity-70">{student.fatherUser?.email}</span>
            </button>
          )}
          {hasMother && (
            <button onClick={() => setTarget('mother')}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${target === 'mother' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 text-slate-400'}`}>
              Mother<br/><span className="text-xs opacity-70">{student.motherUser?.email}</span>
            </button>
          )}
        </div>
      )}
      {sameAccount && <p className="mb-4 text-xs text-slate-500">Both parents share one account ({student.fatherUser?.email}).</p>}
      <div className="flex flex-col gap-4">
        <Input label="New Password *"     type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
        <Input label="Confirm Password *" type="password" value={confirm}  onChange={(e) => setConfirm(e.target.value)}  placeholder="Repeat password" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</Button>
      </div>
    </Modal>
  );
}

// ─── Link Parent Modal ────────────────────────────────────────

function LinkParentModal({ open, slot, onClose, student, onSuccess }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [mode,    setMode]    = useState(null); // 'existing'|'new'
  const [selected,setSelected]= useState(null); // existing user
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const debounce  = useRef(null);

  useEffect(() => {
    if (open) { setQuery(''); setResults([]); setMode(null); setSelected(null); setNewForm({ name: '', email: '', phone: '', password: '' }); setError(''); }
  }, [open]);

  const search = (q) => {
    setQuery(q);
    clearTimeout(debounce.current);
    if (q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      try {
        const res = await api.get(`${API.STUDENTS.BASE}/search-parents?q=${encodeURIComponent(q)}`);
        setResults(res.data || []);
      } catch {}
    }, 300);
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const payload = { slot };
      if (mode === 'existing') {
        payload.existingUserId = selected._id;
      } else {
        payload.name     = newForm.name;
        payload.email    = newForm.email;
        payload.phone    = newForm.phone;
        payload.password = newForm.password;
      }
      await api.patch(API.STUDENTS.LINK_PARENT(student._id), payload);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const slotLabel = slot === 'father' ? 'Father' : 'Mother';

  return (
    <Modal open={open} onClose={onClose} title={`Link ${slotLabel} Account`} width="max-w-lg">
      {error && <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {mode === null && (
        <>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search existing parent by name or email..."
              value={query}
              onChange={(e) => search(e.target.value)}
            />
          </div>
          {results.map((u) => (
            <button key={u._id} onClick={() => { setSelected(u); setMode('existing'); }}
              className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-800 text-left transition-colors rounded-lg mb-1">
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{u.name}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
            </button>
          ))}
          <button onClick={() => setMode('new')}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 mt-3 transition-colors">
            <UserPlus className="w-4 h-4" /> Create new parent account
          </button>
        </>
      )}

      {mode === 'existing' && selected && (
        <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/5 mb-4">
          <p className="text-sm font-medium text-white">{selected.name}</p>
          <p className="text-xs text-slate-400">{selected.email}</p>
          <button onClick={() => { setMode(null); setSelected(null); }} className="text-xs text-slate-500 hover:text-slate-300 mt-2">Change</button>
        </div>
      )}

      {mode === 'new' && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Input label="Full Name *" value={newForm.name}     onChange={(e) => setNewForm(f => ({ ...f, name:     e.target.value }))} className="col-span-2" />
          <Input label="Email"       value={newForm.email}    onChange={(e) => setNewForm(f => ({ ...f, email:    e.target.value }))} type="email" />
          <Input label="Phone"       value={newForm.phone}    onChange={(e) => setNewForm(f => ({ ...f, phone:    e.target.value }))} />
          <Input label="Password"    value={newForm.password} onChange={(e) => setNewForm(f => ({ ...f, password: e.target.value }))} type="password" className="col-span-2" placeholder="Default: phone number" />
          <button onClick={() => setMode(null)} className="col-span-2 text-xs text-slate-500 hover:text-slate-300 text-left">← Back to search</button>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {mode && <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Linking…' : `Link ${slotLabel}`}</Button>}
      </div>
    </Modal>
  );
}
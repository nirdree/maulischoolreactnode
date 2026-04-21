// pages/admin/Students.jsx
/**
 * STUDENTS PAGE — Full admission + lifecycle management
 *
 * APIs:
 *   GET    /api/students/search-parents?q=      — search existing parent accounts
 *   GET    /api/students                         — list
 *   GET    /api/students/:id                     — detail
 *   POST   /api/students                         — create admission
 *   PUT    /api/students/:id                     — edit profile
 *   PATCH  /api/students/:id/status              — change status (syncs parent)
 *   PATCH  /api/students/:id/link-parent         — change linked parent account
 *   PATCH  /api/students/:id/block-parent        — block/unblock parent login
 *   PATCH  /api/students/:id/parent-password     — reset parent password
 *   DELETE /api/students/:id                     — delete (cascade)
 *   GET    /api/classrooms
 *   GET    /api/academic-years/current
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Plus, Search, RefreshCw, Edit2, Trash2,
  KeyRound, ShieldOff, ShieldCheck, CheckCircle2,
  UserPlus, LogOut, UserX, UserCheck, ChevronRight, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal,
} from '../../components/ui.jsx';

// ─── Constants ───────────────────────────────────────────────

const STATUS_COLOR = {
  Approved: 'green', UnderReview: 'yellow', Rejected: 'red',
  OnHold: 'orange', Left: 'gray', Alumni: 'indigo',
};

const STATUS_OPTIONS = [
  { value: '',            label: 'All Status'   },
  { value: 'Approved',    label: 'Approved'     },
  { value: 'UnderReview', label: 'Under Review' },
  { value: 'Rejected',    label: 'Rejected'     },
  { value: 'OnHold',      label: 'On Hold'      },
  { value: 'Left',        label: 'Left'         },
  { value: 'Alumni',      label: 'Alumni'       },
];

const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

// ─── Page ─────────────────────────────────────────────────────

export default function StudentsPage() {
   const navigate = useNavigate();
  const [students,     setStudents]     = useState([]);
  const [classrooms,   setClassrooms]   = useState([]);
  const [ayId,         setAyId]         = useState('');
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter,  setClassFilter]  = useState('');
  const [page,         setPage]         = useState(1);
  const [total,        setTotal]        = useState(0);

  const [addOpen,       setAddOpen]       = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [pwTarget,      setPwTarget]      = useState(null);
  const [statusTarget,  setStatusTarget]  = useState(null);  // { student, desiredStatus }
  const [leaveTarget,   setLeaveTarget]   = useState(null);  // student obj for leave modal

  useEffect(() => {
    (async () => {
      try {
        const ay  = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const id  = ay.data?._id || '';
        setAyId(id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${id}`);
        setClassrooms(cls.data || []);
      } catch {}
    })();
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (search)       params.set('search',       search);
      if (statusFilter) params.set('status',       statusFilter);
      if (classFilter)  params.set('classId',      classFilter);
      if (ayId)         params.set('academicYear', ayId);
      const res = await api.get(`${API.STUDENTS.BASE}?${params}`);
      setStudents(res.data  || []);
      setTotal(res.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, statusFilter, classFilter, ayId, search]);

  useEffect(() => { if (ayId) fetchStudents(); }, [page, statusFilter, classFilter, ayId]);

  const handleBlockParent = async (id, blocked) => {
    if (!confirm(`${blocked ? 'Block' : 'Unblock'} parent login for this student?`)) return;
    try {
      await api.patch(API.STUDENTS.BLOCK_PARENT(id), { target: 'both', blocked });
      fetchStudents();
    } catch (err) { alert(err?.response?.data?.message || err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student? Orphaned parent accounts will also be removed.')) return;
    try {
      await api.delete(API.STUDENTS.BY_ID(id));
      fetchStudents();
    } catch (err) { alert(err?.response?.data?.message || err.message); }
  };

  const handleQuickStatus = async (id, status) => {
    try {
      await api.patch(API.STUDENTS.STATUS(id), { status });
      fetchStudents();
    } catch (err) { alert(err?.response?.data?.message || err.message); }
  };

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map((c) => ({ value: c._id, label: c.displayName })),
  ];
  const pages = Math.ceil(total / 20);

  const columns = [
    { key: 'admissionNo', label: 'Adm No' },
    {
      key: 'name', label: 'Student',
      render: (s) => (
        <div>
          <button onClick={() => navigate(`/admin/students/${s._id}`)} className="font-medium text-indigo-400 hover:text-indigo-300">
            {s.firstName} {s.middleName} {s.lastName}
          </button>
          <p className="text-xs text-slate-500">{s.gender} · {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-IN') : '—'}</p>
        </div>
      ),
    },
    { key: 'classroom', label: 'Class', render: (s) => s.classroom?.displayName || '—' },
    {
      key: 'parents', label: 'Parents',
      render: (s) => (
        <div className="space-y-0.5 min-w-[140px]">
          {s.fatherName && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{s.fatherName}</span>
              {s.fatherUser && (
                <span className={`text-xs px-1 rounded ${s.fatherUser.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.fatherUser.status === 'active' ? '●' : '○'}
                </span>
              )}
            </div>
          )}
          {s.motherName && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500">{s.motherName}</span>
              {s.motherUser && (
                <span className={`text-xs ${s.motherUser.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.motherUser.status === 'active' ? '●' : '○'}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status', label: 'Status',
      render: (s) => <Badge label={s.status} color={STATUS_COLOR[s.status] || 'gray'} />,
    },
    {
      key: 'actions', label: '',
      render: (s) => {
        const parentBlocked = s.fatherUser?.status === 'inactive' || s.motherUser?.status === 'inactive';
        const hasParent     = !!(s.fatherUser || s.motherUser);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {s.status === 'UnderReview' && (
              <>
                <Button size="sm" variant="success" onClick={() => handleQuickStatus(s._id, 'Approved')}>Approve</Button>
                <Button size="sm" variant="danger"  onClick={() => handleQuickStatus(s._id, 'Rejected')}>Reject</Button>
              </>
            )}
            {s.status === 'Approved' && (
              <Button size="sm" variant="secondary" onClick={() => setLeaveTarget(s)}>
                <LogOut className="w-3 h-3 mr-1" /> Mark Left
              </Button>
            )}
            <Button size="sm" variant="ghost" title="Edit" onClick={() => setEditTarget(s)}>
              <Edit2 className="w-3 h-3" />
            </Button>
            {hasParent && (
              <>
                <Button size="sm" variant={parentBlocked ? 'success' : 'secondary'}
                  title={parentBlocked ? 'Unblock parent' : 'Block parent'}
                  onClick={() => handleBlockParent(s._id, !parentBlocked)}>
                  {parentBlocked ? <ShieldCheck className="w-3 h-3" /> : <ShieldOff className="w-3 h-3" />}
                </Button>
                <Button size="sm" variant="ghost" title="Reset parent password" onClick={() => setPwTarget(s)}>
                  <KeyRound className="w-3 h-3" />
                </Button>
              </>
            )}
            <Button size="sm" variant="danger" title="Delete" onClick={() => handleDelete(s._id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Students"
        subtitle={`${total} student${total !== 1 ? 's' : ''}`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Student</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Name, admission no, parent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
          />
        </div>
        <Select options={STATUS_OPTIONS} value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-40" />
        <Select options={classOptions} value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setPage(1); }} className="w-44" />
        <Button variant="ghost" onClick={fetchStudents}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={students} loading={loading} emptyMessage="No students found" />
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">Page {page} of {pages} · {total} total</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page === 1}     onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button size="sm" variant="ghost" disabled={page >= pages}  onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <AdmissionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={fetchStudents}
      />
      <EditStudentModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        student={editTarget}
        classrooms={classrooms}
        onSuccess={() => { fetchStudents(); setEditTarget(null); }}
      />
      <ParentPasswordModal
        open={!!pwTarget}
        onClose={() => setPwTarget(null)}
        student={pwTarget}
        onSuccess={() => setPwTarget(null)}
      />
      <LeaveModal
        open={!!leaveTarget}
        onClose={() => setLeaveTarget(null)}
        student={leaveTarget}
        onSuccess={() => { fetchStudents(); setLeaveTarget(null); }}
      />
    </PageContent>
  );
}

// ─── Parent Search Widget ─────────────────────────────────────
// Reusable typeahead to pick an existing parent or enter new details

function ParentSearchWidget({ label, value, onChange }) {
  // value = { mode: 'existing'|'new'|null, user?, name, phone, email, occupation, password }
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const debounce   = useRef(null);
  const wrapRef    = useRef(null);

  const mode = value?.mode || null;

  const search = (q) => {
    clearTimeout(debounce.current);
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`${API.STUDENTS.BASE}/search-parents?q=${encodeURIComponent(q)}`);
        setResults(res.data || []);
        setOpen(true);
      } catch {} finally { setLoading(false); }
    }, 300);
  };

  const selectExisting = (user) => {
    onChange({ mode: 'existing', existingUserId: user._id, name: user.name, email: user.email });
    setQuery(user.name);
    setOpen(false);
    setResults([]);
  };

  const switchToNew = () => {
    onChange({ mode: 'new', name: query, email: '', phone: '', occupation: '', password: '' });
    setOpen(false);
  };

  const clearSelection = () => {
    onChange(null);
    setQuery('');
    setResults([]);
  };

  const set = (k, v) => onChange({ ...value, [k]: v });

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="col-span-2 space-y-3">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>

      {/* Selected existing parent chip */}
      {mode === 'existing' && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
          <div>
            <p className="text-sm text-white font-medium">{value.name}</p>
            <p className="text-xs text-slate-400">{value.email} · Existing account</p>
          </div>
          <button onClick={clearSelection} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search box — shown when no selection yet */}
      {mode !== 'existing' && (
        <div ref={wrapRef} className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search existing parent by name / email, or type to create new..."
              value={query}
              onChange={(e) => search(e.target.value)}
              onFocus={() => results.length && setOpen(true)}
            />
          </div>

          {/* Dropdown results */}
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-xl bg-slate-800 border border-slate-700 shadow-xl overflow-hidden">
              {loading && <p className="px-4 py-3 text-xs text-slate-400">Searching…</p>}
              {!loading && results.map((u) => (
                <button
                  key={u._id}
                  onClick={() => selectExisting(u)}
                  className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-700 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium">{u.name}</p>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    {u.studentIds?.length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {u.studentIds.length} child{u.studentIds.length > 1 ? 'ren' : ''}:{' '}
                        {u.studentIds.map((s) => `${s.firstName} ${s.lastName}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                </button>
              ))}
              {!loading && query.length >= 2 && (
                <button
                  onClick={switchToNew}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-slate-700 text-left transition-colors border-t border-slate-700"
                >
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm text-indigo-400">Create new parent account for "{query}"</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* New parent fields */}
      {mode === 'new' && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="col-span-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">New account details</p>
            <button onClick={clearSelection} className="text-xs text-slate-500 hover:text-slate-300">Clear</button>
          </div>
          <Input label="Full Name *" value={value.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Parent name" />
          <Input label="Phone"       value={value.phone || ''} onChange={(e) => set('phone', e.target.value)} placeholder="9999999999" />
          <Input label="Email"       type="email" value={value.email || ''} onChange={(e) => set('email', e.target.value)} placeholder="parent@example.com" />
          <Input label="Occupation"  value={value.occupation || ''} onChange={(e) => set('occupation', e.target.value)} placeholder="Engineer" />
          <Input label="Login Password" type="password" value={value.password || ''} onChange={(e) => set('password', e.target.value)} placeholder="Default: phone number" className="col-span-2" />
          <p className="col-span-2 text-xs text-slate-500">
            A parent login account will be created. Password defaults to phone number if left blank.
          </p>
        </div>
      )}

      {/* If no selection at all and query is short */}
      {!mode && !query && (
        <button
          onClick={() => onChange({ mode: 'new', name: '', email: '', phone: '', occupation: '', password: '' })}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-400 transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" /> Add new parent directly
        </button>
      )}
    </div>
  );
}

// ─── Success Screen ───────────────────────────────────────────

function SuccessScreen({ student, onClose }) {
  return (
    <div className="flex flex-col items-center text-center py-6 px-4">
      <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">Admission Created!</h3>
      <p className="text-slate-400 text-sm mb-5">{student.firstName} {student.lastName} admitted successfully.</p>

      <div className="w-full rounded-xl border border-slate-700 divide-y divide-slate-700 text-left mb-6">
        <InfoRow label="Admission No" value={student.admissionNo} />
        <InfoRow label="Class"        value={student.classroom?.displayName || '—'} />
        <InfoRow label="Status"       value={student.status} />
        {student.fatherUser && (
          <InfoRow label="Father Login" value={student.fatherUser.email || '—'} sub="Account linked" />
        )}
        {student.motherUser && String(student.motherUser._id || student.motherUser) !== String(student.fatherUser?._id || student.fatherUser) && (
          <InfoRow label="Mother Login" value={student.motherUser.email || '—'} sub="Account linked" />
        )}
        {!student.fatherUser && !student.motherUser && (
          <InfoRow label="Parent Login" value="No account created (no email provided)" />
        )}
      </div>
      <Button onClick={onClose} className="w-full">Done</Button>
    </div>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div className="flex justify-between items-start px-4 py-3">
      <span className="text-xs text-slate-500 pt-0.5">{label}</span>
      <div className="text-right">
        <span className="text-sm text-white">{value}</span>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Admission Modal ──────────────────────────────────────────

const STUDENT_TABS = ['Student Info', 'Father', 'Mother', 'Previous School'];

const EMPTY_STUDENT = {
  firstName: '', middleName: '', lastName: '', gender: 'Male',
  dateOfBirth: '', classroom: '', bloodGroup: '', religion: '',
  caste: '', motherTongue: '', placeOfBirth: '', penNumber: '',
  previousSchoolName: '', previousClass: '',
};

function AdmissionModal({ open, onClose, classrooms, ayId, onSuccess }) {
  const [tab,     setTab]     = useState(0);
  const [form,    setForm]    = useState(EMPTY_STUDENT);
  const [father,  setFather]  = useState(null);
  const [mother,  setMother]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [created, setCreated] = useState(null);

  useEffect(() => {
    if (open) {
      setTab(0); setForm(EMPTY_STUDENT); setFather(null); setMother(null);
      setError(''); setCreated(null);
    }
  }, [open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const buildPayload = () => {
    const payload = { ...form, academicYear: ayId };

    // Father
    if (father?.mode === 'existing') {
      payload.fatherExistingUserId = father.existingUserId;
      payload.fatherName  = father.name;
      payload.fatherEmail = father.email;
    } else if (father?.mode === 'new') {
      payload.fatherName        = father.name;
      payload.fatherPhone       = father.phone;
      payload.fatherEmail       = father.email;
      payload.fatherOccupation  = father.occupation;
      payload.fatherPassword    = father.password;
    }

    // Mother
    if (mother?.mode === 'existing') {
      payload.motherExistingUserId = mother.existingUserId;
      payload.motherName  = mother.name;
      payload.motherEmail = mother.email;
    } else if (mother?.mode === 'new') {
      payload.motherName        = mother.name;
      payload.motherPhone       = mother.phone;
      payload.motherEmail       = mother.email;
      payload.motherOccupation  = mother.occupation;
      payload.motherPassword    = mother.password;
    }

    return payload;
  };

  const handleSubmit = async () => {
    setError('');
    if (!form.firstName || !form.lastName) { setError('First and last name are required.'); return; }
    if (!form.dateOfBirth)                 { setError('Date of birth is required.');        return; }
    if (!form.classroom)                   { setError('Please select a classroom.');        return; }
    if (!form.gender)                      { setError('Gender is required.');               return; }

    setSaving(true);
    try {
      const res = await api.post(API.STUDENTS.BASE, buildPayload());
      setCreated(res.data);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const classOptions = [
    { value: '', label: 'Select classroom' },
    ...classrooms.map((c) => ({ value: c._id, label: c.displayName })),
  ];

  if (created) {
    return (
      <Modal open={open} onClose={onClose} title="Admission Successful" width="max-w-lg">
        <SuccessScreen student={created} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="New Student Admission" width="max-w-2xl">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1">
        {STUDENT_TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors ${tab === i ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {tab === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *"   value={form.firstName}   onChange={(e) => set('firstName',   e.target.value)} placeholder="Arjun" />
          <Input label="Last Name *"    value={form.lastName}    onChange={(e) => set('lastName',    e.target.value)} placeholder="Sharma" />
          <Input label="Middle Name"    value={form.middleName}  onChange={(e) => set('middleName',  e.target.value)} placeholder="Kumar" />
          <Select label="Gender *" value={form.gender} onChange={(e) => set('gender', e.target.value)} options={GENDER_OPTIONS} />
          <Input label="Date of Birth *" type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
          <Select label="Classroom *" value={form.classroom} onChange={(e) => set('classroom', e.target.value)} options={classOptions} />
          <Input label="Blood Group"    value={form.bloodGroup}   onChange={(e) => set('bloodGroup',   e.target.value)} placeholder="B+" />
          <Input label="Religion"       value={form.religion}     onChange={(e) => set('religion',     e.target.value)} placeholder="Hindu" />
          <Input label="Caste"          value={form.caste}        onChange={(e) => set('caste',        e.target.value)} placeholder="General" />
          <Input label="Mother Tongue"  value={form.motherTongue} onChange={(e) => set('motherTongue', e.target.value)} placeholder="Marathi" />
          <Input label="Place of Birth" value={form.placeOfBirth} onChange={(e) => set('placeOfBirth', e.target.value)} placeholder="Pune" />
          <Input label="PEN Number"     value={form.penNumber}    onChange={(e) => set('penNumber',    e.target.value)} placeholder="Optional" />
        </div>
      )}

      {tab === 1 && (
        <div className="grid grid-cols-2 gap-4">
          <ParentSearchWidget label="Father" value={father} onChange={setFather} />
        </div>
      )}

      {tab === 2 && (
        <div className="grid grid-cols-2 gap-4">
          <ParentSearchWidget label="Mother" value={mother} onChange={setMother} />
        </div>
      )}

      {tab === 3 && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Previous School" value={form.previousSchoolName} onChange={(e) => set('previousSchoolName', e.target.value)} placeholder="ABC Primary School" className="col-span-2" />
          <Input label="Previous Class"  value={form.previousClass}      onChange={(e) => set('previousClass',      e.target.value)} placeholder="Class 4" />
        </div>
      )}

      <div className="flex justify-between gap-3 mt-6">
        <div>{tab > 0 && <Button variant="ghost" onClick={() => setTab((t) => t - 1)}>← Back</Button>}</div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {tab < STUDENT_TABS.length - 1
            ? <Button onClick={() => setTab((t) => t + 1)}>Next →</Button>
            : <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creating…' : 'Create Admission'}</Button>
          }
        </div>
      </div>
    </Modal>
  );
}

// ─── Edit Student Modal ───────────────────────────────────────

const EDIT_TABS = ['Student Info', 'Father', 'Mother', 'Previous School', 'Status'];

function EditStudentModal({ open, onClose, student, classrooms, onSuccess }) {
  const [tab,    setTab]    = useState(0);
  const [form,   setForm]   = useState({});
  const [father, setFather] = useState(null);
  const [mother, setMother] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (!student) return;
    setTab(0); setError('');
    setForm({
      firstName: student.firstName || '', middleName: student.middleName || '',
      lastName:  student.lastName  || '', gender: student.gender || 'Male',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      classroom: student.classroom?._id || student.classroom || '',
      bloodGroup: student.bloodGroup || '', religion: student.religion || '',
      caste: student.caste || '', motherTongue: student.motherTongue || '',
      placeOfBirth: student.placeOfBirth || '', penNumber: student.penNumber || '',
      previousSchoolName: student.previousSchoolName || '', previousClass: student.previousClass || '',
      status: student.status || 'UnderReview',
      rejectionRemark: student.rejectionRemark || '', holdRemark: student.holdRemark || '',
      leavingReason: student.leavingReason || '',
      leavingDate: student.leavingDate ? student.leavingDate.split('T')[0] : '',
    });
    // Pre-fill parent widgets from populated data
    setFather(student.fatherUser
      ? { mode: 'existing', existingUserId: student.fatherUser._id || student.fatherUser, name: student.fatherUser.name, email: student.fatherUser.email }
      : null);
    setMother(student.motherUser
      ? { mode: 'existing', existingUserId: student.motherUser._id || student.motherUser, name: student.motherUser.name, email: student.motherUser.email }
      : null);
  }, [student]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const { status, rejectionRemark, holdRemark, leavingReason, leavingDate, ...profileData } = form;

      // Profile update
      await api.put(API.STUDENTS.BY_ID(student._id), profileData);

      // Status update (only if changed)
      if (status !== student.status) {
        await api.patch(API.STUDENTS.STATUS(student._id), {
          status, rejectionRemark, holdRemark, leavingReason, leavingDate,
        });
      }

      // Re-link father if changed
      const origFatherId = String(student.fatherUser?._id || student.fatherUser || '');
      const newFatherId  = String(father?.existingUserId || '');
      if (father?.mode === 'new' || (father?.mode === 'existing' && newFatherId !== origFatherId) || (!father && origFatherId)) {
        await api.patch(API.STUDENTS.LINK_PARENT(student._id), {
          slot: 'father',
          existingUserId: father?.existingUserId,
          email: father?.email, name: father?.name,
          phone: father?.phone, password: father?.password,
        });
      }

      // Re-link mother if changed
      const origMotherId = String(student.motherUser?._id || student.motherUser || '');
      const newMotherId  = String(mother?.existingUserId || '');
      if (mother?.mode === 'new' || (mother?.mode === 'existing' && newMotherId !== origMotherId) || (!mother && origMotherId)) {
        await api.patch(API.STUDENTS.LINK_PARENT(student._id), {
          slot: 'mother',
          existingUserId: mother?.existingUserId,
          email: mother?.email, name: mother?.name,
          phone: mother?.phone, password: mother?.password,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally { setSaving(false); }
  };

  const classOptions = [
    { value: '', label: 'Select classroom' },
    ...classrooms.map((c) => ({ value: c._id, label: c.displayName })),
  ];
  const statusOptions = [
    { value: 'UnderReview', label: 'Under Review' },
    { value: 'Approved',    label: 'Approved'     },
    { value: 'Rejected',    label: 'Rejected'     },
    { value: 'OnHold',      label: 'On Hold'      },
    { value: 'Left',        label: 'Left'         },
    { value: 'Alumni',      label: 'Alumni'       },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Edit Student" width="max-w-2xl">
      <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1 flex-wrap">
        {EDIT_TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors min-w-[60px] ${tab === i ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {tab === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *"   value={form.firstName || ''}   onChange={(e) => set('firstName',   e.target.value)} />
          <Input label="Last Name *"    value={form.lastName || ''}    onChange={(e) => set('lastName',    e.target.value)} />
          <Input label="Middle Name"    value={form.middleName || ''}  onChange={(e) => set('middleName',  e.target.value)} />
          <Select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} options={GENDER_OPTIONS} />
          <Input label="Date of Birth" type="date" value={form.dateOfBirth || ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
          <Select label="Classroom" value={form.classroom || ''} onChange={(e) => set('classroom', e.target.value)} options={classOptions} />
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
          <ParentSearchWidget label="Father" value={father} onChange={setFather} />
        </div>
      )}

      {tab === 2 && (
        <div className="grid grid-cols-2 gap-4">
          <ParentSearchWidget label="Mother" value={mother} onChange={setMother} />
        </div>
      )}

      {tab === 3 && (
        <div className="grid grid-cols-2 gap-4">
          <Input label="Previous School" value={form.previousSchoolName || ''} onChange={(e) => set('previousSchoolName', e.target.value)} className="col-span-2" />
          <Input label="Previous Class"  value={form.previousClass || ''}      onChange={(e) => set('previousClass',      e.target.value)} />
        </div>
      )}

      {tab === 4 && (
        <div className="grid grid-cols-2 gap-4">
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)} options={statusOptions} className="col-span-2" />
          {form.status === 'Rejected' && (
            <Input label="Rejection Remark" value={form.rejectionRemark || ''} onChange={(e) => set('rejectionRemark', e.target.value)} className="col-span-2" />
          )}
          {form.status === 'OnHold' && (
            <Input label="Hold Remark" value={form.holdRemark || ''} onChange={(e) => set('holdRemark', e.target.value)} className="col-span-2" />
          )}
          {form.status === 'Left' && (
            <>
              <Input label="Leaving Date"   type="date" value={form.leavingDate   || ''} onChange={(e) => set('leavingDate',   e.target.value)} />
              <Input label="Leaving Reason" value={form.leavingReason || ''}             onChange={(e) => set('leavingReason', e.target.value)} />
            </>
          )}
          <div className="col-span-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            Changing status to Left or Rejected will automatically deactivate parent login
            if they have no other active children.
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
      await api.patch(API.STUDENTS.STATUS(student._id), {
        status: 'Left', ...form,
      });
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
        This will mark the student as Left and deactivate parent login accounts if they
        have no other active children.
      </div>
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input label="Leaving Date *" type="date" value={form.leavingDate}   onChange={(e) => setForm((f) => ({ ...f, leavingDate:   e.target.value }))} className="col-span-2" />
        <Input label="Reason"         value={form.leavingReason} onChange={(e) => setForm((f) => ({ ...f, leavingReason: e.target.value }))} placeholder="Transfer, family relocation…" className="col-span-2" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Mark as Left'}
        </Button>
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

  const hasFather    = !!student?.fatherUser;
  const hasMother    = !!student?.motherUser;
  const sameAccount  = hasFather && hasMother &&
    String(student.fatherUser._id || student.fatherUser) ===
    String(student.motherUser._id || student.motherUser);

  const handleSubmit = async () => {
    setError('');
    if (!password)           { setError('Enter a new password.');    return; }
    if (password.length < 6) { setError('Minimum 6 characters.');    return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
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
      {student && (
        <p className="mb-4 text-sm text-slate-400">
          Student: <span className="text-white font-medium">{student.firstName} {student.lastName}</span>
        </p>
      )}
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}
      {!sameAccount && (hasFather || hasMother) && (
        <div className="flex gap-2 mb-4">
          {hasFather && (
            <button onClick={() => setTarget('father')}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${target === 'father' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              Father<br/><span className="text-xs opacity-70">{student.fatherUser?.email}</span>
            </button>
          )}
          {hasMother && (
            <button onClick={() => setTarget('mother')}
              className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${target === 'mother' ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
              Mother<br/><span className="text-xs opacity-70">{student.motherUser?.email}</span>
            </button>
          )}
        </div>
      )}
      {sameAccount && (
        <p className="mb-4 text-xs text-slate-500">Both parents share the same account ({student.fatherUser?.email}).</p>
      )}
      <div className="flex flex-col gap-4">
        <Input label="New Password *" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
        <Input label="Confirm Password *" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</Button>
      </div>
    </Modal>
  );
}
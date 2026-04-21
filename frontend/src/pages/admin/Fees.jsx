// pages/admin/Fees.jsx
/**
 * FEES PAGE (Admin) — Full Featured
 * APIs Used:
 *   GET    /api/fees                     — list fees
 *   POST   /api/fees                     — generate fee record
 *   PUT    /api/fees/:id                 — edit fee record
 *   DELETE /api/fees/:id                 — delete fee record
 *   POST   /api/fees/:id/pay             — collect payment (single)
 *   POST   /api/fees/pay-multiple        — pay multiple months at once
 *   GET    /api/fees/:id/payments        — payment history
 *   GET    /api/fees/receipts/all        — all receipts
 *   POST   /api/fees/generate-auto       — auto-generate for all students
 *   GET    /api/classrooms               — dropdown
 *   GET    /api/students                 — dropdown / search
 *   GET    /api/academic-years/current   — current AY
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, DollarSign, RefreshCw, Eye, Trash2, Edit2,
  Zap, CreditCard, Search, X, ChevronDown, CheckSquare,
  Square, Calendar, FileText, AlertCircle,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input,
  Select, feeStatusBadge, Modal,
} from '../../components/ui.jsx';

// ─── helpers ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const monthName  = (m) => SHORT_MONTHS[(m ?? 1) - 1] ?? m;
const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1; // 1-based

/** Build month options starting from AY start month */
function buildMonthOptions(ayStartDate, includeAll = true) {
  const start = ayStartDate ? new Date(ayStartDate).getMonth() + 1 : 4; // default April
  const ordered = [];
  for (let i = 0; i < 12; i++) {
    const m = ((start - 1 + i) % 12) + 1;
    ordered.push({ value: m, label: MONTH_NAMES[m - 1] });
  }
  return includeAll ? [{ value: '', label: 'All Months' }, ...ordered] : ordered;
}

// ─── main component ─────────────────────────────────────────────────────────

export default function FeesPage() {
  const [fees, setFees]           = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [ayId, setAyId]           = useState('');
  const [ayStartDate, setAyStartDate] = useState(null);
  const [loading, setLoading]     = useState(true);

  // filters
  const [classFilter, setClassFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter]   = useState('');
  const [yearFilter, setYearFilter]     = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const searchRef = useRef('');

  // modal state
  const [addOpen, setAddOpen]           = useState(false);
  const [editFee, setEditFee]           = useState(null);
  const [payFee, setPayFee]             = useState(null);
  const [multiPayStudent, setMultiPayStudent] = useState(null);
  const [viewPayments, setViewPayments] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [autoGenOpen, setAutoGenOpen]   = useState(false);
  const [receiptsOpen, setReceiptsOpen] = useState(false);

  // selection for bulk actions
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const ay  = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        setAyStartDate(ay.data?.startDate);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch {}
    })();
  }, []);

  const fetchFees = useCallback(async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (classFilter)   params.set('classId', classFilter);
      if (statusFilter)  params.set('status', statusFilter);
      if (monthFilter)   params.set('month', monthFilter);
      if (yearFilter)    params.set('year', yearFilter);
      if (searchRef.current) params.set('search', searchRef.current);
      const res = await api.get(`${API.FEES.BASE}?${params}`);
      setFees(res.data || []);
      setSelected([]);
    } catch {} finally { setLoading(false); }
  }, [ayId, classFilter, statusFilter, monthFilter, yearFilter]);

  useEffect(() => { if (ayId) fetchFees(); }, [fetchFees]);

  // debounced student search
  const searchTimer = useRef(null);
  const handleSearchChange = (val) => {
    setStudentSearch(val);
    searchRef.current = val;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchFees(), 400);
  };

  const monthOptions = buildMonthOptions(ayStartDate, true);

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Pending',       label: 'Pending' },
    { value: 'Paid',          label: 'Paid' },
    { value: 'Overdue',       label: 'Overdue' },
    { value: 'PartiallyPaid', label: 'Partially Paid' },
    { value: 'Waived',        label: 'Waived' },
  ];
  const yearOptions = [
    { value: '', label: 'All Years' },
    { value: currentYear - 1, label: String(currentYear - 1) },
    { value: currentYear,     label: String(currentYear) },
    { value: currentYear + 1, label: String(currentYear + 1) },
  ];

  // bulk select helpers
  const toggleSelect = (id) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  const toggleAll = () =>
    setSelected(s => s.length === fees.length ? [] : fees.map(f => f._id));

  const handleDelete = async (fee) => {
    try {
      await api.delete(`${API.FEES.BASE}/${fee._id}`);
      fetchFees();
      setDeleteConfirm(null);
    } catch (err) { alert(err.message); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} fee records?`)) return;
    try {
      await Promise.all(selected.map(id => api.delete(`${API.FEES.BASE}/${id}`)));
      fetchFees();
    } catch (err) { alert(err.message); }
  };

  const columns = [
    {
      key: 'select', label: (
        <button onClick={toggleAll} className="text-slate-400 hover:text-white">
          {selected.length === fees.length && fees.length > 0
            ? <CheckSquare className="w-4 h-4 text-amber-400" />
            : <Square className="w-4 h-4" />}
        </button>
      ),
      render: (f) => (
        <button onClick={() => toggleSelect(f._id)} className="text-slate-400 hover:text-white">
          {selected.includes(f._id)
            ? <CheckSquare className="w-4 h-4 text-amber-400" />
            : <Square className="w-4 h-4" />}
        </button>
      ),
    },
    {
      key: 'student', label: 'Student',
      render: (f) => (
        <div>
          <p className="font-medium text-white">{f.student?.firstName} {f.student?.lastName}</p>
          <p className="text-xs text-slate-500">{f.student?.admissionNo}</p>
        </div>
      ),
    },
    { key: 'classroom', label: 'Class', render: (f) => f.classroom?.displayName || '—' },
    { key: 'period',    label: 'Period', render: (f) => `${monthName(f.month)} ${f.year}` },
    {
      key: 'amount', label: 'Amount',
      render: (f) => (
        <div>
          <span className="text-amber-400 font-semibold">₹{f.finalAmount?.toLocaleString()}</span>
          {f.discount > 0 && <span className="ml-1 text-xs text-emerald-400">(-₹{f.discount})</span>}
        </div>
      ),
    },
    { key: 'status',  label: 'Status',   render: (f) => feeStatusBadge(f.status) },
    { key: 'dueDate', label: 'Due Date', render: (f) => new Date(f.dueDate).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (f) => (
        <div className="flex gap-1 flex-wrap">
          {f.status !== 'Paid' && (
            <Button size="sm" variant="success" onClick={() => setPayFee(f)} title="Collect Payment">
              <DollarSign className="w-3 h-3" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setMultiPayStudent(f.student)} title="Pay Multiple Months">
            <CreditCard className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setViewPayments(f)} title="Payment History">
            <Eye className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditFee(f)} title="Edit">
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(f)} title="Delete">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  const pendingCount  = fees.filter(f => f.status === 'Pending').length;
  const overdueCount  = fees.filter(f => f.status === 'Overdue').length;
  const totalPending  = fees.filter(f => f.status !== 'Paid').reduce((s, f) => s + (f.finalAmount || 0), 0);

  return (
    <PageContent>
      <PageHeader
        title="Fees"
        subtitle={`${fees.length} records · ${pendingCount} pending · ${overdueCount} overdue`}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => setReceiptsOpen(true)}>
              <FileText className="w-4 h-4 mr-1" /> Receipts
            </Button>
            <Button variant="warning" onClick={() => setAutoGenOpen(true)}>
              <Zap className="w-4 h-4 mr-1" /> Auto-Generate
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Generate Fee
            </Button>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Total Outstanding</p>
          <p className="text-lg font-bold text-amber-400">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Overdue</p>
          <p className="text-lg font-bold text-red-400">{overdueCount}</p>
        </div>
        <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
          <p className="text-xs text-slate-500 mb-1">Paid This View</p>
          <p className="text-lg font-bold text-emerald-400">{fees.filter(f => f.status === 'Paid').length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Student search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-52"
            placeholder="Search student..."
            value={studentSearch}
            onChange={e => handleSearchChange(e.target.value)}
          />
          {studentSearch && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              onClick={() => handleSearchChange('')}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
        <Select options={classOptions}  value={classFilter}  onChange={e => setClassFilter(e.target.value)}  className="w-44" />
        <Select options={statusOptions} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-40" />
        <Select options={monthOptions}  value={monthFilter}  onChange={e => setMonthFilter(e.target.value)}  className="w-36" />
        <Select options={yearOptions}   value={yearFilter}   onChange={e => setYearFilter(e.target.value)}   className="w-32" />
        <Button variant="ghost" onClick={fetchFees}><RefreshCw className="w-4 h-4" /></Button>
        {selected.length > 0 && (
          <Button variant="danger" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete ({selected.length})
          </Button>
        )}
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={fees} loading={loading} emptyMessage="No fee records found" />
      </Card>

      {/* Modals */}
      {addOpen && (
        <GenerateFeeModal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          classrooms={classrooms}
          ayId={ayId}
          ayStartDate={ayStartDate}
          onSuccess={() => { fetchFees(); setAddOpen(false); }}
        />
      )}

      {editFee && (
        <EditFeeModal
          fee={editFee}
          onClose={() => setEditFee(null)}
          onSuccess={() => { fetchFees(); setEditFee(null); }}
        />
      )}

      {payFee && (
        <CollectPaymentModal
          fee={payFee}
          onClose={() => setPayFee(null)}
          onSuccess={() => { fetchFees(); setPayFee(null); }}
        />
      )}

      {multiPayStudent && (
        <MultiMonthPayModal
          student={multiPayStudent}
          ayId={ayId}
          ayStartDate={ayStartDate}
          onClose={() => setMultiPayStudent(null)}
          onSuccess={() => { fetchFees(); setMultiPayStudent(null); }}
        />
      )}

      {viewPayments && (
        <PaymentHistoryModal
          fee={viewPayments}
          onClose={() => setViewPayments(null)}
        />
      )}

      {deleteConfirm && (
        <Modal open={true} onClose={() => setDeleteConfirm(null)} title="Delete Fee Record">
          <div className="mb-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white">Are you sure you want to delete this fee record?</p>
              <p className="text-slate-400 text-sm mt-1">
                {deleteConfirm.student?.firstName} {deleteConfirm.student?.lastName} —{' '}
                {monthName(deleteConfirm.month)} {deleteConfirm.year}
              </p>
              <p className="text-red-400 text-xs mt-2">This action cannot be undone. The record can be recreated manually.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
          </div>
        </Modal>
      )}

      {autoGenOpen && (
        <AutoGenerateModal
          classrooms={classrooms}
          ayId={ayId}
          ayStartDate={ayStartDate}
          onClose={() => setAutoGenOpen(false)}
          onSuccess={() => { fetchFees(); setAutoGenOpen(false); }}
        />
      )}

      {receiptsOpen && (
        <AllReceiptsModal
          ayId={ayId}
          onClose={() => setReceiptsOpen(false)}
        />
      )}
    </PageContent>
  );
}

// ─── Generate Fee Modal ──────────────────────────────────────────────────────

function GenerateFeeModal({ open, onClose, classrooms, ayId, ayStartDate, onSuccess }) {
  const [form, setForm] = useState({
    student: '', classroom: '', month: '', year: currentYear,
    tuitionFee: '', transportFee: 0, activityFee: 0,
    otherFee: 0, discount: 0, dueDate: '',
  });
  const [students, setStudents]   = useState([]);
  const [saving, setSaving]       = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClassChange = async (classId) => {
    set('classroom', classId);
    set('student', '');
    setStudents([]);
    if (classId) {
      const cls = classrooms.find(c => c._id === classId);
      if (cls) set('tuitionFee', cls.monthlyFees);
      try {
        const res = await api.get(`${API.STUDENTS.BASE}?classId=${classId}&status=Approved&academicYear=${ayId}&limit=200`);
        setStudents(res.data || []);
      } catch {}
    }
  };

  const searchStudents = async (q) => {
    setStudentSearch(q);
    if (!q) { if (form.classroom) handleClassChange(form.classroom); return; }
    try {
      const res = await api.get(`${API.STUDENTS.BASE}?search=${q}&status=Approved&academicYear=${ayId}&limit=50`);
      setStudents(res.data || []);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!form.student || !form.classroom || !form.month || !form.dueDate) {
      return alert('Please fill all required fields');
    }
    setSaving(true);
    try {
      await api.post(API.FEES.BASE, { ...form, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const monthOptions = buildMonthOptions(ayStartDate, false);
  const total = (Number(form.tuitionFee) || 0)
    + (Number(form.transportFee) || 0)
    + (Number(form.activityFee) || 0)
    + (Number(form.otherFee) || 0)
    - (Number(form.discount) || 0);

  return (
    <Modal open={open} onClose={onClose} title="Generate Fee Record">
      <div className="space-y-3">
        <Select label="Class *" value={form.classroom}
          onChange={e => handleClassChange(e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]} />

        {/* Student search within modal */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Student *</label>
          <div className="relative mb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              placeholder="Search student by name..."
              value={studentSearch}
              onChange={e => searchStudents(e.target.value)}
            />
          </div>
          <select
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            value={form.student}
            onChange={e => set('student', e.target.value)}
          >
            <option value="">Select Student</option>
            {students.map(s => (
              <option key={s._id} value={s._id}>{s.firstName} {s.lastName} ({s.admissionNo})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Month *" value={form.month}
            onChange={e => set('month', e.target.value)}
            options={[{ value: '', label: 'Month' }, ...monthOptions]} />
          <Input label="Year *" type="number" value={form.year} onChange={e => set('year', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tuition Fee *"  type="number" value={form.tuitionFee}   onChange={e => set('tuitionFee', e.target.value)} />
          <Input label="Transport Fee"  type="number" value={form.transportFee} onChange={e => set('transportFee', e.target.value)} />
          <Input label="Activity Fee"   type="number" value={form.activityFee}  onChange={e => set('activityFee', e.target.value)} />
          <Input label="Other Fee"      type="number" value={form.otherFee}     onChange={e => set('otherFee', e.target.value)} />
          <Input label="Discount"       type="number" value={form.discount}     onChange={e => set('discount', e.target.value)} />
          <Input label="Due Date *"     type="date"   value={form.dueDate}      onChange={e => set('dueDate', e.target.value)} />
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-sm">
          <span className="text-slate-400">Final Amount: </span>
          <span className="text-amber-400 font-bold text-base">₹{total.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Generate'}</Button>
      </div>
    </Modal>
  );
}

// ─── Edit Fee Modal ──────────────────────────────────────────────────────────

function EditFeeModal({ fee, onClose, onSuccess }) {
  const [form, setForm] = useState({
    tuitionFee:   fee.tuitionFee   ?? 0,
    transportFee: fee.transportFee ?? 0,
    activityFee:  fee.activityFee  ?? 0,
    otherFee:     fee.otherFee     ?? 0,
    lateFine:     fee.lateFine     ?? 0,
    discount:     fee.discount     ?? 0,
    dueDate:      fee.dueDate ? fee.dueDate.split('T')[0] : '',
    status:       fee.status,
    notes:        fee.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const total = (Number(form.tuitionFee) || 0)
    + (Number(form.transportFee) || 0)
    + (Number(form.activityFee) || 0)
    + (Number(form.otherFee) || 0)
    + (Number(form.lateFine) || 0)
    - (Number(form.discount) || 0);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.put(`${API.FEES.BASE}/${fee._id}`, {
        ...form,
        totalAmount: (Number(form.tuitionFee) || 0)
          + (Number(form.transportFee) || 0)
          + (Number(form.activityFee) || 0)
          + (Number(form.otherFee) || 0)
          + (Number(form.lateFine) || 0),
        finalAmount: total,
      });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const statusOptions = ['Pending','Paid','Overdue','PartiallyPaid','Waived']
    .map(s => ({ value: s, label: s }));

  return (
    <Modal open={true} onClose={onClose} title="Edit Fee Record">
      <div className="mb-3 p-3 bg-slate-800 rounded-lg text-sm">
        <p className="text-white font-medium">{fee.student?.firstName} {fee.student?.lastName}</p>
        <p className="text-slate-400">{fee.classroom?.displayName} · {monthName(fee.month)} {fee.year}</p>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tuition Fee"   type="number" value={form.tuitionFee}   onChange={e => set('tuitionFee', e.target.value)} />
          <Input label="Transport Fee" type="number" value={form.transportFee} onChange={e => set('transportFee', e.target.value)} />
          <Input label="Activity Fee"  type="number" value={form.activityFee}  onChange={e => set('activityFee', e.target.value)} />
          <Input label="Other Fee"     type="number" value={form.otherFee}     onChange={e => set('otherFee', e.target.value)} />
          <Input label="Late Fine"     type="number" value={form.lateFine}     onChange={e => set('lateFine', e.target.value)} />
          <Input label="Discount"      type="number" value={form.discount}     onChange={e => set('discount', e.target.value)} />
        </div>
        <Input label="Due Date" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        <Select label="Status" value={form.status} onChange={e => set('status', e.target.value)} options={statusOptions} />
        <Input label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
        <div className="bg-slate-800 rounded-lg p-3 text-sm">
          <span className="text-slate-400">New Final Amount: </span>
          <span className="text-amber-400 font-bold text-base">₹{total.toLocaleString()}</span>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </Modal>
  );
}

// ─── Collect Single Payment Modal ────────────────────────────────────────────

function CollectPaymentModal({ fee, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amountPaid: fee.finalAmount, paymentMode: 'Cash', transactionId: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await api.post(API.FEES.PAY(fee._id), form);
      alert(`Payment recorded! Receipt: ${res.data?.receiptNo}`);
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Collect Payment">
      <div className="mb-4 p-3 bg-slate-800 rounded-lg text-sm">
        <p className="text-white font-medium">{fee.student?.firstName} {fee.student?.lastName}</p>
        <p className="text-slate-400">{monthName(fee.month)} {fee.year} · Due: <span className="text-amber-400">₹{fee.finalAmount?.toLocaleString()}</span></p>
      </div>
      <div className="space-y-3">
        <Input label="Amount *" type="number" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} />
        <Select label="Payment Mode *" value={form.paymentMode} onChange={e => set('paymentMode', e.target.value)}
          options={['Cash','Cheque','Online','UPI','BankTransfer'].map(m => ({ value: m, label: m }))} />
        <Input label="Transaction ID" value={form.transactionId} onChange={e => set('transactionId', e.target.value)} placeholder="Optional" />
        <Input label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Processing...' : 'Collect Payment'}</Button>
      </div>
    </Modal>
  );
}

// ─── Multi-Month Payment Modal ───────────────────────────────────────────────

function MultiMonthPayModal({ student, ayId, ayStartDate, onClose, onSuccess }) {
  const [unpaidFees, setUnpaidFees]   = useState([]);
  const [selectedFees, setSelectedFees] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [form, setForm]               = useState({ paymentMode: 'Cash', transactionId: '', notes: '' });
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`${API.FEES.BASE}?studentId=${student._id}&academicYear=${ayId}`);
        const unpaid = (res.data || []).filter(f => f.status !== 'Paid' && f.status !== 'Waived');
        // Sort by AY month order
        const startMonth = ayStartDate ? new Date(ayStartDate).getMonth() + 1 : 4;
        unpaid.sort((a, b) => {
          const ai = ((a.month - startMonth + 12) % 12) * 100 + (a.year - 2000);
          const bi = ((b.month - startMonth + 12) % 12) * 100 + (b.year - 2000);
          return ai - bi;
        });
        setUnpaidFees(unpaid);
        setSelectedFees(unpaid.map(f => f._id)); // select all by default
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const toggleFee = (id) =>
    setSelectedFees(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const totalAmount = unpaidFees
    .filter(f => selectedFees.includes(f._id))
    .reduce((s, f) => s + (f.finalAmount || 0), 0);

  const handleSubmit = async () => {
    if (selectedFees.length === 0) return alert('Select at least one month');
    setSaving(true);
    try {
      // Pay each selected fee sequentially (or use bulk endpoint if available)
      const results = [];
      for (const feeId of selectedFees) {
        const fee = unpaidFees.find(f => f._id === feeId);
        const res = await api.post(API.FEES.PAY(feeId), {
          amountPaid: fee.finalAmount,
          ...form,
        });
        results.push(res.data?.receiptNo);
      }
      alert(`${results.length} payments recorded!\nReceipts: ${results.filter(Boolean).join(', ')}`);
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title="Pay Multiple Months">
      <div className="mb-3 p-3 bg-slate-800 rounded-lg">
        <p className="text-white font-medium">{student?.firstName} {student?.lastName}</p>
        <p className="text-xs text-slate-400">{student?.admissionNo}</p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm py-4">Loading unpaid fees...</p>
      ) : unpaidFees.length === 0 ? (
        <p className="text-emerald-400 text-sm py-4">No unpaid fees! All months are cleared.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-2">Select months to pay:</p>
          <div className="space-y-2 max-h-56 overflow-y-auto mb-4">
            {unpaidFees.map(f => (
              <div
                key={f._id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedFees.includes(f._id)
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800'
                }`}
                onClick={() => toggleFee(f._id)}
              >
                <div className="flex items-center gap-3">
                  {selectedFees.includes(f._id)
                    ? <CheckSquare className="w-4 h-4 text-amber-400" />
                    : <Square className="w-4 h-4 text-slate-500" />}
                  <div>
                    <p className="text-white text-sm">{monthName(f.month)} {f.year}</p>
                    <p className="text-xs text-slate-500">{feeStatusBadge(f.status)}</p>
                  </div>
                </div>
                <span className="text-amber-400 font-semibold text-sm">₹{f.finalAmount?.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 rounded-lg p-3 mb-4 flex justify-between items-center">
            <span className="text-slate-400 text-sm">{selectedFees.length} months selected</span>
            <span className="text-amber-400 font-bold text-lg">₹{totalAmount.toLocaleString()}</span>
          </div>

          <div className="space-y-3">
            <Select label="Payment Mode *" value={form.paymentMode}
              onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}
              options={['Cash','Cheque','Online','UPI','BankTransfer'].map(m => ({ value: m, label: m }))} />
            <Input label="Transaction ID" value={form.transactionId}
              onChange={e => setForm(f => ({ ...f, transactionId: e.target.value }))} placeholder="Optional" />
            <Input label="Notes" value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        {unpaidFees.length > 0 && (
          <Button onClick={handleSubmit} disabled={saving || selectedFees.length === 0}>
            {saving ? 'Processing...' : `Pay ₹${totalAmount.toLocaleString()}`}
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ─── Auto-Generate Modal ─────────────────────────────────────────────────────

function AutoGenerateModal({ classrooms, ayId, ayStartDate, onClose, onSuccess }) {
  const startMonth = ayStartDate ? new Date(ayStartDate).getMonth() + 1 : 4;
  const [form, setForm] = useState({
    month:      currentMonth,
    year:       currentYear,
    dueDate:    '',
    classId:    '',
    onlyUnpaid: true,
  });
  const [saving, setSaving]   = useState(false);
  const [preview, setPreview] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePreview = async () => {
    try {
      const res = await api.post(`${API.FEES.BASE}/generate-auto`, { ...form, academicYear: ayId, preview: true });
      setPreview(res.data);
    } catch (err) { alert(err.message); }
  };

  const handleGenerate = async () => {
    if (!form.dueDate) return alert('Please set a due date');
    setSaving(true);
    try {
      const res = await api.post(`${API.FEES.BASE}/generate-auto`, { ...form, academicYear: ayId });
      alert(`Auto-generated ${res.data?.created ?? 0} fee records. Skipped ${res.data?.skipped ?? 0} (already exist).`);
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  const monthOptions = buildMonthOptions(ayStartDate, false);

  return (
    <Modal open={true} onClose={onClose} title="Auto-Generate Monthly Fees">
      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 flex gap-2">
        <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>Automatically generate fee records for all active approved students. Existing records are skipped.</span>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Month *" value={form.month}
            onChange={e => set('month', e.target.value)}
            options={monthOptions} />
          <Input label="Year *" type="number" value={form.year} onChange={e => set('year', e.target.value)} />
        </div>
        <Input label="Due Date *" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        <Select label="Class (optional — all if blank)" value={form.classId}
          onChange={e => set('classId', e.target.value)}
          options={[{ value: '', label: 'All Classes' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]} />
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" className="accent-amber-500" checked={form.onlyUnpaid}
            onChange={e => set('onlyUnpaid', e.target.checked)} />
          Skip if already has a fee record for this month
        </label>
      </div>

      {preview && (
        <div className="mt-4 p-3 bg-slate-800 rounded-lg text-sm">
          <p className="text-slate-400 mb-1">Preview:</p>
          <p className="text-white">Will create: <span className="text-emerald-400 font-bold">{preview.toCreate}</span> records</p>
          <p className="text-white">Will skip: <span className="text-slate-400">{preview.toSkip}</span> (already exist)</p>
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="ghost" onClick={handlePreview}>Preview</Button>
        <Button onClick={handleGenerate} disabled={saving}>
          {saving ? 'Generating...' : 'Generate Now'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Payment History Modal ───────────────────────────────────────────────────

function PaymentHistoryModal({ fee, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.get(API.FEES.PAYMENTS(fee._id))
      .then(res => setPayments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  const total = payments.reduce((s, p) => s + (p.amountPaid || 0), 0);

  return (
    <Modal open={true} onClose={onClose} title="Payment History">
      <div className="mb-3 p-3 bg-slate-800 rounded-lg text-sm">
        <p className="text-white">{fee.student?.firstName} {fee.student?.lastName} — {monthName(fee.month)} {fee.year}</p>
        <p className="text-slate-400">Fee Amount: ₹{fee.finalAmount?.toLocaleString()} · Status: {fee.status}</p>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : payments.length === 0 ? (
        <p className="text-slate-500 text-sm">No payments recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {payments.map(p => (
            <div key={p._id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div>
                <p className="text-white text-sm font-medium">{p.receiptNo}</p>
                <p className="text-xs text-slate-500">
                  {p.paymentMode} · {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                  {p.collectedBy?.name ? ` · ${p.collectedBy.name}` : ''}
                </p>
                {p.transactionId && <p className="text-xs text-slate-600">TXN: {p.transactionId}</p>}
                {p.notes && <p className="text-xs text-slate-500 italic">{p.notes}</p>}
              </div>
              <span className="text-emerald-400 font-semibold">₹{p.amountPaid?.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between px-3 pt-2 border-t border-slate-700">
            <span className="text-slate-400 text-sm">Total Paid</span>
            <span className="text-emerald-400 font-bold">₹{total.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ─── All Receipts Modal ──────────────────────────────────────────────────────

function AllReceiptsModal({ ayId, onClose }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [total, setTotal]       = useState(0);
  const LIMIT = 20;

  const fetchReceipts = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`${API.FEES.BASE}/receipts/all?academicYear=${ayId}&page=${p}&limit=${LIMIT}`);
      setReceipts(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchReceipts(page); }, [page]);

  const totalAmount = receipts.reduce((s, r) => s + (r.amountPaid || 0), 0);

  return (
    <Modal open={true} onClose={onClose} title={`All Receipts (${total})`}>
      {loading ? (
        <p className="text-slate-500 text-sm py-4">Loading...</p>
      ) : (
        <>
          <div className="mb-3 text-sm text-slate-400">
            Page total: <span className="text-emerald-400 font-semibold">₹{totalAmount.toLocaleString()}</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {receipts.map(r => (
              <div key={r._id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <p className="text-white text-sm font-medium">{r.receiptNo}</p>
                  <p className="text-xs text-slate-400">
                    {r.student?.firstName} {r.student?.lastName} ({r.student?.admissionNo})
                  </p>
                  <p className="text-xs text-slate-500">
                    {r.paymentMode} · {new Date(r.paymentDate).toLocaleDateString('en-IN')}
                    {r.fee ? ` · ${monthName(r.fee.month)} ${r.fee.year}` : ''}
                  </p>
                </div>
                <span className="text-emerald-400 font-semibold">₹{r.amountPaid?.toLocaleString()}</span>
              </div>
            ))}
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              ← Prev
            </Button>
            <span className="text-slate-500 text-sm">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <Button variant="ghost" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / LIMIT)}>
              Next →
            </Button>
          </div>
        </>
      )}
      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
// pages/admin/Leaves.jsx
/**
 * LEAVES PAGE (Admin) — Full Featured
 * APIs:
 *   GET    /api/leaves              — list (filters: status, employeeId, academicYear, leaveType)
 *   POST   /api/leaves              — apply leave (admin on behalf)
 *   PUT    /api/leaves/:id          — edit pending leave
 *   DELETE /api/leaves/:id          — delete pending leave
 *   PATCH  /api/leaves/:id/action   — approve / reject
 *   GET    /api/leaves/summary      — leave balance
 *   GET    /api/employees           — dropdown
 */

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle, XCircle, RefreshCw, Plus, Edit2,
  Trash2, Eye, BarChart2, AlertCircle, Lock,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button,
  Input, Select, leaveStatusBadge, Badge, Modal,
} from '../../components/ui.jsx';

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'Maternity', 'Unpaid', 'Other'];

export default function LeavesAdminPage() {
  const [leaves, setLeaves]       = useState([]);
  const [employees, setEmployees] = useState([]);
  const [ayId, setAyId]           = useState('');
  const [loading, setLoading]     = useState(true);

  // filters
  const [statusFilter,    setStatusFilter]    = useState('Pending');
  const [employeeFilter,  setEmployeeFilter]  = useState('');
  const [typeFilter,      setTypeFilter]      = useState('');

  // modals
  const [addOpen,       setAddOpen]       = useState(false);
  const [editLeave,     setEditLeave]     = useState(null);
  const [rejectLeave,   setRejectLeave]   = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [summaryOpen,   setSummaryOpen]   = useState(false);
  const [viewLeave,     setViewLeave]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay  = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const emp = await api.get(`${API.EMPLOYEES.BASE}?status=active`);
        setEmployees(emp.data || []);
      } catch {}
    })();
  }, []);

  const fetchLeaves = useCallback(async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (statusFilter)   params.set('status',     statusFilter);
      if (employeeFilter) params.set('employeeId', employeeFilter);
      if (typeFilter)     params.set('leaveType',  typeFilter);
      const res = await api.get(`${API.LEAVES.BASE}?${params}`);
      setLeaves(res.data || []);
    } catch {} finally { setLoading(false); }
  }, [ayId, statusFilter, employeeFilter, typeFilter]);

  useEffect(() => { if (ayId) fetchLeaves(); }, [fetchLeaves]);

  const handleApprove = async (id) => {
    try {
      await api.patch(API.LEAVES.ACTION(id), { status: 'Approved' });
      fetchLeaves();
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleReject = async (id, remark) => {
    try {
      await api.patch(API.LEAVES.ACTION(id), { status: 'Rejected', approvalRemark: remark });
      fetchLeaves();
      setRejectLeave(null);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const handleDelete = async (leave) => {
    try {
      await api.delete(`${API.LEAVES.BASE}/${leave._id}`);
      fetchLeaves();
      setDeleteConfirm(null);
    } catch (err) { alert(err.response?.data?.message || err.message); }
  };

  const statusOptions   = [
    { value: '', label: 'All Status' },
    { value: 'Pending',  label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];
  const typeOptions     = [
    { value: '', label: 'All Types' },
    ...LEAVE_TYPES.map(t => ({ value: t, label: t })),
  ];
  const employeeOptions = [
    { value: '', label: 'All Employees' },
    ...employees.map(e => ({ value: e._id, label: `${e.name} (${e.employeeId})` })),
  ];

  const pendingCount  = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;

  const columns = [
    {
      key: 'employee', label: 'Employee',
      render: (l) => (
        <div>
          <p className="font-medium text-white">{l.employee?.name}</p>
          <p className="text-xs text-slate-500">{l.employee?.employeeId} · {l.employee?.role}</p>
        </div>
      ),
    },
    {
      key: 'leaveType', label: 'Type',
      render: (l) => <Badge label={l.leaveType} color="indigo" />,
    },
    {
      key: 'dates', label: 'Duration',
      render: (l) => (
        <div>
          <p className="text-sm text-white">
            {new Date(l.fromDate).toLocaleDateString('en-IN')} → {new Date(l.toDate).toLocaleDateString('en-IN')}
          </p>
          <p className="text-xs text-slate-500">{l.totalDays} day(s)</p>
        </div>
      ),
    },
    {
      key: 'reason', label: 'Reason',
      render: (l) => (
        <span className="text-slate-300 text-sm line-clamp-2 max-w-xs">{l.reason}</span>
      ),
    },
    { key: 'status', label: 'Status', render: (l) => leaveStatusBadge(l.status) },
    {
      key: 'approvedBy', label: 'Processed By',
      render: (l) => l.approvedBy
        ? <span className="text-xs text-slate-400">{l.approvedBy?.name}</span>
        : <span className="text-xs text-slate-600">—</span>,
    },
    {
      key: 'actions', label: '',
      render: (l) => (
        <div className="flex gap-1 flex-wrap">
          <Button size="sm" variant="ghost" onClick={() => setViewLeave(l)} title="View">
            <Eye className="w-3 h-3" />
          </Button>
          {l.status === 'Pending' && (
            <>
              <Button size="sm" variant="success" onClick={() => handleApprove(l._id)} title="Approve">
                <CheckCircle className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="danger" onClick={() => setRejectLeave(l)} title="Reject">
                <XCircle className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditLeave(l)} title="Edit">
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(l)} title="Delete">
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Leave Management"
        subtitle={`${pendingCount} pending · ${approvedCount} approved`}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSummaryOpen(true)}>
              <BarChart2 className="w-4 h-4 mr-1" /> Summary
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Apply Leave
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select options={statusOptions}   value={statusFilter}   onChange={e => setStatusFilter(e.target.value)}   className="w-36" />
        <Select options={typeOptions}     value={typeFilter}     onChange={e => setTypeFilter(e.target.value)}     className="w-36" />
        <Select options={employeeOptions} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="w-52" />
        <Button variant="ghost" onClick={fetchLeaves}><RefreshCw className="w-4 h-4" /></Button>
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={leaves} loading={loading} emptyMessage="No leave applications found" />
      </Card>

      {/* Modals */}
      {addOpen && (
        <LeaveFormModal
          employees={employees}
          ayId={ayId}
          onClose={() => setAddOpen(false)}
          onSuccess={() => { fetchLeaves(); setAddOpen(false); }}
        />
      )}

      {editLeave && (
        <LeaveFormModal
          leave={editLeave}
          employees={employees}
          ayId={ayId}
          onClose={() => setEditLeave(null)}
          onSuccess={() => { fetchLeaves(); setEditLeave(null); }}
        />
      )}

      {rejectLeave && (
        <RejectModal
          leave={rejectLeave}
          onClose={() => setRejectLeave(null)}
          onAction={handleReject}
        />
      )}

      {deleteConfirm && (
        <Modal open={true} onClose={() => setDeleteConfirm(null)} title="Delete Leave Application">
          <div className="mb-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white">Delete this leave application?</p>
              <p className="text-slate-400 text-sm mt-1">
                {deleteConfirm.employee?.name} · {deleteConfirm.leaveType} ·{' '}
                {new Date(deleteConfirm.fromDate).toLocaleDateString('en-IN')} — {new Date(deleteConfirm.toDate).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
          </div>
        </Modal>
      )}

      {viewLeave && (
        <ViewLeaveModal leave={viewLeave} onClose={() => setViewLeave(null)} />
      )}

      {summaryOpen && (
        <LeaveSummaryModal ayId={ayId} employees={employees} onClose={() => setSummaryOpen(false)} />
      )}
    </PageContent>
  );
}

// ─── Leave Form Modal (create + edit) ───────────────────────────────────────

function LeaveFormModal({ leave, employees, ayId, onClose, onSuccess }) {
  const isEdit = !!leave;
  const [form, setForm] = useState({
    employee:  leave?.employee?._id || leave?.employee || '',
    leaveType: leave?.leaveType  || 'Sick',
    fromDate:  leave?.fromDate   ? leave.fromDate.split('T')[0] : '',
    toDate:    leave?.toDate     ? leave.toDate.split('T')[0]   : '',
    reason:    leave?.reason     || '',
    academicYear: ayId,
  });
  const [saving, setSaving] = useState(false);
  const [lockError, setLockError] = useState('');
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setLockError(''); };

  const totalDays = form.fromDate && form.toDate
    ? Math.max(0, Math.ceil((new Date(form.toDate) - new Date(form.fromDate)) / 86400000) + 1)
    : 0;

  const handleSubmit = async () => {
    if (!form.employee || !form.fromDate || !form.toDate || !form.reason) {
      return alert('Please fill all required fields');
    }
    setSaving(true);
    setLockError('');
    try {
      if (isEdit) {
        await api.put(`${API.LEAVES.BASE}/${leave._id}`, form);
      } else {
        await api.post(API.LEAVES.BASE, form);
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg?.toLowerCase().includes('lock') || msg?.toLowerCase().includes('paid')) {
        setLockError(msg);
      } else {
        alert(msg);
      }
    } finally { setSaving(false); }
  };

  const typeOptions     = LEAVE_TYPES.map(t => ({ value: t, label: t }));
  const employeeOptions = [
    { value: '', label: 'Select Employee' },
    ...employees.map(e => ({ value: e._id, label: `${e.name} (${e.role})` })),
  ];

  return (
    <Modal open={true} onClose={onClose} title={isEdit ? 'Edit Leave Application' : 'Apply Leave'}>
      {lockError && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{lockError}</span>
        </div>
      )}
      <div className="space-y-3">
        <Select label="Employee *" value={form.employee}
          onChange={e => set('employee', e.target.value)} options={employeeOptions}
          disabled={isEdit} />
        <Select label="Leave Type *" value={form.leaveType}
          onChange={e => set('leaveType', e.target.value)} options={typeOptions} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="From Date *" type="date" value={form.fromDate}
            onChange={e => set('fromDate', e.target.value)} />
          <Input label="To Date *" type="date" value={form.toDate}
            onChange={e => set('toDate', e.target.value)} />
        </div>
        {totalDays > 0 && (
          <div className="text-sm text-slate-400">
            Duration: <span className="text-amber-400 font-semibold">{totalDays} day(s)</span>
          </div>
        )}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Reason *</label>
          <textarea
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            placeholder="Reason for leave..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Submit'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Reject Modal ────────────────────────────────────────────────────────────

function RejectModal({ leave, onClose, onAction }) {
  const [remark, setRemark] = useState('');
  return (
    <Modal open={true} onClose={onClose} title="Reject Leave">
      <p className="text-slate-400 text-sm mb-4">
        Rejecting leave for <span className="text-white">{leave.employee?.name}</span>
        <span className="text-slate-500"> · {leave.leaveType} · {leave.totalDays} day(s)</span>
      </p>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Rejection Remark</label>
        <textarea
          value={remark}
          onChange={e => setRemark(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          rows={3}
          placeholder="Optional reason..."
        />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={() => onAction(leave._id, remark)}>Reject Leave</Button>
      </div>
    </Modal>
  );
}

// ─── View Leave Detail Modal ─────────────────────────────────────────────────

function ViewLeaveModal({ leave, onClose }) {
  const fields = [
    ['Employee',  `${leave.employee?.name} (${leave.employee?.employeeId})`],
    ['Role',       leave.employee?.role],
    ['Leave Type', leave.leaveType],
    ['From',       new Date(leave.fromDate).toLocaleDateString('en-IN')],
    ['To',         new Date(leave.toDate).toLocaleDateString('en-IN')],
    ['Total Days', `${leave.totalDays} day(s)`],
    ['Reason',     leave.reason],
    ['Status',     leave.status],
    ['Applied On', new Date(leave.createdAt).toLocaleDateString('en-IN')],
    ...(leave.approvedBy ? [
      ['Processed By', leave.approvedBy?.name],
      ['Remark',       leave.approvalRemark || '—'],
    ] : []),
  ];

  return (
    <Modal open={true} onClose={onClose} title="Leave Details">
      <div className="space-y-2">
        {fields.map(([label, val]) => (
          <div key={label} className="flex gap-3 py-1.5 border-b border-slate-800">
            <span className="text-slate-500 text-sm w-32 flex-shrink-0">{label}</span>
            <span className="text-white text-sm">{val}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

// ─── Leave Summary Modal ─────────────────────────────────────────────────────

function LeaveSummaryModal({ ayId, employees, onClose }) {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [empFilter, setEmpFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ academicYear: ayId });
        if (empFilter) params.set('employeeId', empFilter);
        const res = await api.get(`${API.LEAVES.BASE}/summary?${params}`);
        setSummary(res.data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, [empFilter]);

  const empOptions = [
    { value: '', label: 'All Employees' },
    ...employees.map(e => ({ value: e._id, label: e.name })),
  ];

  return (
    <Modal open={true} onClose={onClose} title="Leave Summary">
      <div className="mb-3">
        <Select options={empOptions} value={empFilter}
          onChange={e => setEmpFilter(e.target.value)} className="w-52" />
      </div>
      {loading ? (
        <p className="text-slate-500 text-sm py-4">Loading...</p>
      ) : summary.length === 0 ? (
        <p className="text-slate-500 text-sm py-4">No approved leaves found.</p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {summary.map(s => {
            const emp = employees.find(e => String(e._id) === String(s._id));
            return (
              <div key={s._id} className="p-3 bg-slate-800 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">{emp?.name || 'Unknown'}</span>
                  <span className="text-amber-400 text-sm font-semibold">{s.totalLeaves} days total</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.types.map(t => (
                    <span key={t.leaveType} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                      {t.leaveType}: {t.totalDays}d
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
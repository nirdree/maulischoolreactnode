// pages/teacher/Leaves.jsx
/**
 * TEACHER LEAVES PAGE
 * APIs Used:
 *   GET    /api/academic-years/current
 *   GET    /api/leaves                — teacher's own leaves
 *   POST   /api/leaves                — apply for leave
 *   DELETE /api/leaves/:id            — cancel pending leave
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select, leaveStatusBadge, Badge, Modal,
} from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'Maternity', 'Unpaid', 'Other'];

export default function TeacherLeaves() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ayId, setAyId] = useState('');
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
      setAyId(ay.data?._id);
    })();
  }, []);

  const fetchLeaves = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.LEAVES.BASE}?academicYear=${ayId}`);
      setLeaves(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchLeaves(); }, [ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Cancel this leave application?')) return;
    try {
      await api.delete(API.LEAVES.BY_ID(id));
      fetchLeaves();
    } catch (err) { alert(err.message); }
  };

  // Summary counts
  const pending = leaves.filter(l => l.status === 'Pending').length;
  const approved = leaves.filter(l => l.status === 'Approved').length;
  const totalDays = leaves.filter(l => l.status === 'Approved').reduce((s, l) => s + l.totalDays, 0);

  const columns = [
    { key: 'leaveType', label: 'Type', render: (l) => <Badge label={l.leaveType} color="indigo" /> },
    {
      key: 'dates', label: 'Duration',
      render: (l) => (
        <div>
          <p className="text-sm text-white">
            {new Date(l.fromDate).toLocaleDateString('en-IN')} — {new Date(l.toDate).toLocaleDateString('en-IN')}
          </p>
          <p className="text-xs text-slate-500">{l.totalDays} day(s)</p>
        </div>
      ),
    },
    { key: 'reason', label: 'Reason', render: (l) => <span className="text-slate-300 text-sm">{l.reason}</span> },
    { key: 'status', label: 'Status', render: (l) => leaveStatusBadge(l.status) },
    {
      key: 'approvalRemark', label: 'Remark',
      render: (l) => l.approvalRemark
        ? <span className="text-xs text-slate-400">{l.approvalRemark}</span>
        : <span className="text-xs text-slate-600">—</span>,
    },
    {
      key: 'actions', label: '',
      render: (l) => l.status === 'Pending' && (
        <Button size="sm" variant="danger" onClick={() => handleDelete(l._id)}>
          <Trash2 className="w-3 h-3" />
        </Button>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="My Leaves"
        subtitle="Apply and track your leave applications"
        actions={<Button onClick={() => setApplyOpen(true)}><Plus className="w-4 h-4" /> Apply Leave</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Pending', value: pending, color: 'text-amber-400' },
          { label: 'Approved', value: approved, color: 'text-emerald-400' },
          { label: 'Approved Days', value: totalDays, color: 'text-sky-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="!p-0">
        <Table columns={columns} data={leaves} loading={loading} emptyMessage="No leave applications" />
      </Card>

      <ApplyLeaveModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        ayId={ayId}
        employeeId={user?.employeeId}
        onSuccess={() => { fetchLeaves(); setApplyOpen(false); }}
      />
    </PageContent>
  );
}

function ApplyLeaveModal({ open, onClose, ayId, employeeId, onSuccess }) {
  const [form, setForm] = useState({
    leaveType: 'Sick', fromDate: '', toDate: '', reason: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calcDays = () => {
    if (!form.fromDate || !form.toDate) return 0;
    return Math.ceil((new Date(form.toDate) - new Date(form.fromDate)) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason) {
      alert('Please fill all required fields');
      return;
    }
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      alert('End date must be after start date');
      return;
    }
    setSaving(true);
    try {
      await api.post(API.LEAVES.BASE, { ...form, employee: employeeId, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply for Leave">
      <div className="space-y-4">
        <Select
          label="Leave Type *"
          value={form.leaveType}
          onChange={e => set('leaveType', e.target.value)}
          options={LEAVE_TYPES.map(t => ({ value: t, label: t }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="From Date *" type="date" value={form.fromDate} onChange={e => set('fromDate', e.target.value)} />
          <Input label="To Date *" type="date" value={form.toDate} onChange={e => set('toDate', e.target.value)} />
        </div>
        {calcDays() > 0 && (
          <p className="text-xs text-emerald-400 font-medium">Total: {calcDays()} day(s)</p>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Reason *</label>
          <textarea
            value={form.reason}
            onChange={e => set('reason', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            placeholder="State the reason for leave..."
          />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Submitting...' : 'Apply'}</Button>
      </div>
    </Modal>
  );
}
// pages/admin/AcademicYears.jsx
/**
 * ACADEMIC YEARS PAGE
 * APIs Used:
 *   GET   /api/academic-years          — list
 *   POST  /api/academic-years          — create
 *   PUT   /api/academic-years/:id      — update
 *   PATCH /api/academic-years/:id/set-current — set as current
 *   DELETE /api/academic-years/:id     — delete
 */
import { useEffect, useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Badge, Modal } from '../../components/ui.jsx';

export default function AcademicYearsPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await api.get(API.ACADEMIC_YEARS.BASE);
      setYears(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchYears(); }, []);

  const handleSetCurrent = async (id) => {
    await api.patch(API.ACADEMIC_YEARS.SET_CURRENT(id));
    fetchYears();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this academic year?')) return;
    try {
      await api.delete(API.ACADEMIC_YEARS.BY_ID(id));
      fetchYears();
    } catch (err) { alert(err.message); }
  };

  const columns = [
    { key: 'name', label: 'Year', render: (y) => <span className="font-semibold text-white">{y.name}</span> },
    { key: 'startDate', label: 'Start Date', render: (y) => new Date(y.startDate).toLocaleDateString('en-IN') },
    { key: 'endDate', label: 'End Date', render: (y) => new Date(y.endDate).toLocaleDateString('en-IN') },
    {
      key: 'isCurrent', label: 'Status',
      render: (y) => y.isCurrent ? <Badge label="Current" color="green" /> : <Badge label="Inactive" color="slate" />,
    },
    {
      key: 'actions', label: '',
      render: (y) => (
        <div className="flex gap-2">
          {!y.isCurrent && (
            <Button size="sm" variant="ghost" onClick={() => handleSetCurrent(y._id)}>
              <Star className="w-3 h-3 mr-1" /> Set Current
            </Button>
          )}
          {!y.isCurrent && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(y._id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Academic Years"
        subtitle="Manage academic year cycles"
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> New Year</Button>}
      />
      <Card className="!p-0">
        <Table columns={columns} data={years} loading={loading} emptyMessage="No academic years found" />
      </Card>

      <AddYearModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={() => { fetchYears(); setAddOpen(false); }} />
    </PageContent>
  );
}

function AddYearModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.ACADEMIC_YEARS.BASE, form);
      onSuccess();
    } catch (err) { alert(err.message || err.error || 'Failed to create academic year'); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Academic Year">
      <div className="space-y-4">
        <Input label="Year Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="2024-2025" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Date *" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          <Input label="End Date *" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isCurrent} onChange={e => set('isCurrent', e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
          <span className="text-sm text-slate-300">Set as current year</span>
        </label>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Creating...' : 'Create Year'}</Button>
      </div>
    </Modal>
  );
}
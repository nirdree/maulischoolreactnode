// pages/admin/Notices.jsx
/**
 * NOTICES PAGE (Admin)
 * APIs Used:
 *   GET    /api/notices        — list
 *   POST   /api/notices        — create
 *   PUT    /api/notices/:id    — update
 *   DELETE /api/notices/:id    — delete
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

function priorityColor(p) {
  return { Urgent: 'red', Important: 'yellow', Normal: 'slate' }[p] || 'slate';
}

export default function NoticesAdminPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ayId, setAyId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editNotice, setEditNotice] = useState(null);

  useEffect(() => {
    (async () => {
      const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
      setAyId(ay.data?._id);
    })();
  }, []);

  const fetchNotices = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.NOTICES.BASE}?academicYear=${ayId}`);
      setNotices(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchNotices(); }, [ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    await api.delete(API.NOTICES.BY_ID(id));
    fetchNotices();
  };

  const columns = [
    {
      key: 'title', label: 'Title',
      render: (n) => (
        <div>
          <p className="font-medium text-white">{n.title}</p>
          <p className="text-xs text-slate-500 line-clamp-1">{n.content}</p>
        </div>
      ),
    },
    { key: 'priority', label: 'Priority', render: (n) => <Badge label={n.priority} color={priorityColor(n.priority)} /> },
    { key: 'targetRoles', label: 'Audience', render: (n) => (n.targetRoles || []).map(r => <Badge key={r} label={r} color="indigo" className="mr-1" />) },
    { key: 'publishDate', label: 'Published', render: (n) => new Date(n.publishDate).toLocaleDateString('en-IN') },
    { key: 'createdBy', label: 'By', render: (n) => n.createdBy?.name || '—' },
    {
      key: 'actions', label: '',
      render: (n) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditNotice(n)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(n._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Notices"
        subtitle={`${notices.length} notices`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Publish Notice</Button>}
      />
      <Card className="!p-0">
        <Table columns={columns} data={notices} loading={loading} emptyMessage="No notices" />
      </Card>

      <NoticeModal
        open={addOpen || !!editNotice}
        onClose={() => { setAddOpen(false); setEditNotice(null); }}
        notice={editNotice}
        ayId={ayId}
        onSuccess={() => { fetchNotices(); setAddOpen(false); setEditNotice(null); }}
      />
    </PageContent>
  );
}

function NoticeModal({ open, onClose, notice, ayId, onSuccess }) {
  const isEdit = !!notice;
  const [form, setForm] = useState({ title: '', content: '', priority: 'Normal', targetRoles: ['parent', 'teacher'], publishDate: new Date().toISOString().split('T')[0], expiryDate: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (notice) {
      setForm({
        title: notice.title || '',
        content: notice.content || '',
        priority: notice.priority || 'Normal',
        targetRoles: notice.targetRoles || ['parent', 'teacher'],
        publishDate: notice.publishDate ? notice.publishDate.split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: notice.expiryDate ? notice.expiryDate.split('T')[0] : '',
      });
    } else {
      setForm({ title: '', content: '', priority: 'Normal', targetRoles: ['parent', 'teacher'], publishDate: new Date().toISOString().split('T')[0], expiryDate: '' });
    }
  }, [notice]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleRole = (role) => {
    setForm(f => ({
      ...f,
      targetRoles: f.targetRoles.includes(role)
        ? f.targetRoles.filter(r => r !== role)
        : [...f.targetRoles, role],
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(API.NOTICES.BY_ID(notice._id), { ...form, academicYear: ayId });
      } else {
        await api.post(API.NOTICES.BASE, { ...form, academicYear: ayId });
      }
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Notice' : 'Publish Notice'}>
      <div className="space-y-4">
        <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Notice title..." />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Content *</label>
          <textarea
            value={form.content}
            onChange={e => set('content', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4}
            placeholder="Notice content..."
          />
        </div>
        <Select label="Priority" value={form.priority} onChange={e => set('priority', e.target.value)}
          options={['Normal','Important','Urgent'].map(p => ({ value: p, label: p }))} />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Target Audience</label>
          <div className="flex gap-3">
            {['parent', 'teacher', 'admin'].map(role => (
              <label key={role} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.targetRoles.includes(role)} onChange={() => toggleRole(role)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                <span className="text-sm text-slate-300 capitalize">{role}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Publish Date" type="date" value={form.publishDate} onChange={e => set('publishDate', e.target.value)} />
          <Input label="Expiry Date" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Publish'}</Button>
      </div>
    </Modal>
  );
}
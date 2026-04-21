// pages/teacher/Homework.jsx
/**
 * TEACHER HOMEWORK PAGE
 * APIs Used:
 *   GET    /api/academic-years/current
 *   GET    /api/classrooms
 *   GET    /api/subjects              — by class
 *   GET    /api/homework              — list
 *   POST   /api/homework              — create
 *   PUT    /api/homework/:id          — update
 *   DELETE /api/homework/:id          — delete
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal,
} from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext';

export default function HomeworkPage() {
  const { user } = useAuth();
  const [homework, setHomework] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editHw, setEditHw] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch { }
    })();
  }, []);

  const fetchHomework = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (classFilter) params.set('classId', classFilter);
      const res = await api.get(`${API.HOMEWORK.BASE}?${params}`);
      setHomework(res.data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchHomework(); }, [classFilter, ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this homework?')) return;
    await api.delete(API.HOMEWORK.BY_ID(id));
    fetchHomework();
  };

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();

  const columns = [
    {
      key: 'title', label: 'Assignment',
      render: (h) => (
        <div>
          <p className="font-medium text-white">{h.title}</p>
          {h.description && <p className="text-xs text-slate-500 line-clamp-1">{h.description}</p>}
        </div>
      ),
    },
    { key: 'classroom', label: 'Class', render: (h) => h.classroom?.displayName || '—' },
    { key: 'subject', label: 'Subject', render: (h) => <Badge label={h.subject?.name || '—'} color="indigo" /> },
    {
      key: 'dueDate', label: 'Due Date',
      render: (h) => (
        <span className={isOverdue(h.dueDate) ? 'text-rose-400 font-medium' : 'text-amber-400'}>
          {new Date(h.dueDate).toLocaleDateString('en-IN')}
          {isOverdue(h.dueDate) && <span className="ml-1 text-xs">(Overdue)</span>}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Assigned', render: (h) => new Date(h.createdAt).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (h) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditHw(h)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(h._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  return (
    <PageContent>
      <PageHeader
        title="Homework"
        subtitle={`${homework.length} assignments`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Assign Homework</Button>}
      />
      <div className="flex gap-3 mb-4">
        <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-48" />
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={homework} loading={loading} emptyMessage="No homework assigned" />
      </Card>

      <HomeworkModal
        open={addOpen || !!editHw}
        onClose={() => { setAddOpen(false); setEditHw(null); }}
        homework={editHw}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={() => { fetchHomework(); setAddOpen(false); setEditHw(null); }}
      />
    </PageContent>
  );
}

function HomeworkModal({ open, onClose, homework, classrooms, ayId, onSuccess }) {
  const { user } = useAuth();
  const isEdit = !!homework;
  const [form, setForm] = useState({ title: '', description: '', classroom: '', subject: '', dueDate: '' });
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (homework) {
      setForm({
        title: homework.title || '',
        description: homework.description || '',
        classroom: homework.classroom?._id || '',
        subject: homework.subject?._id || '',
        dueDate: homework.dueDate ? homework.dueDate.split('T')[0] : '',
      });
      if (homework.classroom?._id) loadSubjects(homework.classroom._id);
    } else {
      setForm({ title: '', description: '', classroom: '', subject: '', dueDate: '' });
      setSubjects([]);
    }
  }, [homework, open]);

  const loadSubjects = async (classId) => {
    try {
      const res = await api.get(`${API.SUBJECTS.BASE}?classId=${classId}&isActive=true`);
      const allSubjects = res.data || [];

      const mySubjects = allSubjects.filter(
        (s) => s.teacher?.name === user?.name
      );

      setSubjects(mySubjects);
    } catch { }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClassChange = (classId) => {
    set('classroom', classId);
    set('subject', '');
    if (classId) loadSubjects(classId);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, academicYear: ayId, teacher: user?.employeeId };
      if (isEdit) {
        await api.put(API.HOMEWORK.BY_ID(homework._id), payload);
      } else {
        await api.post(API.HOMEWORK.BASE, payload);
      }
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Homework' : 'Assign Homework'}>
      <div className="space-y-4">
        <Input label="Title *" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Chapter 5 Exercise" />
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            placeholder="Details about the assignment..."
          />
        </div>
        <Select
          label="Class *"
          value={form.classroom}
          onChange={e => handleClassChange(e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]}
        />
        <Select
          label="Subject *"
          value={form.subject}
          onChange={e => set('subject', e.target.value)}
          options={[{ value: '', label: 'Select Subject' }, ...subjects.map(s => ({ value: s._id, label: s.name }))]}
        />
        <Input label="Due Date *" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Assign'}</Button>
      </div>
    </Modal>
  );
}
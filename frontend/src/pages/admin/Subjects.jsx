// pages/admin/Subjects.jsx
/**
 * SUBJECTS PAGE
 * APIs Used:
 *   GET    /api/subjects          — list
 *   POST   /api/subjects          — create (single or bulk)
 *   PUT    /api/subjects/:id      — update
 *   PATCH  /api/subjects/:id/toggle — toggle active
 *   DELETE /api/subjects/:id      — delete
 *   GET    /api/classrooms        — populate class dropdown
 *   GET    /api/employees         — populate teacher dropdown
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editSubject, setEditSubject] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const [cls, emps] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?isActive=true&academicYear=${ay.data?._id}`),
          api.get(`${API.EMPLOYEES.BASE}?role=teacher&status=active`),
        ]);
        setClassrooms(cls.data || []);
        setTeachers(emps.data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('classId', classFilter);
      if (ayId) params.set('academicYear', ayId);
      const res = await api.get(`${API.SUBJECTS.BASE}?${params}`);
      setSubjects(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchSubjects(); }, [classFilter, ayId]);

  const handleToggle = async (id) => {
    await api.patch(API.SUBJECTS.TOGGLE(id));
    fetchSubjects();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject?')) return;
    await api.delete(API.SUBJECTS.BY_ID(id));
    fetchSubjects();
  };

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const columns = [
    { key: 'name', label: 'Subject', render: (s) => <span className="font-medium text-white">{s.name}</span> },
    { key: 'classroom', label: 'Class', render: (s) => s.classroom?.displayName || '—' },
    { key: 'teacher', label: 'Teacher', render: (s) => s.teacher?.name || <span className="text-slate-500">Unassigned</span> },
    { key: 'totalMarks', label: 'Total Marks', render: (s) => <span className="text-indigo-400">{s.totalMarks}</span> },
    {
      key: 'isActive', label: 'Status',
      render: (s) => <Badge label={s.isActive ? 'Active' : 'Inactive'} color={s.isActive ? 'green' : 'slate'} />,
    },
    {
      key: 'actions', label: '',
      render: (s) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditSubject(s)}><Edit2 className="w-3 h-3" /></Button>
          <Button size="sm" variant="ghost" onClick={() => handleToggle(s._id)}>
            {s.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-slate-400" />}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(s._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Subjects"
        subtitle={`${subjects.length} subjects`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Add Subject</Button>}
      />
      <div className="flex gap-3 mb-4">
        <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-48" />
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={subjects} loading={loading} emptyMessage="No subjects found" />
      </Card>

      <SubjectModal
        open={addOpen || !!editSubject}
        onClose={() => { setAddOpen(false); setEditSubject(null); }}
        subject={editSubject}
        classrooms={classrooms}
        teachers={teachers}
        ayId={ayId}
        onSuccess={() => { fetchSubjects(); setAddOpen(false); setEditSubject(null); }}
      />
    </PageContent>
  );
}

function SubjectModal({ open, onClose, subject, classrooms, teachers, ayId, onSuccess }) {
  const isEdit = !!subject;
  const [form, setForm] = useState({ name: '', classroom: '', teacher: '', totalMarks: 100 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (subject) {
      setForm({
        name: subject.name || '',
        classroom: subject.classroom?._id || '',
        teacher: subject.teacher?._id || '',
        totalMarks: subject.totalMarks || 100,
      });
    } else {
      setForm({ name: '', classroom: '', teacher: '', totalMarks: 100 });
    }
  }, [subject]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = { ...form, academicYear: ayId };
      if (isEdit) {
        await api.put(API.SUBJECTS.BY_ID(subject._id), payload);
      } else {
        await api.post(API.SUBJECTS.BASE, payload);
      }
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Subject' : 'Add Subject'}>
      <div className="space-y-4">
        <Input label="Subject Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Mathematics" />
        <Select
          label="Classroom *"
          value={form.classroom}
          onChange={e => set('classroom', e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]}
        />
        <Select
          label="Teacher"
          value={form.teacher}
          onChange={e => set('teacher', e.target.value)}
          options={[{ value: '', label: 'No Teacher' }, ...teachers.map(t => ({ value: t._id, label: t.name }))]}
        />
        <Input label="Total Marks" type="number" value={form.totalMarks} onChange={e => set('totalMarks', e.target.value)} />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}</Button>
      </div>
    </Modal>
  );
}
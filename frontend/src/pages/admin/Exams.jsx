// pages/admin/Exams.jsx
/**
 * EXAMS PAGE (Admin)
 * APIs Used:
 *   GET    /api/exams              — list exams
 *   POST   /api/exams              — create exam
 *   PUT    /api/exams/:id          — update
 *   DELETE /api/exams/:id          — delete
 *   GET    /api/exams/:id/marks    — marks for exam
 *   POST   /api/exams/:id/marks    — bulk save marks
 *   GET    /api/classrooms         — dropdown
 *   GET    /api/subjects           — filtered by class
 *   GET    /api/students           — for marks entry
 */
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, ClipboardList } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

const EXAM_TYPES = ['UnitTest1', 'UnitTest2', 'MidTerm', 'FinalExam', 'Project', 'Other'];

export default function ExamsAdminPage() {
  const [exams, setExams] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [marksExam, setMarksExam] = useState(null);

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

  const fetchExams = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear: ayId });
      if (classFilter) params.set('classId', classFilter);
      const res = await api.get(`${API.EXAMS.BASE}?${params}`);
      setExams(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchExams(); }, [classFilter, ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this exam and all marks?')) return;
    await api.delete(API.EXAMS.BY_ID(id));
    fetchExams();
  };

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const columns = [
    { key: 'name', label: 'Exam', render: (e) => <span className="font-medium text-white">{e.name}</span> },
    { key: 'examType', label: 'Type', render: (e) => <Badge label={e.examType} color="indigo" /> },
    { key: 'classroom', label: 'Class', render: (e) => e.classroom?.displayName || '—' },
    { key: 'subject', label: 'Subject', render: (e) => e.subject?.name || '—' },
    { key: 'totalMarks', label: 'Total Marks', render: (e) => <span className="text-amber-400">{e.totalMarks}</span> },
    { key: 'examDate', label: 'Date', render: (e) => new Date(e.examDate).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (e) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setMarksExam(e)}>
            <ClipboardList className="w-3 h-3 mr-1" /> Marks
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(e._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader
        title="Exams & Marks"
        subtitle={`${exams.length} exams`}
        actions={<Button onClick={() => setAddOpen(true)}><Plus className="w-4 h-4" /> Create Exam</Button>}
      />
      <div className="flex gap-3 mb-4">
        <Select options={classOptions} value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-48" />
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={exams} loading={loading} emptyMessage="No exams found" />
      </Card>

      <ExamModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classrooms={classrooms}
        ayId={ayId}
        onSuccess={() => { fetchExams(); setAddOpen(false); }}
      />

      {marksExam && (
        <MarksModal exam={marksExam} onClose={() => setMarksExam(null)} ayId={ayId} />
      )}
    </PageContent>
  );
}

function ExamModal({ open, onClose, classrooms, ayId, onSuccess }) {
  const [form, setForm] = useState({ name: '', examType: 'UnitTest1', classroom: '', subject: '', totalMarks: '', examDate: '', description: '' });
  const [subjects, setSubjects] = useState([]);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleClassChange = async (classId) => {
    set('classroom', classId);
    set('subject', '');
    if (classId) {
      try {
        const res = await api.get(`${API.SUBJECTS.BASE}?classId=${classId}&isActive=true`);
        setSubjects(res.data || []);
      } catch {}
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.post(API.EXAMS.BASE, { ...form, academicYear: ayId });
      onSuccess();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Exam">
      <div className="space-y-4">
        <Input label="Exam Name *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Unit Test 1" />
        <Select label="Exam Type *" value={form.examType} onChange={e => set('examType', e.target.value)}
          options={EXAM_TYPES.map(t => ({ value: t, label: t }))} />
        <Select label="Class *" value={form.classroom} onChange={e => handleClassChange(e.target.value)}
          options={[{ value: '', label: 'Select Class' }, ...classrooms.map(c => ({ value: c._id, label: c.displayName }))]} />
        <Select label="Subject *" value={form.subject} onChange={e => set('subject', e.target.value)}
          options={[{ value: '', label: 'Select Subject' }, ...subjects.map(s => ({ value: s._id, label: s.name }))]} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total Marks *" type="number" value={form.totalMarks} onChange={e => set('totalMarks', e.target.value)} placeholder="25" />
          <Input label="Exam Date *" type="date" value={form.examDate} onChange={e => set('examDate', e.target.value)} />
        </div>
        <Input label="Description" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional notes" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Create Exam'}</Button>
      </div>
    </Modal>
  );
}

function MarksModal({ exam, onClose, ayId }) {
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [absent, setAbsent] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [stuRes, marksRes] = await Promise.all([
          api.get(`${API.STUDENTS.BASE}?classId=${exam.classroom?._id || exam.classroom}&status=Approved&academicYear=${ayId}&limit=100`),
          api.get(API.EXAMS.MARKS(exam._id)),
        ]);
        const stuList = stuRes.data || [];
        setStudents(stuList);
        const mMap = {}, aMap = {};
        (marksRes.data || []).forEach(m => {
          mMap[m.student._id || m.student] = m.marksObtained;
          aMap[m.student._id || m.student] = m.isAbsent;
        });
        setMarks(mMap);
        setAbsent(aMap);
      } catch {}
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const marksArr = students.map(s => ({
        student: s._id,
        marksObtained: absent[s._id] ? 0 : Number(marks[s._id] || 0),
        isAbsent: absent[s._id] || false,
      }));
      await api.post(API.EXAMS.MARKS(exam._id), { marks: marksArr });
      alert('Marks saved!');
      onClose();
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Marks — ${exam.name} (Total: ${exam.totalMarks})`} width="max-w-2xl">
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-900">
            <tr className="border-b border-slate-800">
              <th className="text-left py-2 px-3 text-xs text-slate-400">Student</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400">Marks (/{exam.totalMarks})</th>
              <th className="text-left py-2 px-3 text-xs text-slate-400">Absent</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s._id} className="border-b border-slate-800/50">
                <td className="py-2 px-3 text-white">{s.firstName} {s.lastName} <span className="text-slate-500 text-xs">({s.rollNumber})</span></td>
                <td className="py-2 px-3">
                  <input
                    type="number" min={0} max={exam.totalMarks}
                    disabled={absent[s._id]}
                    value={marks[s._id] ?? ''}
                    onChange={e => setMarks(prev => ({ ...prev, [s._id]: e.target.value }))}
                    className="w-20 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
                  />
                </td>
                <td className="py-2 px-3">
                  <input type="checkbox" checked={absent[s._id] || false}
                    onChange={e => setAbsent(prev => ({ ...prev, [s._id]: e.target.checked }))}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Marks'}</Button>
      </div>
    </Modal>
  );
}
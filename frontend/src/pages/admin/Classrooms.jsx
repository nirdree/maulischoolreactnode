// pages/admin/Classrooms.jsx
/**
 * CLASSROOMS PAGE  — Full-featured admin view
 *
 * APIs used:
 *   GET    /api/classrooms                              list + studentCount
 *   GET    /api/classrooms/available-teachers           unassigned teachers
 *   GET    /api/classrooms/:id/students                 students panel
 *   GET    /api/classrooms/:id/subjects                 subjects panel
 *   POST   /api/classrooms                              create
 *   PUT    /api/classrooms/:id                          update
 *   PATCH  /api/classrooms/:id/toggle                   activate/deactivate
 *   DELETE /api/classrooms/:id                          delete (guarded)
 *   POST   /api/classrooms/:id/subjects                 add subject
 *   PUT    /api/classrooms/:id/subjects/:sid            update subject
 *   DELETE /api/classrooms/:id/subjects/:sid            remove subject
 *   GET    /api/academic-years/current
 *   GET    /api/employees?role=teacher&status=active    (for subject teacher dropdown)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Users, BookOpen, ChevronDown, ChevronUp, X,
  GraduationCap, AlertTriangle,
} from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Button,
  Input, Select, Badge, Modal,
} from '../../components/ui.jsx';


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  className: '', section: '', displayName: '',
  monthlyFees: '', capacity: 40, classTeacher: '', order: 99,
};

const EMPTY_SUBJECT_FORM = { name: '', teacher: '', totalMarks: 100 };


// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ClassroomsPage() {
  const [classrooms, setClassrooms]         = useState([]);
  const [allTeachers, setAllTeachers]       = useState([]);   // for subject teacher dropdown
  const [ayId, setAyId]                     = useState('');
  const [loading, setLoading]               = useState(true);
  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal states
  const [addOpen, setAddOpen]               = useState(false);
  const [editClassroom, setEditClassroom]   = useState(null);
  const [deleteTarget, setDeleteTarget]     = useState(null); // {classroom, studentCount}

  // Expanded panels per card: { [classroomId]: 'students' | 'subjects' | null }
  const [expanded, setExpanded]             = useState({});

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const ayid = ay.data?._id;
        setAyId(ayid);

        const [cls, emps] = await Promise.all([
          api.get(`${API.CLASSROOMS.BASE}?academicYear=${ayid}`),
          api.get(`${API.EMPLOYEES.BASE}?role=teacher&status=active`),
        ]);
        setClassrooms(cls.data || []);
        setAllTeachers(emps.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Data helpers ───────────────────────────────────────────────────────────
  const fetchClassrooms = useCallback(async () => {
    if (!ayId) return;
    const res = await api.get(`${API.CLASSROOMS.BASE}?academicYear=${ayId}`);
    setClassrooms(res.data || []);
  }, [ayId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    await api.patch(API.CLASSROOMS.TOGGLE(id));
    fetchClassrooms();
  };

  /**
   * Attempt delete. If the server says students exist, open confirmation
   * modal showing how many are enrolled.
   */
  const handleDeleteClick = async (classroom) => {
    try {
      await api.delete(API.CLASSROOMS.BY_ID(classroom._id));
      fetchClassrooms();
    } catch (err) {
      const studentCount = err.response?.data?.studentCount;
      if (studentCount > 0) {
        setDeleteTarget({ classroom, studentCount });
      } else {
        alert(err.response?.data?.message || err.message);
      }
    }
  };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = classrooms.filter((c) => {
    const matchSearch =
      !searchQuery ||
      c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.className.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && c.isActive) ||
      (statusFilter === 'inactive' && !c.isActive);

    return matchSearch && matchStatus;
  });

  // ── Expand toggler ─────────────────────────────────────────────────────────
  const togglePanel = (id, panel) => {
    setExpanded(prev => ({
      ...prev,
      [id]: prev[id] === panel ? null : panel,
    }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageContent>
        <div className="flex items-center justify-center h-48 text-slate-400">
          Loading classrooms…
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent>
      {/* ── Header ── */}
      <PageHeader
        title="Classrooms"
        subtitle={`${classrooms.length} class${classrooms.length !== 1 ? 'es' : ''} this year`}
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> Add Classroom
          </Button>
        }
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Input
          placeholder="Search classrooms…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-56"
        />
        {['all', 'active', 'inactive'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              statusFilter === f
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-slate-600 text-slate-300 hover:border-slate-400'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        {(searchQuery || statusFilter !== 'all') && (
          <button
            className="text-xs text-slate-400 hover:text-white ml-1"
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <Card className="py-16 text-center text-slate-400">
          <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{searchQuery ? 'No classrooms match your search.' : 'No classrooms yet. Add one to get started.'}</p>
        </Card>
      )}

      {/* ── Classroom cards ── */}
      <div className="grid grid-cols-1 gap-4">
        {filtered.map(classroom => (
          <ClassroomCard
            key={classroom._id}
            classroom={classroom}
            allTeachers={allTeachers}
            expandedPanel={expanded[classroom._id] || null}
            onTogglePanel={(panel) => togglePanel(classroom._id, panel)}
            onEdit={() => setEditClassroom(classroom)}
            onToggleActive={() => handleToggle(classroom._id)}
            onDelete={() => handleDeleteClick(classroom)}
            onSubjectChange={fetchClassrooms}
            ayId={ayId}
          />
        ))}
      </div>

      {/* ── Add / Edit modal ── */}
      <ClassroomModal
        open={addOpen || !!editClassroom}
        onClose={() => { setAddOpen(false); setEditClassroom(null); }}
        classroom={editClassroom}
        ayId={ayId}
        onSuccess={() => {
          fetchClassrooms();
          setAddOpen(false);
          setEditClassroom(null);
        }}
      />

      {/* ── Delete-blocked confirmation ── */}
      {deleteTarget && (
        <DeleteBlockedModal
          classroom={deleteTarget.classroom}
          studentCount={deleteTarget.studentCount}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </PageContent>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// CLASSROOM CARD
// ─────────────────────────────────────────────────────────────────────────────

function ClassroomCard({
  classroom,
  allTeachers,
  expandedPanel,
  onTogglePanel,
  onEdit,
  onToggleActive,
  onDelete,
  onSubjectChange,
  ayId,
}) {
  return (
    <Card className="!p-0 overflow-hidden">
      {/* ── Card header ── */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-base leading-tight">
              {classroom.displayName}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {classroom.className}{classroom.section ? ` · Section ${classroom.section}` : ''}
            </p>
          </div>
          <Badge
            label={classroom.isActive ? 'Active' : 'Inactive'}
            color={classroom.isActive ? 'green' : 'slate'}
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" title="Edit" onClick={onEdit}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" title={classroom.isActive ? 'Deactivate' : 'Activate'} onClick={onToggleActive}>
            {classroom.isActive
              ? <ToggleRight className="w-4 h-4 text-emerald-400" />
              : <ToggleLeft  className="w-4 h-4 text-slate-400" />}
          </Button>
          <Button size="sm" variant="danger" title="Delete" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 divide-x divide-slate-700 border-b border-slate-700">
        <StatCell label="Monthly Fee" value={`₹${classroom.monthlyFees?.toLocaleString()}`} accent="amber" />
        <StatCell label="Capacity"    value={classroom.capacity} />
        <StatCell label="Students"    value={classroom.studentCount ?? 0} />
      </div>

      {/* ── Teacher row ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-700">
        <span className="text-xs text-slate-500 w-24 flex-shrink-0">Class Teacher</span>
        {classroom.classTeacher ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] text-violet-400 font-semibold">
              {classroom.classTeacher.name.charAt(0)}
            </div>
            <span className="text-slate-200 text-sm">{classroom.classTeacher.name}</span>
            <span className="text-slate-500 text-xs">{classroom.classTeacher.employeeId}</span>
          </div>
        ) : (
          <span className="text-slate-500 text-sm italic">Not assigned</span>
        )}
      </div>

      {/* ── Expandable panels ── */}
      <div className="flex border-b border-slate-700">
        <PanelToggle
          icon={<Users className="w-3.5 h-3.5" />}
          label={`Students (${classroom.studentCount ?? 0})`}
          active={expandedPanel === 'students'}
          onClick={() => onTogglePanel('students')}
        />
        <PanelToggle
          icon={<BookOpen className="w-3.5 h-3.5" />}
          label="Subjects"
          active={expandedPanel === 'subjects'}
          onClick={() => onTogglePanel('subjects')}
          bordered
        />
      </div>

      {/* Students panel */}
      {expandedPanel === 'students' && (
        <StudentsPanel classroomId={classroom._id} />
      )}

      {/* Subjects panel */}
      {expandedPanel === 'subjects' && (
        <SubjectsPanel
          classroomId={classroom._id}
          allTeachers={allTeachers}
          ayId={ayId}
          onChange={onSubjectChange}
        />
      )}
    </Card>
  );
}

function StatCell({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 gap-0.5">
      <span className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</span>
      <span className={`text-lg font-semibold ${accent === 'amber' ? 'text-amber-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}

function PanelToggle({ icon, label, active, onClick, bordered }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium transition-colors
        ${bordered ? 'border-l border-slate-700' : ''}
        ${active
          ? 'bg-slate-700 text-white'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
    >
      {icon}
      {label}
      {active ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
    </button>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS PANEL  (lazy-loaded when expanded)
// ─────────────────────────────────────────────────────────────────────────────

function StudentsPanel({ classroomId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`${API.CLASSROOMS.BY_ID(classroomId)}/students`);
        setStudents(res.data || []);
      } catch {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId]);

  const STATUS_COLORS = {
    Approved:    'green',
    UnderReview: 'yellow',
    OnHold:      'orange',
    Rejected:    'red',
    Left:        'slate',
    Alumni:      'blue',
  };

  if (loading) {
    return (
      <div className="px-5 py-4 text-slate-400 text-sm">Loading students…</div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="px-5 py-4 text-slate-500 text-sm italic">
        No students enrolled in this classroom.
      </div>
    );
  }

  return (
    <div className="px-5 py-3">
      <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
        {students.map(s => (
          <div
            key={s._id}
            className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-slate-300">
                {s.firstName.charAt(0)}{s.lastName.charAt(0)}
              </div>
              <span className="text-slate-200 text-sm">
                {[s.firstName, s.middleName, s.lastName].filter(Boolean).join(' ')}
              </span>
              <span className="text-slate-500 text-xs">{s.admissionNo}</span>
              {s.rollNumber && (
                <span className="text-slate-600 text-xs">Roll #{s.rollNumber}</span>
              )}
            </div>
            <Badge label={s.status} color={STATUS_COLORS[s.status] || 'slate'} />
          </div>
        ))}
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// SUBJECTS PANEL  (lazy-loaded when expanded)
// ─────────────────────────────────────────────────────────────────────────────

function SubjectsPanel({ classroomId, allTeachers, ayId, onChange }) {
  const [subjects, setSubjects]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [editSubject, setEditSubject]   = useState(null);   // subject being edited inline
  const [addForm, setAddForm]           = useState(null);   // null = collapsed, {} = open
  const [saving, setSaving]             = useState(false);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await api.get(`${API.CLASSROOMS.BY_ID(classroomId)}/subjects`);
      setSubjects(res.data || []);
    } catch {
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const teacherOptions = [
    { value: '', label: 'No teacher assigned' },
    ...allTeachers.map(t => ({ value: t._id, label: t.name })),
  ];

  // Add new subject
  const handleAdd = async () => {
    if (!addForm?.name?.trim()) return;
    setSaving(true);
    try {
      await api.post(`${API.CLASSROOMS.BY_ID(classroomId)}/subjects`, addForm);
      setAddForm(null);
      fetchSubjects();
      onChange?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save inline edit
  const handleSaveEdit = async () => {
    if (!editSubject?.name?.trim()) return;
    setSaving(true);
    try {
      await api.put(
        `${API.CLASSROOMS.BY_ID(classroomId)}/subjects/${editSubject._id}`,
        { name: editSubject.name, teacher: editSubject.teacher?._id || editSubject.teacher || '', totalMarks: editSubject.totalMarks }
      );
      setEditSubject(null);
      fetchSubjects();
      onChange?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Remove subject
  const handleRemove = async (subjectId) => {
    if (!confirm('Remove this subject?')) return;
    try {
      await api.delete(`${API.CLASSROOMS.BY_ID(classroomId)}/subjects/${subjectId}`);
      fetchSubjects();
      onChange?.();
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  if (loading) {
    return <div className="px-5 py-4 text-slate-400 text-sm">Loading subjects…</div>;
  }

  return (
    <div className="px-5 py-3">
      {/* Subject list */}
      {subjects.length === 0 && !addForm && (
        <p className="text-slate-500 text-sm italic mb-3">No subjects added yet.</p>
      )}

      <div className="space-y-1.5 mb-3">
        {subjects.map(subj => (
          <div key={subj._id} className="rounded-lg border border-slate-700 px-3 py-2">
            {editSubject?._id === subj._id ? (
              /* ── Inline edit row ── */
              <div className="grid grid-cols-3 gap-2 items-end">
                <Input
                  label="Name"
                  value={editSubject.name}
                  onChange={e => setEditSubject(s => ({ ...s, name: e.target.value }))}
                />
                <Select
                  label="Teacher"
                  value={editSubject.teacher?._id || editSubject.teacher || ''}
                  onChange={e => setEditSubject(s => ({ ...s, teacher: e.target.value }))}
                  options={teacherOptions}
                />
                <Input
                  label="Total Marks"
                  type="number"
                  value={editSubject.totalMarks}
                  onChange={e => setEditSubject(s => ({ ...s, totalMarks: e.target.value }))}
                />
                <div className="col-span-3 flex gap-2 justify-end mt-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditSubject(null)}>Cancel</Button>
                  <Button size="sm" onClick={handleSaveEdit} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Display row ── */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-slate-200 text-sm font-medium">{subj.name}</span>
                  <span className="text-xs text-slate-500">
                    {subj.totalMarks} marks
                  </span>
                  {subj.teacher && (
                    <span className="text-xs text-slate-400">
                      · {subj.teacher.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditSubject({ ...subj })}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleRemove(subj._id)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add subject form */}
      {addForm ? (
        <div className="rounded-lg border border-dashed border-slate-600 px-3 py-3 bg-slate-800/40">
          <div className="grid grid-cols-3 gap-2 items-end">
            <Input
              label="Subject Name *"
              value={addForm.name || ''}
              onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Mathematics"
              autoFocus
            />
            <Select
              label="Teacher"
              value={addForm.teacher || ''}
              onChange={e => setAddForm(f => ({ ...f, teacher: e.target.value }))}
              options={teacherOptions}
            />
            <Input
              label="Total Marks"
              type="number"
              value={addForm.totalMarks ?? 100}
              onChange={e => setAddForm(f => ({ ...f, totalMarks: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button size="sm" variant="ghost" onClick={() => setAddForm(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={saving || !addForm?.name?.trim()}>
              {saving ? 'Adding…' : 'Add Subject'}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setAddForm({ ...EMPTY_SUBJECT_FORM })}
          className="text-blue-400 border-dashed border-blue-800"
        >
          <Plus className="w-3 h-3" /> Add Subject
        </Button>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ADD / EDIT CLASSROOM MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ClassroomModal({ open, onClose, classroom, ayId, onSuccess }) {
  const isEdit = !!classroom;
  const [form, setForm]               = useState(EMPTY_FORM);
  const [availTeachers, setAvailTeachers] = useState([]);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  // Populate form and fetch available teachers whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setError('');

    if (classroom) {
      setForm({
        className:    classroom.className    || '',
        section:      classroom.section      || '',
        displayName:  classroom.displayName  || '',
        monthlyFees:  classroom.monthlyFees  || '',
        capacity:     classroom.capacity     || 40,
        classTeacher: classroom.classTeacher?._id || '',
        order:        classroom.order        ?? 99,
      });
    } else {
      setForm(EMPTY_FORM);
    }

    // Fetch teachers that are not yet assigned — exclude current classroom in edit mode
    (async () => {
      try {
        const params = new URLSearchParams({ academicYear: ayId });
        if (classroom?._id) params.set('excludeClassroom', classroom._id);
        const res = await api.get(`${API.CLASSROOMS.BASE}/available-teachers?${params}`);
        const teachers = res.data || [];

        // In edit mode, if this classroom already has a teacher, include them
        // (they come back from the API since we excluded this classroom)
        setAvailTeachers(teachers);
      } catch {
        setAvailTeachers([]);
      }
    })();
  }, [open, classroom, ayId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.className.trim())   return setError('Class name is required.');
    if (!form.displayName.trim()) return setError('Display name is required.');
    if (!form.monthlyFees)        return setError('Monthly fees is required.');

    setSaving(true);
    try {
      const payload = {
        ...form,
        academicYear: ayId,
        classTeacher: form.classTeacher || undefined,
      };
      if (!payload.classTeacher) delete payload.classTeacher;

      if (isEdit) {
        await api.put(API.CLASSROOMS.BY_ID(classroom._id), payload);
      } else {
        await api.post(API.CLASSROOMS.BASE, payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const teacherOptions = [
    { value: '', label: '— No class teacher —' },
    ...availTeachers.map(t => ({ value: t._id, label: `${t.name} (${t.employeeId})` })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${classroom?.displayName}` : 'Add Classroom'}
    >
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Class Name *"
          value={form.className}
          onChange={e => set('className', e.target.value)}
          placeholder="Class 1"
        />
        <Input
          label="Section"
          value={form.section}
          onChange={e => set('section', e.target.value)}
          placeholder="A"
        />
        <Input
          label="Display Name *"
          value={form.displayName}
          onChange={e => set('displayName', e.target.value)}
          placeholder="Class 1-A"
          className="col-span-2"
        />
        <Input
          label="Monthly Fees (₹) *"
          type="number"
          value={form.monthlyFees}
          onChange={e => set('monthlyFees', e.target.value)}
          placeholder="2000"
        />
        <Input
          label="Capacity"
          type="number"
          value={form.capacity}
          onChange={e => set('capacity', e.target.value)}
        />
        <div className="col-span-2">
          <Select
            label="Class Teacher"
            value={form.classTeacher}
            onChange={e => set('classTeacher', e.target.value)}
            options={teacherOptions}
          />
          {availTeachers.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">
              All active teachers are currently assigned as class teachers.
            </p>
          )}
        </div>
        {/* <Input
          label="Sort Order"
          type="number"
          value={form.order}
          onChange={e => set('order', e.target.value)}
        /> */}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// DELETE-BLOCKED MODAL
// Shows when the server refuses deletion because students are enrolled
// ─────────────────────────────────────────────────────────────────────────────

function DeleteBlockedModal({ classroom, studentCount, onClose }) {
  return (
    <Modal open onClose={onClose} title="Cannot Delete Classroom">
      <div className="flex flex-col items-center text-center py-2 gap-3">
        <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-lg">{classroom.displayName}</p>
          <p className="text-slate-400 text-sm mt-1">
            This classroom cannot be deleted because it has
          </p>
          <p className="text-red-400 text-3xl font-bold my-2">{studentCount}</p>
          <p className="text-slate-400 text-sm">
            active student{studentCount !== 1 ? 's' : ''} enrolled.
          </p>
        </div>
        <div className="bg-slate-800 rounded-lg px-4 py-3 text-left text-sm text-slate-300 w-full">
          <p className="font-medium mb-1">To delete this classroom:</p>
          <ul className="text-slate-400 space-y-1 list-disc list-inside">
            <li>Transfer students to another classroom, or</li>
            <li>Mark students as Left / Alumni first</li>
          </ul>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <Button onClick={onClose}>Got it</Button>
      </div>
    </Modal>
  );
}
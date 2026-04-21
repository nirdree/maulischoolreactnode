// pages/parent/Homework.jsx
/**
 * PARENT HOMEWORK PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/homework               — by classId of selected child
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select, Badge } from '../../components/ui.jsx';

export default function ParentHomework() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [homework, setHomework] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        const kids = res.data || [];
        setChildren(kids);
        if (kids.length > 0) setSelectedChild(kids[0]._id);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (selectedChild && ayId) fetchHomework();
  }, [selectedChild, ayId]);

  const fetchHomework = async () => {
    const child = children.find(c => c._id === selectedChild);
    if (!child?.classroom?._id) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.HOMEWORK.BASE}?classId=${child.classroom._id}&academicYear=${ayId}`);
      setHomework(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName} (${c.classroom?.displayName || ''})`,
  }));

  const isOverdue = (dueDate) => new Date(dueDate) < new Date();
  const today = homework.filter(h => !isOverdue(h.dueDate));
  const overdue = homework.filter(h => isOverdue(h.dueDate));

  return (
    <PageContent>
      <PageHeader title="Homework" subtitle="Assignments for your child" />

      <div className="flex gap-3 mb-6">
        {children.length > 1 && (
          <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-64" label="Child" />
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : homework.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No homework assigned yet.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Upcoming</h3>
              <div className="space-y-3">
                {today.map(hw => <HomeworkCard key={hw._id} hw={hw} overdue={false} />)}
              </div>
            </div>
          )}
          {overdue.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-3">Overdue</h3>
              <div className="space-y-3">
                {overdue.map(hw => <HomeworkCard key={hw._id} hw={hw} overdue={true} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </PageContent>
  );
}

function HomeworkCard({ hw, overdue }) {
  return (
    <Card className={overdue ? '!border-rose-500/20' : ''}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white">{hw.title}</h3>
            <Badge label={hw.subject?.name || '—'} color="indigo" />
          </div>
          {hw.description && (
            <p className="text-xs text-slate-400 leading-relaxed">{hw.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>Class: {hw.classroom?.displayName}</span>
            <span>·</span>
            <span>By: {hw.teacher?.name || 'Teacher'}</span>
            <span>·</span>
            <span>Assigned: {new Date(hw.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-xs font-semibold ${overdue ? 'text-rose-400' : 'text-amber-400'}`}>
            {overdue ? 'Overdue' : 'Due'}
          </p>
          <p className="text-xs text-slate-300">{new Date(hw.dueDate).toLocaleDateString('en-IN')}</p>
        </div>
      </div>
    </Card>
  );
}
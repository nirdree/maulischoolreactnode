// pages/parent/Marks.jsx
/**
 * PARENT MARKS PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/marks                  — marks filtered by student
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Select, Badge } from '../../components/ui.jsx';

function gradeColor(grade) {
  const map = {
    'A+': 'text-emerald-400', 'A': 'text-emerald-400',
    'B+': 'text-sky-400', 'B': 'text-sky-400',
    'C': 'text-amber-400', 'D': 'text-amber-400',
    'F': 'text-rose-400',
  };
  return map[grade] || 'text-slate-400';
}

function gradeBarColor(grade) {
  const map = {
    'A+': 'bg-emerald-500', 'A': 'bg-emerald-500',
    'B+': 'bg-sky-500', 'B': 'bg-sky-500',
    'C': 'bg-amber-500', 'D': 'bg-amber-500',
    'F': 'bg-rose-500',
  };
  return map[grade] || 'bg-slate-500';
}

export default function ParentMarks() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [marks, setMarks] = useState([]);
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
    if (selectedChild && ayId) fetchMarks();
  }, [selectedChild, ayId]);

  const fetchMarks = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API.MARKS.BASE}?studentId=${selectedChild}&academicYear=${ayId}`);
      setMarks(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName} (${c.classroom?.displayName || ''})`,
  }));

  // Group marks by exam type
  const groupedByExam = marks.reduce((acc, m) => {
    const key = m.exam?.name || 'Unknown';
    if (!acc[key]) acc[key] = { exam: m.exam, subjects: [] };
    acc[key].subjects.push(m);
    return acc;
  }, {});

  // Overall stats
  const presentMarks = marks.filter(m => !m.isAbsent);
  const totalObtained = presentMarks.reduce((s, m) => s + m.marksObtained, 0);
  const totalMax = presentMarks.reduce((s, m) => s + (m.exam?.totalMarks || 0), 0);
  const overallPct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

  return (
    <PageContent>
      <PageHeader title="Marks & Results" subtitle="Exam performance overview" />

      <div className="flex gap-3 mb-6">
        <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-64" label="Child" />
      </div>

      {/* Overall Summary */}
      {marks.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Obtained', value: `${totalObtained}/${totalMax}`, color: 'text-white' },
            { label: 'Overall %', value: `${overallPct}%`, color: overallPct >= 60 ? 'text-emerald-400' : 'text-rose-400' },
            { label: 'Exams Taken', value: Object.keys(groupedByExam).length, color: 'text-sky-400' },
          ].map(s => (
            <Card key={s.label}>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading marks...</div>
      ) : marks.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No marks available yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByExam).map(([examName, { exam, subjects }]) => {
            const examObtained = subjects.filter(m => !m.isAbsent).reduce((s, m) => s + m.marksObtained, 0);
            const examMax = subjects.filter(m => !m.isAbsent).reduce((s, m) => s + (m.exam?.totalMarks || 0), 0);
            const examPct = examMax > 0 ? Math.round((examObtained / examMax) * 100) : 0;

            return (
              <Card key={examName}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">{examName}</h3>
                    {exam?.examType && <Badge label={exam.examType} color="indigo" />}
                    {exam?.examDate && (
                      <span className="ml-2 text-xs text-slate-500">{new Date(exam.examDate).toLocaleDateString('en-IN')}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${examPct >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>{examPct}%</p>
                    <p className="text-xs text-slate-500">{examObtained}/{examMax}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {subjects.map(m => {
                    const pct = m.isAbsent ? 0 : Math.round((m.marksObtained / (m.exam?.totalMarks || 1)) * 100);
                    return (
                      <div key={m._id} className="flex items-center gap-3">
                        <div className="w-28 text-xs text-slate-400 truncate flex-shrink-0">
                          {m.subject?.name || '—'}
                        </div>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.isAbsent ? 'bg-slate-600' : gradeBarColor(m.grade)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 w-20 justify-end">
                          {m.isAbsent ? (
                            <span className="text-xs text-slate-500">Absent</span>
                          ) : (
                            <>
                              <span className="text-xs text-white">{m.marksObtained}/{m.exam?.totalMarks}</span>
                              <span className={`text-xs font-bold w-6 text-right ${gradeColor(m.grade)}`}>{m.grade}</span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageContent>
  );
}
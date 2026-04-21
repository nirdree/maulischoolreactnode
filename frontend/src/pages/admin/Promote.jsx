// pages/admin/Promote.jsx
/**
 * PROMOTE PAGE
 * APIs Used:
 *   GET  /api/promote/preview  — preview students
 *   POST /api/promote          — execute promotion
 *   GET  /api/classrooms       — dropdowns
 */
import { useEffect, useState } from 'react';
import { ArrowUpCircle, Search } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Select, Badge } from '../../components/ui.jsx';

export default function PromotePage() {
  const [classrooms, setClassrooms] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [ayId, setAyId] = useState('');
  const [preview, setPreview] = useState(null);
  const [promotions, setPromotions] = useState({});
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);

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

  const handlePreview = async () => {
    if (!classFilter) return;
    setLoading(true);
    try {
      const res = await api.get(`${API.PROMOTE.PREVIEW}?classId=${classFilter}&academicYear=${ayId}`);
      setPreview(res.data);
      // Default all to Promoted with next class
      const initMap = {};
      (res.data.students || []).forEach(s => {
        initMap[s._id] = { action: 'Promoted', nextClassId: res.data.nextClass?._id || '' };
      });
      setPromotions(initMap);
      setResult(null);
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  const handleExecute = async () => {
    if (!confirm('Execute promotion? This cannot be undone.')) return;
    setExecuting(true);
    try {
      const promoArr = Object.entries(promotions).map(([studentId, val]) => ({
        studentId, ...val,
      }));
      const res = await api.post(API.PROMOTE.EXECUTE, { promotions: promoArr });
      setResult(res.data);
      setPreview(null);
    } catch (err) { alert(err.message); } finally { setExecuting(false); }
  };

  const updatePromotion = (studentId, field, value) => {
    setPromotions(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const classOptions = [
    { value: '', label: 'Select Class' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  const nextClassOptions = [
    { value: '', label: 'Same Class (Detain)' },
    ...classrooms.map(c => ({ value: c._id, label: c.displayName })),
  ];

  return (
    <PageContent>
      <PageHeader title="Promote Students" subtitle="Advance or detain students at year end" />

      <Card className="mb-6">
        <div className="flex gap-3 items-end">
          <Select label="Select Class to Preview" options={classOptions} value={classFilter}
            onChange={e => setClassFilter(e.target.value)} className="w-52" />
          <Button onClick={handlePreview} disabled={!classFilter || loading}>
            <Search className="w-4 h-4" /> {loading ? 'Loading...' : 'Load Preview'}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="mb-6 border-emerald-800 bg-emerald-900/10">
          <h3 className="text-emerald-400 font-semibold mb-2">Promotion Complete!</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-400">Promoted: </span><span className="text-white font-bold">{result.promoted}</span></div>
            <div><span className="text-slate-400">Detained: </span><span className="text-white font-bold">{result.detained}</span></div>
            <div><span className="text-slate-400">Left: </span><span className="text-white font-bold">{result.left}</span></div>
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-3">
              <p className="text-rose-400 text-xs font-medium">Errors:</p>
              {result.errors.map((e, i) => <p key={i} className="text-xs text-rose-300">{e}</p>)}
            </div>
          )}
        </Card>
      )}

      {preview && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">{preview.currentClass?.displayName}</h3>
              <p className="text-slate-400 text-sm">{preview.totalCount} eligible students</p>
            </div>
            <div className="flex gap-3">
              {preview.nextClass && (
                <span className="text-slate-400 text-sm">
                  Next Class: <span className="text-white">{preview.nextClass?.displayName}</span>
                </span>
              )}
              <Button onClick={handleExecute} disabled={executing}>
                <ArrowUpCircle className="w-4 h-4" /> {executing ? 'Executing...' : 'Execute Promotion'}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 px-3 text-xs text-slate-400 uppercase">Student</th>
                  <th className="text-left py-2 px-3 text-xs text-slate-400 uppercase">Action</th>
                  <th className="text-left py-2 px-3 text-xs text-slate-400 uppercase">Move To</th>
                </tr>
              </thead>
              <tbody>
                {preview.students.map(s => (
                  <tr key={s._id} className="border-b border-slate-800/50">
                    <td className="py-2 px-3 text-white">{s.firstName} {s.lastName} <span className="text-slate-500">#{s.rollNumber}</span></td>
                    <td className="py-2 px-3">
                      <select
                        value={promotions[s._id]?.action || 'Promoted'}
                        onChange={e => updatePromotion(s._id, 'action', e.target.value)}
                        className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="Promoted">Promoted</option>
                        <option value="Detained">Detained</option>
                        <option value="Left">Left</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      {promotions[s._id]?.action === 'Promoted' && (
                        <select
                          value={promotions[s._id]?.nextClassId || ''}
                          onChange={e => updatePromotion(s._id, 'nextClassId', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {nextClassOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContent>
  );
}
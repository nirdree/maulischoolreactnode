// pages/teacher/Notices.jsx
/**
 * TEACHER NOTICES PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/notices                — filtered to teacher role
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge } from '../../components/ui.jsx';

function priorityColor(p) {
  return { Urgent: 'red', Important: 'yellow', Normal: 'slate' }[p] || 'slate';
}

export default function TeacherNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const res = await api.get(`${API.NOTICES.BASE}?academicYear=${ay.data?._id}`);
        setNotices(res.data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <PageContent>
      <PageHeader title="Notices" subtitle={`${notices.length} active notices`} />

      {notices.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No notices at this time.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notices.map(n => (
            <Card key={n._id} className={`border-l-4 ${
              n.priority === 'Urgent' ? 'border-l-rose-500' :
              n.priority === 'Important' ? 'border-l-amber-500' :
              'border-l-slate-600'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{n.title}</h3>
                    <Badge label={n.priority} color={priorityColor(n.priority)} />
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{n.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span>By {n.createdBy?.name || 'Admin'}</span>
                    <span>·</span>
                    <span>{new Date(n.publishDate).toLocaleDateString('en-IN')}</span>
                    {n.expiryDate && (
                      <>
                        <span>·</span>
                        <span>Expires: {new Date(n.expiryDate).toLocaleDateString('en-IN')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContent>
  );
}
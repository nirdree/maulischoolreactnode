// pages/parent/Notices.jsx
/**
 * PARENT NOTICES PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/notices                — filtered to parent role
 */
import { useEffect, useState } from 'react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge } from '../../components/ui.jsx';

function priorityColor(p) {
  return { Urgent: 'red', Important: 'yellow', Normal: 'slate' }[p] || 'slate';
}

export default function ParentNotices() {
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

  const urgent = notices.filter(n => n.priority === 'Urgent');
  const important = notices.filter(n => n.priority === 'Important');
  const normal = notices.filter(n => n.priority === 'Normal');

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const NoticeGroup = ({ title, items, borderColor }) => items.length > 0 && (
    <div>
      <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${
        borderColor === 'rose' ? 'text-rose-400' : borderColor === 'amber' ? 'text-amber-400' : 'text-slate-400'
      }`}>{title}</h3>
      <div className="space-y-3 mb-6">
        {items.map(n => (
          <Card key={n._id} className={`border-l-4 ${
            borderColor === 'rose' ? 'border-l-rose-500' :
            borderColor === 'amber' ? 'border-l-amber-500' : 'border-l-slate-600'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="text-sm font-semibold text-white">{n.title}</h4>
                  <Badge label={n.priority} color={priorityColor(n.priority)} />
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{n.content}</p>
                <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                  <span>From: {n.createdBy?.name || 'School'}</span>
                  <span>·</span>
                  <span>{new Date(n.publishDate).toLocaleDateString('en-IN')}</span>
                  {n.expiryDate && (
                    <>
                      <span>·</span>
                      <span>Expires {new Date(n.expiryDate).toLocaleDateString('en-IN')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <PageContent>
      <PageHeader title="School Notices" subtitle={`${notices.length} active notices`} />

      {notices.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">No notices at this time.</p>
        </Card>
      ) : (
        <>
          <NoticeGroup title="🚨 Urgent" items={urgent} borderColor="rose" />
          <NoticeGroup title="⚠️ Important" items={important} borderColor="amber" />
          <NoticeGroup title="📢 General" items={normal} borderColor="slate" />
        </>
      )}
    </PageContent>
  );
}
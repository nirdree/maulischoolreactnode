// pages/parent/MyChildren.jsx
/**
 * PARENT - MY CHILDREN PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's linked children (filtered server-side)
 */
import { useEffect, useState } from 'react';
import { Loader2, User, Phone, Mail, School } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Badge, studentStatusBadge } from '../../components/ui.jsx';

export default function MyChildren() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        const res = await api.get(`${API.STUDENTS.BASE}?academicYear=${ay.data?._id}`);
        setChildren(res.data || []);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
    </div>
  );

  return (
    <PageContent>
      <PageHeader title="My Children" subtitle={`${children.length} enrolled`} />

      {children.length === 0 ? (
        <Card>
          <p className="text-slate-500 text-sm text-center py-8">
            No children are linked to your account. Please contact the school.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {children.map(child => (
            <Card key={child._id}>
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                  {child.firstName?.charAt(0)}{child.lastName?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {child.firstName} {child.middleName} {child.lastName}
                  </h3>
                  <p className="text-xs text-slate-400">{child.admissionNo}</p>
                  <div className="mt-1">{studentStatusBadge(child.status)}</div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <InfoRow label="Class" value={child.classroom?.displayName} />
                <InfoRow label="Roll No." value={child.rollNumber} />
                <InfoRow label="Gender" value={child.gender} />
                <InfoRow label="Date of Birth" value={child.dateOfBirth ? new Date(child.dateOfBirth).toLocaleDateString('en-IN') : '—'} />
                {child.bloodGroup && <InfoRow label="Blood Group" value={child.bloodGroup} />}
                {child.religion && <InfoRow label="Religion" value={child.religion} />}
              </div>

              {/* Parent Info */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Parent / Guardian</p>
                <div className="space-y-1.5">
                  {child.fatherName && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.fatherName} (Father)</span>
                    </div>
                  )}
                  {child.fatherPhone && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.fatherPhone}</span>
                    </div>
                  )}
                  {child.fatherEmail && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.fatherEmail}</span>
                    </div>
                  )}
                  {child.motherName && (
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{child.motherName} (Mother)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous School */}
              {child.previousSchoolName && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <School className="w-3 h-3 flex-shrink-0" />
                    <span>Previous: {child.previousSchoolName}</span>
                    {child.previousClass && <span>· {child.previousClass}</span>}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </PageContent>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-white font-medium mt-0.5">{value || '—'}</p>
    </div>
  );
}
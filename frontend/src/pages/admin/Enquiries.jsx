// pages/admin/Enquiries.jsx
/**
 * ENQUIRIES PAGE
 * APIs Used:
 *   GET  /api/enquiries   — list with filters
 *   PUT  /api/enquiries/:id — update status/remark
 *   DELETE /api/enquiries/:id — delete
 */
import { useEffect, useState } from 'react';
import { Search, RefreshCw, Eye, Trash2 } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Input, Select, Badge, Modal } from '../../components/ui.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'New', label: 'New' },
  { value: 'Contacted', label: 'Contacted' },
  { value: 'AdmissionDone', label: 'Admission Done' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'PlanningFuture', label: 'Planning Future' },
];

function statusColor(s) {
  const map = { New: 'blue', Contacted: 'yellow', AdmissionDone: 'green', Cancelled: 'red', PlanningFuture: 'purple' };
  return map[s] || 'slate';
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ayId, setAyId] = useState('');
  const [viewEnquiry, setViewEnquiry] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const ay = await api.get(API.ACADEMIC_YEARS.CURRENT);
        setAyId(ay.data?._id);
        const cls = await api.get(`${API.CLASSROOMS.BASE}?academicYear=${ay.data?._id}`);
        setClassrooms(cls.data || []);
      } catch {}
    })();
  }, []);

  const fetchEnquiries = async () => {
    if (!ayId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20, academicYear: ayId });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`${API.ENQUIRIES.BASE}?${params}`);
      setEnquiries(res.data || []);
      setTotal(res.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (ayId) fetchEnquiries(); }, [page, statusFilter, ayId]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this enquiry?')) return;
    await api.delete(API.ENQUIRIES.BY_ID(id));
    fetchEnquiries();
  };

  const handleUpdateStatus = async (id, status, adminRemark) => {
    await api.put(API.ENQUIRIES.BY_ID(id), { status, adminRemark });
    fetchEnquiries();
    setViewEnquiry(null);
  };

  const columns = [
    { key: 'enquiryId', label: 'ID' },
    {
      key: 'childName', label: 'Child',
      render: (e) => (
        <div>
          <p className="font-medium text-white">{e.childName}</p>
          <p className="text-xs text-slate-500">{e.classApplying?.displayName}</p>
        </div>
      ),
    },
    {
      key: 'father', label: 'Parent',
      render: (e) => (
        <div>
          <p className="text-sm">{e.fatherName}</p>
          <p className="text-xs text-slate-500">{e.mobileNo}</p>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (e) => <Badge label={e.status} color={statusColor(e.status)} /> },
    { key: 'createdAt', label: 'Date', render: (e) => new Date(e.createdAt).toLocaleDateString('en-IN') },
    {
      key: 'actions', label: '',
      render: (e) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setViewEnquiry(e)}><Eye className="w-3 h-3" /></Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(e._id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader title="Enquiries" subtitle={`${total} enquiries`} />
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by name, phone..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchEnquiries()}
          />
        </div>
        <Select options={STATUS_OPTIONS} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-44" />
        <Button variant="ghost" onClick={fetchEnquiries}><RefreshCw className="w-4 h-4" /></Button>
      </div>
      <Card className="!p-0">
        <Table columns={columns} data={enquiries} loading={loading} emptyMessage="No enquiries found" />
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
            <span className="text-xs text-slate-500">Page {page}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="ghost" disabled={enquiries.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      {viewEnquiry && (
        <EnquiryDetailModal
          enquiry={viewEnquiry}
          onClose={() => setViewEnquiry(null)}
          onUpdate={handleUpdateStatus}
        />
      )}
    </PageContent>
  );
}

function EnquiryDetailModal({ enquiry, onClose, onUpdate }) {
  const [status, setStatus] = useState(enquiry.status);
  const [adminRemark, setAdminRemark] = useState(enquiry.adminRemark || '');

  const statusOptions = [
    { value: 'New', label: 'New' },
    { value: 'Contacted', label: 'Contacted' },
    { value: 'AdmissionDone', label: 'Admission Done' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'PlanningFuture', label: 'Planning Future' },
  ];

  const rows = [
    ['Enquiry ID', enquiry.enquiryId],
    ['Child Name', enquiry.childName],
    ['Class Applied', enquiry.classApplying?.displayName],
    ['Gender', enquiry.gender],
    ['Age', enquiry.age],
    ['Date of Birth', new Date(enquiry.dateOfBirth).toLocaleDateString('en-IN')],
    ['Parents Name', enquiry.fatherName],
    ['Phone', enquiry.phoneNo],
    ['Mobile', enquiry.mobileNo],
    ['Email', enquiry.email],
    ['Address', enquiry.residentialAddress],
    ['Remark', enquiry.remark],
  ];

  return (
    <Modal open={true} onClose={onClose} title="Enquiry Details" width="max-w-2xl">
      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        {rows.map(([label, value]) => value ? (
          <div key={label} className="col-span-1">
            <span className="text-slate-500">{label}: </span>
            <span className="text-white">{value}</span>
          </div>
        ) : null)}
      </div>
      <div className="border-t border-slate-800 pt-4 space-y-3">
        <Select label="Update Status" options={statusOptions} value={status} onChange={e => setStatus(e.target.value)} />
        <Input label="Admin Remark" value={adminRemark} onChange={e => setAdminRemark(e.target.value)} placeholder="Add a remark..." />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button onClick={() => onUpdate(enquiry._id, status, adminRemark)}>Update</Button>
      </div>
    </Modal>
  );
}
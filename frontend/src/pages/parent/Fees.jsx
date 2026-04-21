// pages/parent/Fees.jsx
/**
 * PARENT FEES PAGE
 * APIs Used:
 *   GET /api/academic-years/current
 *   GET /api/students               — parent's children
 *   GET /api/fees                   — fee records for children
 *   GET /api/fees/:id/payments      — payment history
 */
import { useEffect, useState } from 'react';
import { Eye, AlertCircle } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Table, Button, Select, feeStatusBadge, Modal } from '../../components/ui.jsx';

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ParentFees() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [fees, setFees] = useState([]);
  const [ayId, setAyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [viewPayments, setViewPayments] = useState(null);

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
    if (selectedChild && ayId) fetchFees();
  }, [selectedChild, ayId]);

  const fetchFees = async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API.FEES.BASE}?studentId=${selectedChild}&academicYear=${ayId}`);
      setFees(res.data || []);
    } catch {} finally { setLoading(false); }
  };

  const childOptions = children.map(c => ({
    value: c._id,
    label: `${c.firstName} ${c.lastName}`,
  }));

  const totalDue = fees.filter(f => f.status !== 'Paid').reduce((s, f) => s + f.finalAmount, 0);
  const totalPaid = fees.filter(f => f.status === 'Paid').reduce((s, f) => s + f.finalAmount, 0);

  const columns = [
    {
      key: 'period', label: 'Period',
      render: (f) => <span className="font-medium text-white">{MONTHS_FULL[f.month - 1]} {f.year}</span>,
    },
    { key: 'tuitionFee', label: 'Tuition', render: (f) => `₹${f.tuitionFee?.toLocaleString()}` },
    {
      key: 'details', label: 'Extras',
      render: (f) => {
        const extras = [];
        if (f.transportFee > 0) extras.push(`Transport: ₹${f.transportFee}`);
        if (f.activityFee > 0) extras.push(`Activity: ₹${f.activityFee}`);
        if (f.discount > 0) extras.push(`Discount: -₹${f.discount}`);
        if (f.lateFine > 0) extras.push(`Late fine: ₹${f.lateFine}`);
        return extras.length > 0
          ? <span className="text-xs text-slate-400">{extras.join(', ')}</span>
          : <span className="text-slate-600">—</span>;
      },
    },
    {
      key: 'finalAmount', label: 'Total Due',
      render: (f) => <span className="font-semibold text-amber-400">₹{f.finalAmount?.toLocaleString()}</span>,
    },
    { key: 'dueDate', label: 'Due Date', render: (f) => new Date(f.dueDate).toLocaleDateString('en-IN') },
    { key: 'status', label: 'Status', render: (f) => feeStatusBadge(f.status) },
    {
      key: 'actions', label: '',
      render: (f) => (
        <Button size="sm" variant="ghost" onClick={() => setViewPayments(f)}>
          <Eye className="w-3 h-3 mr-1" /> Receipt
        </Button>
      ),
    },
  ];

  return (
    <PageContent>
      <PageHeader title="Fee Details" subtitle="View your fee status and receipts" />

      <div className="flex gap-3 mb-6">
        {children.length > 1 && (
          <Select options={childOptions} value={selectedChild} onChange={e => setSelectedChild(e.target.value)} className="w-52" label="Child" />
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Paid', value: `₹${totalPaid.toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'Outstanding', value: `₹${totalDue.toLocaleString()}`, color: totalDue > 0 ? 'text-rose-400' : 'text-white' },
          { label: 'Total Records', value: fees.length, color: 'text-sky-400' },
        ].map(s => (
          <Card key={s.label}>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      {totalDue > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <p className="text-sm text-rose-300">
            You have outstanding fees of <strong>₹{totalDue.toLocaleString()}</strong>. Please pay at the school office.
          </p>
        </div>
      )}

      <Card className="!p-0">
        <Table columns={columns} data={fees} loading={loading} emptyMessage="No fee records found" />
      </Card>

      {viewPayments && (
        <PaymentHistoryModal fee={viewPayments} onClose={() => setViewPayments(null)} />
      )}
    </PageContent>
  );
}

function PaymentHistoryModal({ fee, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  useEffect(() => {
    api.get(API.FEES.PAYMENTS(fee._id))
      .then(res => setPayments(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal open={true} onClose={onClose} title={`Receipts — ${months[fee.month - 1]} ${fee.year}`}>
      <div className="mb-4 p-3 bg-slate-800 rounded-lg text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Total Amount</span>
          <span className="text-white font-semibold">₹{fee.finalAmount?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-slate-400">Status</span>
          {feeStatusBadge(fee.status)}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : payments.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No payments made yet.</p>
      ) : (
        <div className="space-y-3">
          {payments.map(p => (
            <div key={p._id} className="p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-emerald-400">₹{p.amountPaid?.toLocaleString()}</p>
                <p className="text-xs text-slate-500 font-mono">{p.receiptNo}</p>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs text-slate-400">
                <span>Mode: {p.paymentMode}</span>
                <span>Date: {new Date(p.paymentDate).toLocaleDateString('en-IN')}</span>
                {p.transactionId && <span className="col-span-2">Txn: {p.transactionId}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end mt-4">
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}
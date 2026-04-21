// pages/admin/Employees.jsx
/**
 * EMPLOYEES PAGE
 * APIs Used:
 *   GET    /api/employees               — list with filters
 *   POST   /api/employees               — create (also creates linked User)
 *   PUT    /api/employees/:id           — update profile (syncs name/email to User)
 *   PATCH  /api/employees/:id/status    — change status (syncs User.status)
 *   PATCH  /api/employees/:id/password  — reset password on linked User
 *   DELETE /api/employees/:id           — delete employee + linked User (cascade)
 */
import { useEffect, useState } from 'react';
import { Plus, Search, RefreshCw, Edit2, Trash2, KeyRound } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import {
  PageContent, PageHeader, Card, Table, Button, Input, Select,
  Badge, Modal,
} from '../../components/ui.jsx';

// ─── Constants ───────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: '',          label: 'All Roles'  },
  { value: 'teacher',   label: 'Teacher'    },
  { value: 'principal', label: 'Principal'  },
];

const STATUS_OPTIONS = [
  { value: '',         label: 'All Status' },
  { value: 'active',   label: 'Active'     },
  { value: 'inactive', label: 'Inactive'   },
  { value: 'resigned', label: 'Resigned'   },
];

const GENDER_OPTIONS = [
  { value: 'Male',   label: 'Male'   },
  { value: 'Female', label: 'Female' },
  { value: 'Other',  label: 'Other'  },
];

const MODAL_ROLE_OPTIONS = [
  { value: 'teacher',   label: 'Teacher'   },
  { value: 'principal', label: 'Principal' },
];

function statusColor(s) {
  if (s === 'active')   return 'green';
  if (s === 'inactive') return 'yellow';
  return 'red'; // resigned
}

// ─── Page ────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [employees,    setEmployees]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state — null = closed, 'add' = add form, Employee obj = edit form
  const [modal,        setModal]        = useState(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search', search);
      if (roleFilter)   params.set('role',   roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`${API.EMPLOYEES.BASE}?${params}`);
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, [roleFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this employee? Their login account will also be removed.')) return;
    try {
      await api.delete(API.EMPLOYEES.BY_ID(id));
      fetchEmployees();
    } catch (err) {
      alert(err?.response?.data?.message || err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(API.EMPLOYEES.STATUS(id), { status });
      fetchEmployees();
    } catch (err) {
      alert(err?.response?.data?.message || err.message);
    }
  };

  const columns = [
    { key: 'employeeId', label: 'ID' },
    {
      key: 'name',
      label: 'Employee',
      render: (e) => (
        <div>
          <p className="font-medium text-white">{e.name}</p>
          <p className="text-xs text-slate-500">{e.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (e) => <Badge label={e.role} color="indigo" />,
    },
    { key: 'mobileNo', label: 'Phone' },
    {
      key: 'monthlySalary',
      label: 'Salary',
      render: (e) => (
        <span className="text-emerald-400">₹{e.monthlySalary?.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (e) => <Badge label={e.status} color={statusColor(e.status)} />,
    },
    {
      key: 'actions',
      label: '',
      render: (e) => (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit profile */}
          <Button size="sm" variant="ghost" onClick={() => setModal(e)} title="Edit employee">
            <Edit2 className="w-3 h-3" />
          </Button>

          {/* Change password */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setModal({ ...e, _passwordMode: true })}
            title="Change password"
          >
            <KeyRound className="w-3 h-3" />
          </Button>

          {/* Activate / Deactivate */}
          {e.status === 'active' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleStatusChange(e._id, 'inactive')}
            >
              Deactivate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="success"
              onClick={() => handleStatusChange(e._id, 'active')}
            >
              Activate
            </Button>
          )}

          {/* Mark resigned (only when active/inactive, not already resigned) */}
          {e.status !== 'resigned' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStatusChange(e._id, 'resigned')}
            >
              Resign
            </Button>
          )}

          {/* Delete */}
          <Button size="sm" variant="danger" onClick={() => handleDelete(e._id)} title="Delete employee">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      ),
    },
  ];

  const isModalOpen     = modal !== null;
  const isPasswordModal = modal?._passwordMode === true;
  const editEmployee    = isModalOpen && !isPasswordModal && modal !== 'add' ? modal : null;
  const pwEmployee      = isPasswordModal ? modal : null;

  return (
    <PageContent>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} employee${employees.length !== 1 ? 's' : ''}`}
        actions={
          <Button onClick={() => setModal('add')}>
            <Plus className="w-4 h-4" /> Add Employee
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="pl-9 pr-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEmployees()}
          />
        </div>
        <Select
          options={ROLE_OPTIONS}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-40"
        />
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        />
        <Button variant="ghost" onClick={fetchEmployees} title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <Card className="!p-0">
        <Table
          columns={columns}
          data={employees}
          loading={loading}
          emptyMessage="No employees found"
        />
      </Card>

      {/* Add / Edit modal */}
      <EmployeeModal
        open={isModalOpen && !isPasswordModal}
        onClose={() => setModal(null)}
        employee={editEmployee}
        onSuccess={() => { fetchEmployees(); setModal(null); }}
      />

      {/* Change password modal */}
      <PasswordModal
        open={!!pwEmployee}
        onClose={() => setModal(null)}
        employee={pwEmployee}
        onSuccess={() => setModal(null)}
      />
    </PageContent>
  );
}

// ─── Add / Edit Employee Modal ───────────────────────────────

const EMPTY_FORM = {
  name: '', email: '', password: '', role: 'teacher',
  mobileNo: '', gender: 'Male', dateOfJoining: '',
  monthlySalary: '', education: '', experience: '', homeAddress: '',
};

function EmployeeModal({ open, onClose, employee, onSuccess }) {
  const isEdit = !!employee;
  const [form,   setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (employee) {
      setForm({
        name:          employee.name          || '',
        email:         employee.email         || '',
        password:      '',   // never pre-fill password
        role:          employee.role          || 'teacher',
        mobileNo:      employee.mobileNo      || '',
        gender:        employee.gender        || 'Male',
        dateOfJoining: employee.dateOfJoining
          ? employee.dateOfJoining.split('T')[0]
          : '',
        monthlySalary: employee.monthlySalary || '',
        education:     employee.education     || '',
        experience:    employee.experience    || '',
        homeAddress:   employee.homeAddress   || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [employee, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');

    // Basic validation
    if (!form.name || !form.email || !form.role || !form.mobileNo || !form.dateOfJoining || !form.monthlySalary) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isEdit && !form.password) {
      setError('Password is required when creating an employee.');
      return;
    }
    if (!isEdit && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        // Strip password from update payload — use dedicated endpoint instead
        const { password, ...updatePayload } = form;
        await api.put(API.EMPLOYEES.BY_ID(employee._id), updatePayload);
      } else {
        await api.post(API.EMPLOYEES.BASE, form);
      }
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Employee' : 'Add Employee'}
      width="max-w-2xl"
    >
      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Full Name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Priya Patel"
        />
        <Input
          label="Email *"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="priya@school.com"
        />

        {/* Password only shown on create */}
        {!isEdit && (
          <Input
            label="Password *"
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="Min 6 characters"
          />
        )}

        <Select
          label="Role *"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
          options={MODAL_ROLE_OPTIONS}
        />
        <Input
          label="Mobile No *"
          value={form.mobileNo}
          onChange={(e) => set('mobileNo', e.target.value)}
          placeholder="9999999999"
        />
        <Select
          label="Gender"
          value={form.gender}
          onChange={(e) => set('gender', e.target.value)}
          options={GENDER_OPTIONS}
        />
        <Input
          label="Date of Joining *"
          type="date"
          value={form.dateOfJoining}
          onChange={(e) => set('dateOfJoining', e.target.value)}
        />
        <Input
          label="Monthly Salary *"
          type="number"
          value={form.monthlySalary}
          onChange={(e) => set('monthlySalary', e.target.value)}
          placeholder="25000"
        />
        <Input
          label="Education"
          value={form.education}
          onChange={(e) => set('education', e.target.value)}
          placeholder="B.Ed, M.Sc"
        />
        <Input
          label="Experience"
          value={form.experience}
          onChange={(e) => set('experience', e.target.value)}
          placeholder="5 years"
        />
        <Input
          label="Home Address"
          value={form.homeAddress}
          onChange={(e) => set('homeAddress', e.target.value)}
          placeholder="123, Main St"
          className="col-span-2"
        />
      </div>

      {/* Edit-mode hint about password */}
      {isEdit && (
        <p className="mt-3 text-xs text-slate-500">
          To change this employee's password, use the{' '}
          <KeyRound className="inline w-3 h-3" /> key icon in the table.
        </p>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Update Employee' : 'Create Employee'}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Change Password Modal ───────────────────────────────────

function PasswordModal({ open, onClose, employee, onSuccess }) {
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [open]);

  const handleSubmit = async () => {
    setError('');

    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      await api.patch(API.EMPLOYEES.PASSWORD(employee._id), { password });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change Password"
      width="max-w-md"
    >
      {employee && (
        <p className="mb-4 text-sm text-slate-400">
          Resetting password for{' '}
          <span className="text-white font-medium">{employee.name}</span>
          {' '}({employee.employeeId})
        </p>
      )}

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Input
          label="New Password *"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 6 characters"
        />
        <Input
          label="Confirm Password *"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat new password"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? 'Updating…' : 'Update Password'}
        </Button>
      </div>
    </Modal>
  );
}
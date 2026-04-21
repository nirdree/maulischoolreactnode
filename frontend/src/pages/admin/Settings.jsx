// pages/admin/Settings.jsx
/**
 * SETTINGS PAGE
 * APIs Used:
 *   GET /api/settings  — fetch
 *   PUT /api/settings  — save
 */
import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import api from '../../api/client';
import { API } from '../../api/constants';
import { PageContent, PageHeader, Card, Button, Input } from '../../components/ui.jsx';

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: '', address: '', phone: '', email: '', website: '',
    affiliationNo: '', board: '', lateFinePer: 10, feeDueDay: 10,
    minAttendance: 75, declaration: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(API.SETTINGS.BASE)
      .then(res => {
        if (res.data) setForm({ ...form, ...res.data });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(API.SETTINGS.BASE, form);
      alert('Settings saved!');
    } catch (err) { alert(err.message); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-slate-500">Loading...</div>;

  return (
    <PageContent>
      <PageHeader
        title="School Settings"
        subtitle="Configure school information and system defaults"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">School Information</h3>
          <div className="space-y-3">
            <Input label="School Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sunrise School" />
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Address</label>
              <textarea value={form.address} onChange={e => set('address', e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3} placeholder="School address..." />
            </div>
            <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9999999999" />
            <Input label="Email" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@school.com" />
            <Input label="Website" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://school.com" />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-white mb-4">Academic Information</h3>
          <div className="space-y-3">
            <Input label="Affiliation No" value={form.affiliationNo} onChange={e => set('affiliationNo', e.target.value)} placeholder="CBSE-123456" />
            <Input label="Board" value={form.board} onChange={e => set('board', e.target.value)} placeholder="CBSE / State Board" />
          </div>

          <h3 className="text-sm font-semibold text-white mb-4 mt-6">System Defaults</h3>
          <div className="space-y-3">
            <Input label="Late Fine Per Day (₹)" type="number" value={form.lateFinePer} onChange={e => set('lateFinePer', e.target.value)} />
            <Input label="Fee Due Day (of month)" type="number" value={form.feeDueDay} onChange={e => set('feeDueDay', e.target.value)} />
            <Input label="Min Attendance %" type="number" value={form.minAttendance} onChange={e => set('minAttendance', e.target.value)} />
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">Declaration / Footer Text</h3>
          <textarea value={form.declaration} onChange={e => set('declaration', e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={4} placeholder="Declaration text for result cards..." />
        </Card>
      </div>
    </PageContent>
  );
}
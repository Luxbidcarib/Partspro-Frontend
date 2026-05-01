'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { settings as settingsApi, suppliers as suppliersApi, auth as authApi } from '@/lib/api';
import {
  ArrowLeft, Upload, Plus, Trash2, RefreshCw, CheckCircle,
  XCircle, Clock, Eye, EyeOff, MapPin, Users, Link, Building
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'shop' | 'suppliers' | 'agents' | 'locations'>('shop');
  const [shopSettings, setShopSettings] = useState<any>({});
  const [locations, setLocations] = useState<any[]>([]);
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const agent = JSON.parse(localStorage.getItem('pp_agent') || '{}');
    if (agent.role !== 'admin') { router.push('/dashboard'); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, sup, ag] = await Promise.all([
        settingsApi.get(),
        suppliersApi.list(),
        authApi.getAgents(),
      ]);
      setShopSettings(s.data.settings || {});
      setLocations(s.data.locations || []);
      setSupplierList(sup.data.suppliers || []);
      setAgents(ag.data.agents || []);
    } catch (e) {
      toast.error('Could not load settings');
    } finally {
      setLoading(false);
    }
  }

  async function saveShop() {
    setSaving(true);
    try {
      await settingsApi.update(shopSettings);
      toast.success('Settings saved');
    } catch (e) {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data } = await settingsApi.uploadLogo(file);
      setShopSettings((prev: any) => ({ ...prev, logo_url: data.logo_url }));
      toast.success('Logo updated');
    } catch (e) {
      toast.error('Logo upload failed');
    }
  }

  async function testSupplier(id: string) {
    setSupplierList(prev => prev.map(s => s.id === id ? { ...s, status: 'testing' } : s));
    try {
      await suppliersApi.test(id);
      toast.success('Testing connection...');
      setTimeout(() => loadAll(), 5000); // Re-load after test completes
    } catch (e) {
      toast.error('Test failed');
    }
  }

  async function deleteSupplier(id: string) {
    if (!confirm('Disable this supplier connector?')) return;
    await suppliersApi.delete(id);
    setSupplierList(prev => prev.filter(s => s.id !== id));
    toast.success('Supplier disabled');
  }

  async function createAgent() {
    const name = prompt('Agent name:');
    if (!name) return;
    const pin = prompt('PIN (4-8 digits):');
    if (!pin || pin.length < 4) { toast.error('PIN must be 4-8 digits'); return; }
    const role = confirm('Make admin?') ? 'admin' : 'agent';
    try {
      await authApi.createAgent({ name, pin, role });
      toast.success(`Agent ${name} created`);
      loadAll();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Could not create agent');
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text3)' }}>Loading settings...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          <ArrowLeft size={16} /> Dashboard
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ fontSize: 15, fontWeight: 600 }}>Settings</div>
      </div>

      <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
        {/* Tab nav */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--surface)', borderRadius: 8, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
          {([
            { key: 'shop', label: 'Shop', icon: <Building size={13} /> },
            { key: 'suppliers', label: 'Suppliers', icon: <Link size={13} /> },
            { key: 'agents', label: 'Agents', icon: <Users size={13} /> },
            { key: 'locations', label: 'Locations', icon: <MapPin size={13} /> },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 6, border: 'none',
                background: tab === t.key ? 'var(--surface2)' : 'none',
                color: tab === t.key ? 'var(--text)' : 'var(--text2)',
                fontSize: 13, cursor: 'pointer', fontWeight: tab === t.key ? 500 : 400
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── SHOP TAB */}
        {tab === 'shop' && (
          <div>
            <div className="card">
              <div className="card-title">Shop branding</div>

              {/* Logo upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div onClick={() => logoInputRef.current?.click()}
                  style={{ width: 80, height: 80, borderRadius: 10, border: '2px dashed var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', background: 'var(--surface2)', flexShrink: 0 }}>
                  {shopSettings.logo_url
                    ? <img src={shopSettings.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <Upload size={20} style={{ color: 'var(--text3)' }} />
                  }
                </div>
                <div>
                  <button onClick={() => logoInputRef.current?.click()}
                    style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 6, background: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', marginBottom: 4, display: 'block' }}>
                    {shopSettings.logo_url ? 'Change logo' : 'Upload logo'}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>PNG or JPEG — appears on all quotes</div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={uploadLogo} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Shop name</label>
                  <input value={shopSettings.shop_name || ''} onChange={e => setShopSettings((p: any) => ({ ...p, shop_name: e.target.value }))} placeholder="Your shop name" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Phone</label>
                  <input value={shopSettings.phone || ''} onChange={e => setShopSettings((p: any) => ({ ...p, phone: e.target.value }))} placeholder="+1 (561) 000-0000" />
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Address</label>
                  <input value={shopSettings.address || ''} onChange={e => setShopSettings((p: any) => ({ ...p, address: e.target.value }))} placeholder="Full street address" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Email</label>
                  <input value={shopSettings.email || ''} onChange={e => setShopSettings((p: any) => ({ ...p, email: e.target.value }))} placeholder="info@yourshop.com" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Default pricing</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Default markup %</label>
                  <input type="number" value={shopSettings.default_markup || 30} onChange={e => setShopSettings((p: any) => ({ ...p, default_markup: Number(e.target.value) }))} min={0} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Default tax %</label>
                  <input type="number" value={shopSettings.default_tax || 7} onChange={e => setShopSettings((p: any) => ({ ...p, default_tax: Number(e.target.value) }))} min={0} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Labour rate ($/hr)</label>
                  <input type="number" value={shopSettings.default_labor_rate || 95} onChange={e => setShopSettings((p: any) => ({ ...p, default_labor_rate: Number(e.target.value) }))} min={0} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Quote disclaimer</label>
                <textarea value={shopSettings.quote_disclaimer || ''} onChange={e => setShopSettings((p: any) => ({ ...p, quote_disclaimer: e.target.value }))} rows={2} />
              </div>
            </div>

            <button onClick={saveShop} disabled={saving}
              style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: saving ? 'var(--surface2)' : 'var(--accent)', color: saving ? 'var(--text3)' : '#0d0f12', border: 'none', borderRadius: 8, cursor: saving ? 'wait' : 'pointer' }}>
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        )}

        {/* ── SUPPLIERS TAB */}
        {tab === 'suppliers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Supplier connectors</div>
              <AddSupplierModal onAdd={() => loadAll()} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 8, padding: '10px 14px' }}>
              Add any supplier — paste the URL + credentials. The system fingerprints the site, tests the login, and goes green. Add as many as you need.
            </div>
            {supplierList.map(s => <SupplierRow key={s.id} supplier={s} onTest={() => testSupplier(s.id)} onDelete={() => deleteSupplier(s.id)} onReload={loadAll} />)}
          </div>
        )}

        {/* ── AGENTS TAB */}
        {tab === 'agents' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Agents ({agents.length})</div>
              <button onClick={createAgent}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={14} /> Add agent
              </button>
            </div>
            {agents.map(agent => (
              <div key={agent.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{agent.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    <span className={`badge ${agent.role === 'admin' ? 'badge-accent' : 'badge-gray'}`}>{agent.role}</span>
                    <span style={{ marginLeft: 8 }}>{agent.is_active ? '● Active' : '○ Inactive'}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(agent.created_at).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── LOCATIONS TAB */}
        {tab === 'locations' && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Ship-from locations</div>
            {locations.map(loc => (
              <div key={loc.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{loc.label}</span>
                      <span className={`badge ${loc.type === 'shop' ? 'badge-green' : 'badge-amber'}`}>{loc.type}</span>
                      {loc.is_default && <span className="badge badge-accent">Default</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2)' }}>{loc.address}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>{loc.city}, {loc.state} {loc.zip}</div>
                    {loc.destination_label && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>→ {loc.destination_label}</div>}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>Contact support to add new locations.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Supplier Modal
function AddSupplierModal({ onAdd }: { onAdd: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', login_url: '', requires_login: false, email: '', password: '', type: ['new'] });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.name || !form.url) { toast.error('Name and URL required'); return; }
    setSaving(true);
    try {
      await suppliersApi.create(form);
      toast.success('Connector added — testing connection...');
      setOpen(false);
      setForm({ name: '', url: '', login_url: '', requires_login: false, email: '', password: '', type: ['new'] });
      onAdd();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Could not add supplier');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
      <Plus size={14} /> Add connector
    </button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 20 }}>Add supplier connector</div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Supplier name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Pick-n-Pull" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Website URL *</label>
            <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://www.example.com" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="req-login" checked={form.requires_login} onChange={e => setForm(p => ({ ...p, requires_login: e.target.checked }))} style={{ width: 'auto' }} />
            <label htmlFor="req-login" style={{ fontSize: 13, color: 'var(--text2)', cursor: 'pointer' }}>Requires login</label>
          </div>

          {form.requires_login && (
            <>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Login URL (if different)</label>
                <input value={form.login_url} onChange={e => setForm(p => ({ ...p, login_url: e.target.value }))} placeholder="https://login.example.com" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Email / username</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
                  <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', background: 'rgba(45,212,191,0.06)', borderRadius: 6, padding: '8px 12px' }}>
                🔒 Credentials are encrypted with AES-256-GCM before being stored. Never exposed in browser or logs.
              </div>
            </>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={() => setOpen(false)}
            style={{ flex: 1, padding: 10, border: '1px solid var(--border)', borderRadius: 6, background: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            style={{ flex: 1, padding: 10, background: saving ? 'var(--surface2)' : 'var(--accent)', color: saving ? 'var(--text3)' : '#0d0f12', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
            {saving ? 'Adding...' : 'Add + test connection'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Supplier row with status
function SupplierRow({ supplier: s, onTest, onDelete, onReload }: any) {
  const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    active: { icon: <CheckCircle size={14} />, color: 'var(--green)', label: 'Connected' },
    error: { icon: <XCircle size={14} />, color: 'var(--red)', label: 'Error' },
    testing: { icon: <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />, color: 'var(--amber)', label: 'Testing...' },
    pending: { icon: <Clock size={14} />, color: 'var(--text3)', label: 'Not tested' },
    disabled: { icon: <XCircle size={14} />, color: 'var(--text3)', label: 'Disabled' },
  };

  const cfg = statusConfig[s.status] || statusConfig.pending;

  return (
    <div className="card" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: cfg.color, fontSize: 12 }}>
              {cfg.icon} {cfg.label}
            </div>
            {s.requires_login && <span className="badge badge-purple" style={{ fontSize: 10 }}>Login</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>{s.url}</div>
          {s.last_test_result && (
            <div style={{ fontSize: 11, color: s.status === 'active' ? 'var(--green)' : 'var(--text3)', marginTop: 4 }}>{s.last_test_result}</div>
          )}
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {(s.type || []).map((t: string) => <span key={t} className="badge badge-gray" style={{ fontSize: 10 }}>{t}</span>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onTest}
            style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'none', color: 'var(--text2)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <RefreshCw size={11} /> Test
          </button>
          <button onClick={onDelete}
            style={{ padding: '6px 10px', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, background: 'none', color: 'var(--red)', fontSize: 11, cursor: 'pointer' }}>
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

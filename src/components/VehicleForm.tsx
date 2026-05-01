'use client';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  job: any;
  onSave: (data: any) => Promise<void>;
}

export default function VehicleForm({ job, onSave }: Props) {
  const [decoding, setDecoding] = useState(false);
  const [form, setForm] = useState({
    vin: job.vin || '',
    year: job.year || '',
    make: job.make || '',
    model: job.model || '',
    trim: job.trim || '',
    engine: job.engine || '',
    mileage: job.mileage || '',
    color: job.color || '',
    customer_name: job.customer_name || '',
    customer_phone: job.customer_phone || '',
    customer_email: job.customer_email || '',
  });

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function decodeVIN() {
    if (!form.vin || form.vin.length < 11) { toast.error('Enter a valid VIN (17 characters)'); return; }
    setDecoding(true);
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${form.vin}?format=json`);
      const data = await res.json();
      const get = (v: string) => { const r = data.Results?.find((x: any) => x.Variable === v); return r?.Value && r.Value !== 'Not Applicable' ? r.Value : ''; };
      const yr = get('Model Year'), mk = get('Make'), mo = get('Model'), tr = get('Trim');
      const disp = get('Displacement (L)'), conf = get('Engine Configuration'), fuel = get('Fuel Type - Primary');
      const eng = [disp ? disp + 'L' : '', conf, fuel].filter(Boolean).join(' ');
      const updates: any = {};
      if (yr) updates.year = parseInt(yr);
      if (mk) updates.make = mk.charAt(0) + mk.slice(1).toLowerCase();
      if (mo) updates.model = mo;
      if (tr || eng) updates.trim = [tr, eng].filter(Boolean).join(' — ');
      setForm(prev => ({ ...prev, ...updates }));
      await onSave({ ...form, ...updates, vin: form.vin });
      toast.success('VIN decoded successfully');
    } catch (e) {
      toast.error('Could not decode VIN');
    } finally {
      setDecoding(false);
    }
  }

  async function handleBlur() {
    await onSave(form);
  }

  return (
    <div className="card">
      <div className="card-title">Vehicle information</div>

      {/* Customer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Customer name</label>
          <input value={form.customer_name} onChange={e => set('customer_name', e.target.value)} onBlur={handleBlur} placeholder="Customer name" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Phone</label>
          <input value={form.customer_phone} onChange={e => set('customer_phone', e.target.value)} onBlur={handleBlur} placeholder="Phone number" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Email</label>
          <input value={form.customer_email} onChange={e => set('customer_email', e.target.value)} onBlur={handleBlur} placeholder="Email" />
        </div>
      </div>

      {/* VIN */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={form.vin}
          onChange={e => set('vin', e.target.value.toUpperCase())}
          onBlur={handleBlur}
          placeholder="VIN — paste to auto-fill"
          maxLength={17}
          style={{ fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', flex: 1 }}
        />
        <button onClick={decodeVIN} disabled={decoding}
          style={{ padding: '9px 16px', background: decoding ? 'var(--surface2)' : 'var(--accent)', color: decoding ? 'var(--text3)' : '#0d0f12', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: decoding ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
          {decoding ? 'Decoding...' : 'Decode VIN'}
        </button>
      </div>

      {/* Vehicle fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Year</label>
          <input value={form.year} onChange={e => set('year', e.target.value)} onBlur={handleBlur} placeholder="2021" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Make</label>
          <input value={form.make} onChange={e => set('make', e.target.value)} onBlur={handleBlur} placeholder="Honda" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Model</label>
          <input value={form.model} onChange={e => set('model', e.target.value)} onBlur={handleBlur} placeholder="Pilot" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Trim / engine</label>
          <input value={form.trim} onChange={e => set('trim', e.target.value)} onBlur={handleBlur} placeholder="EX-L 3.5L V6" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Mileage</label>
          <input value={form.mileage} onChange={e => set('mileage', e.target.value)} onBlur={handleBlur} placeholder="85,000" type="number" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Color</label>
          <input value={form.color} onChange={e => set('color', e.target.value)} onBlur={handleBlur} placeholder="Silver" />
        </div>
      </div>
    </div>
  );
}

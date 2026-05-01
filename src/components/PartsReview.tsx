'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { parts as partsApi } from '@/lib/api';
import { CheckCircle, XCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const DAMAGE_CAT_CONFIG: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed damaged', color: 'badge-red' },
  likely: { label: 'Likely affected', color: 'badge-amber' },
  inspect: { label: 'Inspect before ordering', color: 'badge-blue' },
  recommended: { label: 'Recommended', color: 'badge-gray' },
};

interface Props {
  job: any;
  onApprove: () => void;
  onRefresh: () => void;
}

export default function PartsReview({ job, onApprove, onRefresh }: Props) {
  const [partsList, setPartsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => { loadParts(); }, [job.id]);

  async function loadParts() {
    setLoading(true);
    try {
      const { data } = await partsApi.list(job.id);
      setPartsList(data.parts || []);
    } catch (e) {
      toast.error('Could not load parts');
    } finally {
      setLoading(false);
    }
  }

  async function togglePart(partId: string, approved: boolean) {
    await partsApi.update(partId, { status: approved ? 'pending' : 'cancelled' });
    setPartsList(prev => prev.map(p => p.id === partId ? { ...p, status: approved ? 'pending' : 'cancelled' } : p));
  }

  async function addPart() {
    const name = prompt('Part name:');
    if (!name) return;
    const { data } = await partsApi.create({ job_id: job.id, name, status: 'pending', damage_category: 'confirmed', confidence: 'high', detection_source: 'manual' });
    setPartsList(prev => [...prev, data.part]);
  }

  async function approveAll() {
    const active = partsList.filter(p => p.status !== 'cancelled');
    await partsApi.bulkUpdate(active.map(p => p.id), { status: 'approved' });
    toast.success('Parts approved — starting sourcing');
    onApprove();
  }

  const grouped = ['confirmed', 'likely', 'inspect', 'recommended'].reduce((acc, cat) => {
    acc[cat] = partsList.filter(p => p.damage_category === cat);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading parts...</div>;

  const activeCount = partsList.filter(p => p.status !== 'cancelled').length;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>AI detected parts</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addPart}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 6, background: 'none', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
              <Plus size={13} /> Add part
            </button>
          </div>
        </div>

        {partsList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
            No parts detected yet. Go back to damage step and run AI detection.
          </div>
        ) : (
          Object.entries(grouped).map(([cat, catParts]) => {
            if (!catParts.length) return null;
            const cfg = DAMAGE_CAT_CONFIG[cat];
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${cfg.color}`}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{catParts.length} part{catParts.length > 1 ? 's' : ''}</span>
                </div>
                {catParts.map(part => (
                  <div key={part.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
                    background: part.status === 'cancelled' ? 'rgba(239,68,68,0.04)' : 'var(--surface2)',
                    borderRadius: 8, marginBottom: 6, opacity: part.status === 'cancelled' ? 0.5 : 1,
                    border: '1px solid var(--border)', transition: 'opacity .15s'
                  }}>
                    <button onClick={() => togglePart(part.id, part.status === 'cancelled')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1, flexShrink: 0 }}>
                      {part.status === 'cancelled'
                        ? <XCircle size={18} style={{ color: 'var(--red)' }} />
                        : <CheckCircle size={18} style={{ color: 'var(--green)' }} />
                      }
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{part.name}</span>
                        {part.side && part.side !== 'n/a' && <span className="badge badge-gray">{part.side}</span>}
                        {part.oem_number && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>#{part.oem_number}</span>}
                      </div>
                      {part.confidence_notes && (
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{part.confidence_notes}</div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: part.confidence === 'high' ? 'var(--green)' : part.confidence === 'medium' ? 'var(--amber)' : 'var(--red)' }}>
                          {part.confidence === 'high' ? '✅' : part.confidence === 'medium' ? '⚠️' : '❓'} {part.confidence} confidence
                        </span>
                        {part.used_est > 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Used ~${part.used_est}</span>}
                        {part.aftermarket_est > 0 && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Aftermkt ~${part.aftermarket_est}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {activeCount > 0 && (
        <button onClick={approveAll}
          style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Approve {activeCount} parts + start sourcing →
        </button>
      )}
    </div>
  );
}

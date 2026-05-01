'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { calls as callsApi } from '@/lib/api';
import { Phone, Trash2, PlayCircle, StopCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  job: any;
  onProceed: () => void;
  onRefresh: () => void;
}

export default function CallQueue({ job, onProceed, onRefresh }: Props) {
  const [queue, setQueue] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [calling, setCalling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logLines, setLogLines] = useState<{ text: string; cls: string }[]>([]);

  useEffect(() => {
    loadQueue();
    const poll = setInterval(pollResults, 4000);
    return () => clearInterval(poll);
  }, [job.id]);

  async function loadQueue() {
    setLoading(true);
    try {
      const { data } = await callsApi.getQueue(job.id);
      setQueue(data.queue || []);
    } catch (e) {
      toast.error('Could not load call queue');
    } finally {
      setLoading(false);
    }
  }

  async function pollResults() {
    try {
      const { data } = await callsApi.getResults(job.id);
      if (data.results?.length) setResults(data.results);
    } catch (e) {}
  }

  async function removeFromQueue(id: string) {
    await callsApi.removeFromQueue(id);
    setQueue(prev => prev.filter(q => q.id !== id));
  }

  async function startQueue() {
    if (!queue.length) { toast.error('Queue is empty'); return; }
    setCalling(true);
    setLogLines([{ text: `Starting call queue — ${queue.length} yards`, cls: 'sys' }]);
    try {
      await callsApi.startQueue(job.id);
      toast.success('AI call queue started');
      // Poll for updates
      const poll = setInterval(async () => {
        const { data } = await callsApi.getResults(job.id);
        if (data.results) {
          setResults(data.results);
          const completed = data.results.filter((r: any) => r.status === 'completed');
          const pending = data.results.filter((r: any) => r.status === 'pending' || r.status === 'calling');
          if (pending.length === 0) { setCalling(false); clearInterval(poll); }
          // Add log lines for new completions
          completed.forEach((r: any) => {
            setLogLines(prev => {
              const exists = prev.find(l => l.text.includes(r.yard_name) && l.cls === 'done');
              if (exists) return prev;
              const cls = r.in_stock ? 'done' : 'fail';
              const txt = r.in_stock
                ? `✓ ${r.yard_name}: $${r.negotiated_price || r.quoted_price} negotiated${r.photos_promised ? ' · Photos promised' : ''}`
                : `✗ ${r.yard_name}: Part not available`;
              return [...prev, { text: txt, cls }];
            });
          });
        }
      }, 3000);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to start queue');
      setCalling(false);
    }
  }

  const availableResults = results.filter(r => r.in_stock && r.status === 'completed');
  const completedCount = results.filter(r => r.status === 'completed').length;
  const pendingCount = queue.filter(q => q.status === 'pending').length;

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading queue...</div>;

  return (
    <div>
      {/* Queue list */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="card-title" style={{ margin: 0 }}>Call queue ({queue.length} yards)</div>
          {!calling && (
            <button onClick={startQueue} disabled={!queue.length}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: queue.length ? 'var(--green)' : 'var(--surface2)', color: queue.length ? '#0d0f12' : 'var(--text3)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: queue.length ? 'pointer' : 'default' }}>
              <PlayCircle size={15} /> Start AI calls
            </button>
          )}
          {calling && (
            <button onClick={() => setCalling(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
              <StopCircle size={15} /> Stop
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>
            No yards in queue. Go back to sourcing and add yards to call.
          </div>
        ) : (
          queue.map((item, i) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < queue.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text3)', minWidth: 20 }}>{i + 1}.</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.yard_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {item.phone} · {item.part_name}
                  {item.listed_price && <span style={{ color: 'var(--green)', marginLeft: 6 }}>${item.listed_price}</span>}
                </div>
              </div>
              <div>
                {item.status === 'pending' && <span className="badge badge-gray"><Clock size={10} style={{ marginRight: 3 }} />Pending</span>}
                {item.status === 'calling' && <span className="badge badge-blue">Calling...</span>}
                {item.status === 'completed' && item.in_stock && <span className="badge badge-green"><CheckCircle size={10} style={{ marginRight: 3 }} />Done</span>}
                {item.status === 'completed' && !item.in_stock && <span className="badge badge-red"><XCircle size={10} style={{ marginRight: 3 }} />N/A</span>}
              </div>
              {item.status === 'pending' && (
                <button onClick={() => removeFromQueue(item.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Live call log */}
      {(calling || logLines.length > 0) && (
        <div className="card">
          <div className="card-title">Live call log</div>
          {calling && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13, color: 'var(--accent)' }}>
              <div className="dot-pulse"><span/><span/><span/></div>
              AI calling yards...
            </div>
          )}
          <div className="vlog">
            {logLines.map((l, i) => (
              <div key={i} className={l.cls}>{l.text}</div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.filter(r => r.status === 'completed').length > 0 && (
        <div className="card">
          <div className="card-title">Call results</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Yard', 'Part', 'Listed', 'Negotiated', 'Photos', 'Action'].map(h => (
                  <th key={h} style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.filter(r => r.status === 'completed').map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 8px', color: 'var(--text)' }}>{r.yard_name}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--text2)' }}>{r.part_name || r.parts?.name}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--text2)' }}>{r.quoted_price ? `$${r.quoted_price}` : '—'}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: r.in_stock ? 'var(--green)' : 'var(--text3)' }}>
                    {r.in_stock ? (r.negotiated_price ? `$${r.negotiated_price}` : '—') : 'Not available'}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    {r.photos_promised ? <span className="badge badge-green">Promised</span> : <span className="badge badge-gray">No</span>}
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span className={`badge ${r.recommended_action === 'buy' ? 'badge-green' : r.recommended_action === 'wait_photos' ? 'badge-amber' : 'badge-gray'}`}>
                      {r.recommended_action?.replace('_', ' ') || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Proceed */}
      {availableResults.length > 0 && !calling && (
        <button onClick={onProceed}
          style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 8 }}>
          Generate quote with {availableResults.length} sourced part{availableResults.length > 1 ? 's' : ''} →
        </button>
      )}
    </div>
  );
}

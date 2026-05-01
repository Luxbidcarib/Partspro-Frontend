'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { sourcing, calls as callsApi } from '@/lib/api';
import { ExternalLink, Phone, Star, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  job: any;
  onProceed: () => void;
  onRefresh: () => void;
}

export default function SourcingResults({ job, onProceed, onRefresh }: Props) {
  const [results, setResults] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({ pct: 0, complete: false });
  const [loading, setLoading] = useState(true);
  const [expandedPart, setExpandedPart] = useState<string | null>(null);
  useState<string[]>([]);

  useEffect(() => {
    loadResults();
    const poll = setInterval(pollStatus, 3000);
    return () => clearInterval(poll);
  }, [job.id]);

  async function loadResults() {
    try {
      const { data } = await sourcing.getResults(job.id);
      setResults(data.results || []);
    } catch (e) {} finally { setLoading(false); }
  }

  async function pollStatus() {
    try {
      const { data } = await sourcing.getStatus(job.id);
      setStatus(data);
      if (data.done > 0) loadResults();
    } catch (e) {}
  }

  async function addToQueue(resultId: string) {
    try {
      await callsApi.addToQueue(job.id, resultId);
      setQueuedIds(prev => new Set([...prev, resultId]));
      toast.success('Added to call queue');
    } catch (e: any) {
      if (e.response?.status === 409) toast.error('Already in queue');
      else toast.error('Could not add to queue');
    }
  }

  // Group by part
  const byPart: Record<string, any[]> = {};
  results.forEach(r => {
    const key = r.parts?.name || r.part_id;
    if (!byPart[key]) byPart[key] = [];
    byPart[key].push(r);
  });

  const queueCount = queuedIds.size;

  return (
    <div>
      {/* Progress */}
      {!status.complete && (
        <div className="card">
          <div className="card-title">Searching suppliers...</div>
          <div style={{ background: 'var(--surface2)', borderRadius: 4, height: 6, marginBottom: 8 }}>
            <div style={{ background: 'var(--accent)', height: 6, borderRadius: 4, width: `${status.pct}%`, transition: 'width .5s' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{status.done || 0} of {status.total || '?'} suppliers searched • {status.pct || 0}%</div>
        </div>
      )}

      {/* Smart buy recommendation */}
      {results.length > 0 && (
        <div className="card" style={{ background: 'rgba(45,212,191,0.04)', borderColor: 'rgba(45,212,191,0.2)' }}>
          <div className="card-title" style={{ color: 'var(--accent)' }}>Smart buy recommendation</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
            Review results below and add yards to the call queue. AI will call each yard, confirm availability, negotiate price, and request photos. Best prices auto-populate into your quote.
          </div>
        </div>
      )}

      {/* Results by part */}
      {Object.entries(byPart).map(([partName, partResults]) => {
        const sorted = partResults.sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
        const best = sorted.find(r => r.listed_price);
        const isExpanded = expandedPart === partName;

        return (
          <div key={partName} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isExpanded ? 14 : 0 }}
              onClick={() => setExpandedPart(isExpanded ? null : partName)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{partName}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {sorted.length} results
                  {best?.listed_price && <span style={{ color: 'var(--green)', marginLeft: 8 }}>From ${best.listed_price}</span>}
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)' }} />}
            </div>

            {isExpanded && (
              <div>
                {sorted.map((r, i) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px',
                    background: 'var(--surface2)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)'
                  }}>
                    {/* Score */}
                    <div style={{ textAlign: 'center', minWidth: 36 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: i === 0 ? 'var(--accent)' : 'var(--text2)', fontFamily: 'DM Mono, monospace' }}>{r.confidence_score}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>score</div>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.yard_name || r.supplier_name}</span>
                        {i === 0 && <span className="badge badge-accent" style={{ fontSize: 10 }}>⭐ Best match</span>}
                        {r.grade && <span className="badge badge-gray">Grade {r.grade}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text2)' }}>
                        {r.listed_price && <span style={{ color: 'var(--green)', fontWeight: 600 }}>${r.listed_price}</span>}
                        {r.distance_miles && <span>{r.distance_miles} miles</span>}
                        {r.mileage && <span>{r.mileage.toLocaleString()} mi on part</span>}
                        {r.warranty && <span>Warranty: {r.warranty}</span>}
                        {r.phone && <span style={{ color: 'var(--accent2)' }}>{r.phone}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => addToQueue(r.id)}
                        disabled={queuedIds.has(r.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                          background: queuedIds.has(r.id) ? 'rgba(34,197,94,0.1)' : 'none',
                          color: queuedIds.has(r.id) ? 'var(--green)' : 'var(--text2)',
                          border: `1px solid ${queuedIds.has(r.id) ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                          borderRadius: 6, fontSize: 11, cursor: queuedIds.has(r.id) ? 'default' : 'pointer', whiteSpace: 'nowrap'
                        }}>
                        <Phone size={11} />{queuedIds.has(r.id) ? 'Queued' : '+ Queue'}
                      </button>
                      {r.listing_url && (
                        <a href={r.listing_url} target="_blank" rel="noopener"
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text2)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          <ExternalLink size={11} /> View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Searching suppliers...</div>
      )}

      {/* Proceed */}
      {queueCount > 0 && (
        <button onClick={onProceed}
          style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 8 }}>
          Proceed to call queue ({queueCount} yards queued) →
        </button>
      )}
    </div>
  );
}

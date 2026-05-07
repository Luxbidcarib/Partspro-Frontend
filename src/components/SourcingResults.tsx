'use client';
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { sourcing, calls as callsApi, parts as partsApi } from '@/lib/api';
import { ExternalLink, Phone, Star, ChevronDown, ChevronUp, CheckCircle, ShoppingCart } from 'lucide-react';

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
  const [queuedIds, setQueuedIds] = useState<string[]>([]);
  const [selectedForQuote, setSelectedForQuote] = useState<string[]>([]);

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
      setQueuedIds(prev => [...prev, resultId]);
      toast.success('Added to call queue');
    } catch (e: any) {
      if (e.response?.status === 409) toast.error('Already in queue');
      else toast.error('Could not add to queue');
    }
  }

  function selectForQuote(resultId: string) {
    setSelectedForQuote(prev =>
      prev.includes(resultId) ? prev.filter(id => id !== resultId) : [...prev, resultId]
    );
  }

  async function proceedToQuote() {
    // Update selected parts with their chosen supplier prices
    for (const resultId of selectedForQuote) {
      const result = results.find(r => r.id === resultId);
      if (result && result.listed_price) {
        try {
          await partsApi.selectSupplier(result.part_id, {
            supplier_result_id: resultId,
            cost_price: result.listed_price,
            sell_price: Math.round(result.listed_price * 1.35 * 100) / 100 // 35% markup default
          });
        } catch (e) {}
      }
    }
    toast.success('Prices locked in — building quote');
    onRefresh();
    onProceed();
  }

  // Group by part
  const byPart: Record<string, any[]> = {};
  results.forEach(r => {
    const key = r.parts?.name || r.part_id;
    if (!byPart[key]) byPart[key] = [];
    byPart[key].push(r);
  });

  // Separate priced online vs needs-call
  const totalPriced = results.filter(r => r.has_price && !r.is_search_url).length;
  const totalNeedsCall = results.filter(r => r.needs_call).length;
  const queueCount = queuedIds.length;
  const quoteCount = selectedForQuote.length;

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
            {totalPriced > 0 && <span style={{ display: 'block', marginBottom: 4 }}>✅ <strong>{totalPriced}</strong> results with prices from online suppliers — select the best for each part and proceed to quote.</span>}
            {totalNeedsCall > 0 && <span style={{ display: 'block' }}>📞 <strong>{totalNeedsCall}</strong> used parts yards found — add to call queue for AI negotiation.</span>}
            {totalPriced > 0 && totalNeedsCall === 0 && <span style={{ display: 'block', marginTop: 4 }}>All parts have online prices. Select your preferred options and build the quote.</span>}
          </div>
        </div>
      )}

      {/* Results by part */}
      {Object.entries(byPart).map(([partName, partResults]) => {
        // Split into priced and search-only
        const priced = partResults.filter(r => r.has_price && !r.is_search_url).sort((a, b) => (a.listed_price || 999999) - (b.listed_price || 999999));
        const callable = partResults.filter(r => r.needs_call);
        const searchLinks = partResults.filter(r => r.is_search_url && !r.needs_call);
        const bestPrice = priced[0]?.listed_price;
        const isExpanded = expandedPart === partName;

        return (
          <div key={partName} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: isExpanded ? 14 : 0 }}
              onClick={() => setExpandedPart(isExpanded ? null : partName)}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{partName}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {priced.length > 0 && <span>{priced.length} priced</span>}
                  {callable.length > 0 && <span>{priced.length > 0 ? ' • ' : ''}{callable.length} yards</span>}
                  {searchLinks.length > 0 && <span> • {searchLinks.length} search links</span>}
                  {bestPrice && <span style={{ color: 'var(--green)', marginLeft: 8, fontWeight: 600 }}>From ${bestPrice}</span>}
                </div>
              </div>
              {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text3)' }} />}
            </div>

            {isExpanded && (
              <div>
                {/* PRICED RESULTS — select for quote */}
                {priced.length > 0 && (
                  <div style={{ marginBottom: callable.length > 0 ? 16 : 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Online prices — select for quote
                    </div>
                    {priced.map((r, i) => {
                      const isSelected = selectedForQuote.includes(r.id);
                      return (
                        <div key={r.id} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px',
                          background: isSelected ? 'rgba(45,212,191,0.06)' : 'var(--surface2)',
                          borderRadius: 8, marginBottom: 6,
                          border: `1px solid ${isSelected ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`,
                          transition: 'all .15s'
                        }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.yard_name || r.supplier_name}</span>
                              {i === 0 && <span className="badge badge-accent" style={{ fontSize: 10 }}>💰 Lowest</span>}
                            </div>
                            {r.listing_title && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{r.listing_title}</div>}
                            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                              <span style={{ color: 'var(--green)', fontWeight: 700, fontSize: 14 }}>${r.listed_price}</span>
                              {r.shipping_cost !== null && <span style={{ color: 'var(--text3)' }}>+${r.shipping_cost} ship</span>}
                              {r.condition && <span style={{ color: 'var(--text3)' }}>{r.condition}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                            <button onClick={(e) => { e.stopPropagation(); selectForQuote(r.id); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                                background: isSelected ? 'rgba(45,212,191,0.15)' : 'none',
                                color: isSelected ? 'var(--accent)' : 'var(--text2)',
                                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                                borderRadius: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: isSelected ? 600 : 400
                              }}>
                              {isSelected ? <><CheckCircle size={11} /> Selected</> : <><ShoppingCart size={11} /> Select</>}
                            </button>
                            {r.listing_url && !r.listing_url.includes('scraperapi') && (
                              <a href={r.listing_url} target="_blank" rel="noopener"
                                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text2)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                <ExternalLink size={11} /> View
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* CALL QUEUE RESULTS — yards to call */}
                {callable.length > 0 && (
                  <div style={{ marginBottom: searchLinks.length > 0 ? 16 : 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Used parts yards — add to call queue
                    </div>
                    {callable.map(r => (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px',
                        background: 'var(--surface2)', borderRadius: 8, marginBottom: 6, border: '1px solid var(--border)'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.yard_name || 'Unknown Yard'}</span>
                            {r.grade && <span className="badge badge-gray">Grade {r.grade}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text2)' }}>
                            {r.listed_price && <span style={{ color: 'var(--green)', fontWeight: 600 }}>${r.listed_price}</span>}
                            {r.distance_miles && <span>{r.distance_miles} mi</span>}
                            {r.phone && <span style={{ color: 'var(--accent2)' }}>{r.phone}</span>}
                            {r.notes && <span style={{ color: 'var(--text3)' }}>{r.notes}</span>}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); addToQueue(r.id); }}
                          disabled={queuedIds.includes(r.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
                            background: queuedIds.includes(r.id) ? 'rgba(34,197,94,0.1)' : 'none',
                            color: queuedIds.includes(r.id) ? 'var(--green)' : 'var(--text2)',
                            border: `1px solid ${queuedIds.includes(r.id) ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                            borderRadius: 6, fontSize: 11, cursor: queuedIds.includes(r.id) ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0
                          }}>
                          <Phone size={11} />{queuedIds.includes(r.id) ? 'Queued' : '+ Queue'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* SEARCH LINKS — manual check */}
                {searchLinks.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Additional search links
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {searchLinks.map(r => (
                        <a key={r.id} href={r.listing_url} target="_blank" rel="noopener"
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text3)', textDecoration: 'none' }}>
                          <ExternalLink size={10} /> {r.yard_name || r.supplier_name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {loading && results.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Searching suppliers...</div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {quoteCount > 0 && (
          <button onClick={proceedToQuote}
            style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Build quote with {quoteCount} selected prices →
          </button>
        )}
        {queueCount > 0 && (
          <button onClick={onProceed}
            style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: queueCount > 0 && quoteCount === 0 ? 'var(--accent)' : 'var(--surface2)', color: queueCount > 0 && quoteCount === 0 ? '#0d0f12' : 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
            Proceed to call queue ({queueCount} yards) →
          </button>
        )}
      </div>
    </div>
  );
}

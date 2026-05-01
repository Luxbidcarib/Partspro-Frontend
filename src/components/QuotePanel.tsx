'use client';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { quotes as quotesApi, parts as partsApi } from '@/lib/api';
import { Copy, Check, MessageCircle } from 'lucide-react';

interface Props {
  job: any;
  onRefresh: () => void;
}

export default function QuotePanel({ job, onRefresh }: Props) {
  const [quote, setQuote] = useState<any>(null);
  const [parts, setParts] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [markup, setMarkup] = useState(job.markup_pct || 30);
  const [tax, setTax] = useState(job.tax_pct || 7);
  const [laborHrs, setLaborHrs] = useState(job.labor_hours || 0);
  const [laborRate, setLaborRate] = useState(job.labor_rate || 95);
  const [shipping, setShipping] = useState(job.shipping_total || 0);

  useEffect(() => {
    if (job.quotes?.length > 0) loadQuote(job.quotes[0].id);
    loadParts();
  }, [job.id]);

  async function loadParts() {
    const { data } = await partsApi.list(job.id);
    setParts((data.parts || []).filter((p: any) => p.status === 'approved'));
  }

  async function loadQuote(id: string) {
    try {
      const { data } = await quotesApi.get(id);
      setQuote(data.quote);
      setSettings(data.settings);
      setParts(data.parts || []);
    } catch (e) {}
  }

  async function generateQuote() {
    setGenerating(true);
    try {
      const { data } = await quotesApi.generate(job.id);
      setQuote(data.quote);
      toast.success('Quote generated');
      onRefresh();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Could not generate quote');
    } finally {
      setGenerating(false);
    }
  }

  async function copyQuote() {
    if (!quote) return;
    try {
      const { data } = await quotesApi.getText(quote.id);
      await navigator.clipboard.writeText(data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Quote copied to clipboard');
    } catch (e) {
      toast.error('Could not copy quote');
    }
  }

  const vehicle = [job.year, job.make, job.model, job.trim].filter(Boolean).join(' ');
  const partsCost = parts.reduce((s, p) => s + (p.cost_price || 0), 0);
  const markupAmt = Math.round(partsCost * markup / 100);
  const partsTotal = partsCost + markupAmt;
  const taxAmt = Math.round(partsTotal * tax / 100);
  const laborTotal = Math.round(laborHrs * laborRate);
  const grandTotal = partsTotal + taxAmt + laborTotal + Number(shipping);

  return (
    <div>
      {/* Job summary */}
      <div className="card">
        <div className="card-title">Quote summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Customer</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{job.customer_name || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Vehicle</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{vehicle || '—'}</div>
          </div>
          {job.vin && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>VIN</div>
              <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{job.vin}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Damage areas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(job.damage_tags || []).map((t: string) => <span key={t} className="badge badge-amber" style={{ fontSize: 10 }}>{t}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Parts */}
      <div className="card">
        <div className="card-title">Parts ({parts.length})</div>
        {parts.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
            <div>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{p.name}</span>
              {p.side && p.side !== 'n/a' && <span style={{ color: 'var(--text3)', marginLeft: 6, fontSize: 11 }}>({p.side})</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, color: 'var(--text2)' }}>
              {p.cost_price && <span>Cost: ${p.cost_price}</span>}
              {p.sell_price && <span style={{ color: 'var(--text)' }}>Sell: ${p.sell_price}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Pricing */}
      <div className="card">
        <div className="card-title">Pricing</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span>Markup %</span><span style={{ color: 'var(--accent)' }}>{markup}%</span>
            </label>
            <input type="range" value={markup} onChange={e => setMarkup(Number(e.target.value))} min={0} max={150} step={5} style={{ padding: 0, background: 'transparent', border: 'none', accentColor: 'var(--accent)' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Tax %</label>
            <input type="number" value={tax} onChange={e => setTax(Number(e.target.value))} min={0} max={20} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Labour hours</label>
            <input type="number" value={laborHrs} onChange={e => setLaborHrs(Number(e.target.value))} min={0} step={0.5} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Labour rate ($/hr)</label>
            <input type="number" value={laborRate} onChange={e => setLaborRate(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>Shipping total $</label>
            <input type="number" value={shipping} onChange={e => setShipping(Number(e.target.value))} min={0} />
          </div>
        </div>

        {/* Total breakdown */}
        <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--border)' }}>
          {[
            { label: 'Parts cost (your cost)', val: `$${partsCost.toLocaleString()}` },
            { label: `Markup (${markup}%)`, val: `$${markupAmt.toLocaleString()}` },
            { label: 'Parts subtotal', val: `$${partsTotal.toLocaleString()}` },
            { label: `Tax (${tax}%)`, val: `$${taxAmt.toLocaleString()}` },
            { label: `Shipping`, val: `$${Number(shipping).toLocaleString()}` },
            { label: `Labour (${laborHrs}h @ $${laborRate}/hr)`, val: `$${laborTotal.toLocaleString()}` },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>
              <span>{row.label}</span><span>{row.val}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700, color: 'var(--accent)', borderTop: '1px solid var(--border)', paddingTop: 10, marginTop: 6 }}>
            <span>TOTAL</span><span>${grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <button onClick={generateQuote} disabled={generating}
          style={{ padding: 11, fontSize: 14, fontWeight: 600, background: generating ? 'var(--surface2)' : 'var(--accent)', color: generating ? 'var(--text3)' : '#0d0f12', border: 'none', borderRadius: 8, cursor: generating ? 'wait' : 'pointer' }}>
          {generating ? 'Generating...' : quote ? 'Regenerate quote' : 'Generate quote'}
        </button>
        {quote && (
          <button onClick={copyQuote}
            style={{ padding: 11, fontSize: 14, fontWeight: 600, background: 'rgba(34,197,94,0.15)', color: 'var(--green)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy for WhatsApp/email</>}
          </button>
        )}
      </div>
    </div>
  );
}

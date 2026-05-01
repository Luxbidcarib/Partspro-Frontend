'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { jobs, parts as partsApi, sourcing, calls as callsApi, quotes as quotesApi } from '@/lib/api';
import { ArrowLeft, Upload, Zap, Search, Phone, FileText, CheckCircle } from 'lucide-react';
import VehicleForm from '@/components/VehicleForm';
import MediaUpload from '@/components/MediaUpload';
import DamageTags from '@/components/DamageTags';
import PartsReview from '@/components/PartsReview';
import SourcingResults from '@/components/SourcingResults';
import CallQueue from '@/components/CallQueue';
import QuotePanel from '@/components/QuotePanel';

const STEPS = [
  { key: 'vehicle', label: 'Vehicle', icon: <Upload size={13} /> },
  { key: 'damage', label: 'Damage', icon: <Zap size={13} /> },
  { key: 'parts', label: 'Parts', icon: <FileText size={13} /> },
  { key: 'sourcing', label: 'Sourcing', icon: <Search size={13} /> },
  { key: 'calls', label: 'Calls', icon: <Phone size={13} /> },
  { key: 'quote', label: 'Quote', icon: <CheckCircle size={13} /> },
];

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [activeStep, setActiveStep] = useState('vehicle');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  async function loadJob() {
    setLoading(true);
    try {
      const { data } = await jobs.get(id);
      setJob(data.job);
      // Auto-advance to appropriate step
      const s = data.job.status;
      if (s === 'parts_review' || s === 'sourcing') setActiveStep('parts');
      else if (s === 'calling') setActiveStep('calls');
      else if (s === 'quoted' || s === 'quoting') setActiveStep('quote');
    } catch (e) {
      toast.error('Job not found');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function saveJob(updates: any) {
    setSaving(true);
    try {
      const { data } = await jobs.update(id, updates);
      setJob((prev: any) => ({ ...prev, ...data.job }));
    } catch (e) {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function detectParts() {
    setDetecting(true);
    try {
      const { data } = await jobs.detectParts(id);
      toast.success(`${data.count} parts detected`);
      setActiveStep('parts');
      loadJob();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Detection failed');
    } finally {
      setDetecting(false);
    }
  }

  async function startSourcing() {
    try {
      await sourcing.start(id);
      toast.success('Sourcing started — searching all suppliers');
      setActiveStep('sourcing');
      loadJob();
    } catch (e) {
      toast.error('Could not start sourcing');
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text3)' }}>Loading job...</div>
    </div>
  );

  if (!job) return null;
  const vehicle = [job.year, job.make, job.model, job.trim].filter(Boolean).join(' ');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          <ArrowLeft size={16} /> Jobs
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--accent)' }}>{job.job_number}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{vehicle || 'No vehicle'}</div>
        {saving && <div style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>Saving...</div>}
      </div>

      {/* Step indicator */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 24px' }}>
        <div className="step-indicator">
          {STEPS.map((step, i) => {
            const stepOrder = STEPS.findIndex(s => s.key === activeStep);
            const isDone = i < stepOrder;
            const isActive = step.key === activeStep;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setActiveStep(step.key)}
                  className={`step-item${isActive ? ' active' : isDone ? ' done' : ''}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="step-dot">{isDone ? '✓' : i + 1}</div>
                  <span style={{ display: 'none', fontSize: 12 }} className="step-label">{step.label}</span>
                  <span style={{ fontSize: 12 }}>{step.label}</span>
                </button>
                {i < STEPS.length - 1 && <div className="step-line" style={{ margin: '0 8px' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>

        {/* STEP: Vehicle */}
        {activeStep === 'vehicle' && (
          <div>
            <VehicleForm job={job} onSave={saveJob} />
            <MediaUpload jobId={id} type="vehicle_photo" label="Vehicle photos" onUploaded={loadJob} />
            <MediaUpload jobId={id} type="inspection_pdf" label="Inspection report PDF" accept=".pdf" onUploaded={loadJob} />
            <MediaUpload jobId={id} type="estimate_pdf" label="Estimate PDF (optional)" accept=".pdf" onUploaded={loadJob} />
            <button onClick={() => setActiveStep('damage')}
              style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 8 }}>
              Next: Select damage →
            </button>
          </div>
        )}

        {/* STEP: Damage */}
        {activeStep === 'damage' && (
          <div>
            <MediaUpload jobId={id} type="damage_photo" label="Damage photos" multiple onUploaded={loadJob} />
            <DamageTags value={job.damage_tags || []} onChange={tags => saveJob({ damage_tags: tags })} />
            <div className="card">
              <div className="card-title">Additional notes for AI</div>
              <textarea
                placeholder="Describe the damage in detail... e.g. 'Front right corner hit, bumper cracked, hood has crease, headlight intact'"
                value={job.damage_description || ''}
                onChange={e => saveJob({ damage_description: e.target.value })}
                rows={3}
              />
            </div>
            <button
              onClick={detectParts}
              disabled={detecting}
              style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: detecting ? 'var(--surface2)' : 'var(--accent)', color: detecting ? 'var(--text3)' : '#0d0f12', border: 'none', borderRadius: 8, cursor: detecting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {detecting ? (
                <><div className="dot-pulse"><span/><span/><span/></div> AI detecting parts...</>
              ) : (
                <><Zap size={16} /> Auto-detect parts from damage + inspection</>
              )}
            </button>
          </div>
        )}

        {/* STEP: Parts review */}
        {activeStep === 'parts' && (
          <PartsReview
            job={job}
            onApprove={() => { startSourcing(); }}
            onRefresh={loadJob}
          />
        )}

        {/* STEP: Sourcing */}
        {activeStep === 'sourcing' && (
          <SourcingResults
            job={job}
            onProceed={() => setActiveStep('calls')}
            onRefresh={loadJob}
          />
        )}

        {/* STEP: Calls */}
        {activeStep === 'calls' && (
          <CallQueue
            job={job}
            onProceed={() => { setActiveStep('quote'); loadJob(); }}
            onRefresh={loadJob}
          />
        )}

        {/* STEP: Quote */}
        {activeStep === 'quote' && (
          <QuotePanel
            job={job}
            onRefresh={loadJob}
          />
        )}
      </div>
    </div>
  );
}

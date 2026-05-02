'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { jobs, parts as partsApi, sourcing, calls as callsApi, quotes as quotesApi } from '@/lib/api';
import { ArrowLeft, Zap, Search, Phone, FileText, CheckCircle, ImageIcon } from 'lucide-react';
import VehicleForm from '@/components/VehicleForm';
import MediaUpload from '@/components/MediaUpload';
import DamageTags from '@/components/DamageTags';
import PartsReview from '@/components/PartsReview';
import SourcingResults from '@/components/SourcingResults';
import CallQueue from '@/components/CallQueue';
import QuotePanel from '@/components/QuotePanel';

const STEPS = [
  { key: 'vehicle', label: 'Vehicle', icon: '🚗' },
  { key: 'damage', label: 'Damage', icon: '⚡' },
  { key: 'parts', label: 'Parts', icon: '📋' },
  { key: 'sourcing', label: 'Sourcing', icon: '🔍' },
  { key: 'calls', label: 'Calls', icon: '📞' },
  { key: 'quote', label: 'Quote', icon: '✅' },
];

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [activeStep, setActiveStep] = useState('vehicle');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [copyingPhotos, setCopyingPhotos] = useState(false);
  const jobRef = useRef<any>(null);

  useEffect(() => {
    loadJob();
  }, [id]);

  async function loadJob() {
    setLoading(true);
    try {
      const { data } = await jobs.get(id);
      setJob(data.job);
      jobRef.current = data.job;
      const s = data.job.status;
      if (s === 'parts_review') setActiveStep('parts');
      else if (s === 'sourcing') setActiveStep('sourcing');
      else if (s === 'calling') setActiveStep('calls');
      else if (s === 'quoted' || s === 'quoting') setActiveStep('quote');
    } catch (e) {
      toast.error('Job not found');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  async function silentRefresh() {
    try {
      const { data } = await jobs.get(id);
      setJob(prev => ({ ...prev, ...data.job }));
      jobRef.current = data.job;
    } catch (e) {}
  }

  async function saveJob(updates: any) {
    setSaving(true);
    try {
      const { data } = await jobs.update(id, updates);
      setJob((prev: any) => ({ ...prev, ...data.job }));
      jobRef.current = { ...jobRef.current, ...data.job };
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
      silentRefresh();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Detection failed');
    } finally {
      setDetecting(false);
    }
  }

  async function copyVehiclePhotos() {
    setCopyingPhotos(true);
    try {
      await jobs.copyMedia(id, 'vehicle_photo', 'damage_photo');
      toast.success('Vehicle photos copied to damage');
      await silentRefresh();
    } catch (e) {
      toast.error('Could not copy photos');
    } finally {
      setCopyingPhotos(false);
    }
  }

  async function startSourcing() {
    try {
      await sourcing.start(id);
      toast.success('Sourcing started');
      setActiveStep('sourcing');
      silentRefresh();
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
  const vehiclePhotoCount = (job.job_media || []).filter((m: any) => m.type === 'vehicle_photo').length;
  const damagePhotoCount = (job.job_media || []).filter((m: any) => m.type === 'damage_photo').length;

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
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 'max-content' }}>
          {STEPS.map((step, i) => {
            const stepOrder = STEPS.findIndex(s => s.key === activeStep);
            const isDone = i < stepOrder;
            const isActive = step.key === activeStep;
            return (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
                <button onClick={() => setActiveStep(step.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
                    color: isActive ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--text3)', fontSize: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600,
                    background: isActive ? 'var(--accent)' : isDone ? 'var(--green)' : 'transparent',
                    color: isActive || isDone ? '#0d0f12' : 'currentColor' }}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  {step.label}
                </button>
                {i < STEPS.length - 1 && <div style={{ width: 20, height: 1, background: isDone ? 'var(--green)' : 'var(--border2)', margin: '0 2px' }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>

        {activeStep === 'vehicle' && (
          <div>
            <VehicleForm job={job} onSave={saveJob} />
            <MediaUpload jobId={id} type="vehicle_photo" label="Vehicle photos" existingMedia={job.job_media || []} onUploaded={silentRefresh} />
            <MediaUpload jobId={id} type="inspection_pdf" label="Inspection report PDF" accept=".pdf" existingMedia={job.job_media || []} onUploaded={silentRefresh} />
            <MediaUpload jobId={id} type="estimate_pdf" label="Estimate PDF (optional)" accept=".pdf" existingMedia={job.job_media || []} onUploaded={silentRefresh} />
            <button onClick={() => setActiveStep('damage')}
              style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600, background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 8 }}>
              Next: Select damage →
            </button>
          </div>
        )}

        {activeStep === 'damage' && (
          <div>
            {/* Pull vehicle photos forward */}
            {vehiclePhotoCount > 0 && (
              <button onClick={copyVehiclePhotos} disabled={copyingPhotos}
                style={{
                  width: '100%', padding: '10px 14px', marginBottom: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: 'var(--surface2)', color: 'var(--text2)',
                  border: '1px dashed var(--border2)', borderRadius: 8,
                  cursor: copyingPhotos ? 'wait' : 'pointer', fontSize: 13
                }}>
                📷 {copyingPhotos ? 'Copying...' : `Use ${vehiclePhotoCount} vehicle photo${vehiclePhotoCount > 1 ? 's' : ''} as damage photos`}
              </button>
            )}
            <MediaUpload jobId={id} type="damage_photo" label="Damage photos" multiple existingMedia={job.job_media || []} onUploaded={silentRefresh} />
            <DamageTags value={job.damage_tags || []} onChange={tags => saveJob({ damage_tags: tags })} />
            <div className="card">
              <div className="card-title">Additional notes for AI</div>
              <textarea placeholder="Describe the damage... e.g. 'Front right corner hit, bumper cracked, hood crease, headlight intact'"
                value={job.damage_description || ''}
                onChange={e => saveJob({ damage_description: e.target.value })}
                rows={3} />
            </div>
            <button onClick={detectParts} disabled={detecting}
              style={{ width: '100%', padding: 11, fontSize: 14, fontWeight: 600,
                background: detecting ? 'var(--surface2)' : 'var(--accent)',
                color: detecting ? 'var(--text3)' : '#0d0f12',
                border: 'none', borderRadius: 8, cursor: detecting ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {detecting
                ? <><span style={{ display: 'inline-flex', gap: 3 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} /><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} /><span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} /></span> AI detecting parts...</>
                : <><Zap size={16} /> Auto-detect parts from damage + inspection</>
              }
            </button>
          </div>
        )}

        {activeStep === 'parts' && (
          <PartsReview job={job} onApprove={startSourcing} onRefresh={silentRefresh} />
        )}

        {activeStep === 'sourcing' && (
          <SourcingResults job={job} onProceed={() => setActiveStep('calls')} onRefresh={silentRefresh} />
        )}

        {activeStep === 'calls' && (
          <CallQueue job={job} onProceed={() => { setActiveStep('quote'); silentRefresh(); }} onRefresh={silentRefresh} />
        )}

        {activeStep === 'quote' && (
          <QuotePanel job={job} onRefresh={silentRefresh} />
        )}
      </div>
    </div>
  );
}

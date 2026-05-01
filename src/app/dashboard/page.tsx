'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { jobs } from '@/lib/api';
import { Plus, Car, Clock, CheckCircle, FileText, Search } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'badge-gray' },
  parts_review: { label: 'Parts Review', color: 'badge-amber' },
  sourcing: { label: 'Sourcing', color: 'badge-blue' },
  calling: { label: 'Calling', color: 'badge-purple' },
  quoting: { label: 'Quoting', color: 'badge-blue' },
  quoted: { label: 'Quoted', color: 'badge-green' },
  approved: { label: 'Approved', color: 'badge-green' },
  ordered: { label: 'Ordered', color: 'badge-accent' },
  complete: { label: 'Complete', color: 'badge-green' },
  cancelled: { label: 'Cancelled', color: 'badge-red' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [jobList, setJobList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('pp_token');
    if (!token) { router.push('/login'); return; }
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    try {
      const { data } = await jobs.list({ limit: 100 });
      setJobList(data.jobs || []);
    } catch (e) {
      toast.error('Could not load jobs');
    } finally {
      setLoading(false);
    }
  }

  async function createNewJob() {
    try {
      const { data } = await jobs.create({ status: 'draft' });
      router.push(`/jobs/${data.job.id}`);
    } catch (e) {
      toast.error('Could not create job');
    }
  }

  const filtered = jobList.filter(j => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (j.job_number?.toLowerCase().includes(s)) ||
      (j.customer_name?.toLowerCase().includes(s)) ||
      ([j.year, j.make, j.model].join(' ').toLowerCase().includes(s));
  });

  const agent = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('pp_agent') || '{}') : {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Parts<span style={{ color: 'var(--accent)' }}>Pro</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {agent.role === 'admin' && (
            <Link href="/settings" style={{ fontSize: 12, color: 'var(--text2)', textDecoration: 'none' }}>Settings</Link>
          )}
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{agent.name}</span>
          <button onClick={() => { localStorage.clear(); router.push('/login'); }}
            style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Title + New Job */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Jobs</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{jobList.length} total jobs</div>
          </div>
          <button onClick={createNewJob}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#0d0f12', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={16} /> New Job
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Active', value: jobList.filter(j => !['complete','cancelled','draft'].includes(j.status)).length, icon: <Car size={18} />, color: 'var(--accent)' },
            { label: 'Quoted', value: jobList.filter(j => j.status === 'quoted').length, icon: <FileText size={18} />, color: 'var(--green)' },
            { label: 'Complete', value: jobList.filter(j => j.status === 'complete').length, icon: <CheckCircle size={18} />, color: 'var(--green)' },
            { label: 'Draft', value: jobList.filter(j => j.status === 'draft').length, icon: <Clock size={18} />, color: 'var(--text2)' },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ color: stat.color }}>{stat.icon}</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input placeholder="Search by job number, customer, or vehicle..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }} />
        </div>

        {/* Job List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading jobs...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
            {search ? 'No jobs match your search.' : 'No jobs yet. Create your first job.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(job => (
              <Link key={job.id} href={`/jobs/${job.id}`}
                style={{ textDecoration: 'none', display: 'block', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', transition: 'border-color .15s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'DM Mono, monospace' }}>{job.job_number || 'Untitled'}</span>
                      <span className={`badge ${STATUS_CONFIG[job.status]?.color || 'badge-gray'}`}>{STATUS_CONFIG[job.status]?.label || job.status}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>
                      {[job.year, job.make, job.model, job.trim].filter(Boolean).join(' ') || 'No vehicle info'}
                      {job.customer_name && <span style={{ color: 'var(--text3)', marginLeft: 8 }}>• {job.customer_name}</span>}
                    </div>
                    {job.vin && <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{job.vin}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {job.quotes?.[0]?.grand_total && (
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>${job.quotes[0].grand_total.toLocaleString()}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{new Date(job.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{job.agents?.name}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

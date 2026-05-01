'use client';
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { jobs } from '@/lib/api';
import { FileText } from 'lucide-react';

interface Props {
  jobId: string;
  type: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  onUploaded?: () => void;
  existingMedia?: any[];
}

export default function MediaUpload({ jobId, type, label, accept, multiple = true, onUploaded, existingMedia = [] }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<any[]>([]);

  // Load existing media on mount and when existingMedia changes
  useEffect(() => {
    if (existingMedia && existingMedia.length > 0) {
      const filtered = existingMedia.filter(m => m.type === type);
      if (filtered.length > 0) setUploaded(filtered);
    }
  }, [existingMedia, type]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);

    // Show local previews immediately
    const previews = files.map(f => ({ url: URL.createObjectURL(f), filename: f.name, local: true }));
    setUploaded(prev => [...prev, ...previews]);

    try {
      const { data } = await jobs.uploadMedia(jobId, files, type);
      // Replace local previews with real URLs
      setUploaded(prev => {
        const nonLocal = prev.filter(m => !m.local);
        return [...nonLocal, ...data.media];
      });
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
      onUploaded?.();
    } catch (e) {
      // Remove failed previews
      setUploaded(prev => prev.filter(m => !m.local));
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }, [jobId, type]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: accept === '.pdf'
      ? { 'application/pdf': ['.pdf'] }
      : { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic'] }
  });

  const isPDF = type.includes('pdf');

  return (
    <div className="card">
      <div className="card-title">{label}</div>
      <div
        {...getRootProps()}
        style={{
          border: `1px dashed ${isDragActive ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 8,
          padding: '20px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragActive ? 'rgba(45,212,191,0.05)' : 'transparent',
          transition: 'all .15s',
          marginBottom: uploaded.length > 0 ? 12 : 0
        }}
      >
        <input {...getInputProps()} />
        <div style={{ fontSize: 28, marginBottom: 6 }}>{isPDF ? '📄' : '📷'}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)' }}>
          {uploading ? 'Uploading...' : isDragActive ? 'Drop files here' : `Tap to upload ${label.toLowerCase()}`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
          {isPDF ? 'PDF files only' : 'JPG, PNG, WebP, HEIC'}
          {multiple ? ' — multiple allowed' : ''}
        </div>
      </div>

      {/* Image preview grid */}
      {!isPDF && uploaded.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
          {uploaded.map((m, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img
                src={m.url}
                alt=""
                style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6, display: 'block', opacity: m.local ? 0.6 : 1 }}
              />
              {m.local && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                  Uploading...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* PDF list */}
      {isPDF && uploaded.length > 0 && (
        <div>
          {uploaded.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 12 }}>
              <FileText size={14} style={{ color: 'var(--purple)' }} />
              <span style={{ color: 'var(--text2)' }}>{m.filename}</span>
              <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>AI will read</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

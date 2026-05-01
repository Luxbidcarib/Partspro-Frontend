'use client';
import { useState, useCallback } from 'react';
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

export default function MediaUpload({ jobId, type, label, accept, multiple = true, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  const onDrop = useCallback(async (files: File[]) => {
    if (!files.length) return;

    // Show local previews immediately — these never disappear
    const localUrls = files.map(f => URL.createObjectURL(f));
    setPreviews(prev => [...prev, ...localUrls]);
    setUploading(true);

    try {
      const { data } = await jobs.uploadMedia(jobId, files, type);
      setUploadedFiles(prev => [...prev, ...data.media]);
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`);
      // Only call onUploaded for PDFs to trigger AI analysis
      if (type.includes('pdf')) onUploaded?.();
    } catch (e) {
      toast.error('Upload failed');
      // Remove the failed previews
      setPreviews(prev => prev.slice(0, prev.length - files.length));
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
          marginBottom: previews.length > 0 ? 12 : 0
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

      {/* Image previews — shown immediately, never disappear */}
      {!isPDF && previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
          {previews.map((url, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <img src={url} alt="" style={{ width: '100%', height: 72, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            </div>
          ))}
        </div>
      )}

      {/* PDF list */}
      {isPDF && uploadedFiles.length > 0 && (
        <div>
          {uploadedFiles.map((m, i) => (
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

import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'PartsPro AI',
  description: 'Professional automotive parts sourcing and quoting',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1a1d21', color: '#e8eaed', border: '1px solid rgba(255,255,255,0.1)' } }} />
      </body>
    </html>
  );
}

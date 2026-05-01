'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = localStorage.getItem('pp_token');
    router.push(token ? '/dashboard' : '/login');
  }, []);
  return null;
}

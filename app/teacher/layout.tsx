'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/enterprise/app-shell';
import { LoginAlertProvider } from '@/components/enterprise/login-alert-provider';
import { useAuth } from '@/lib/auth-context';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState<string | null>(null);

  useEffect(() => {
    checkLicenseStatus();
  }, [user?.schoolId]);

  const checkLicenseStatus = async () => {
    if (!user?.schoolId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/school');
      if (res.ok) {
        const data = await res.json();
        setLicenseStatus(data.licenseStatus);
        
        if (data.licenseStatus === 'SUSPENDED') {
          router.replace('/suspended');
        }
      }
    } catch (err) {
      console.error('Failed to check license status:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (licenseStatus === 'SUSPENDED') {
    return null;
  }

  return (
    <LoginAlertProvider>
      <AppShell role='teacher' roleLabel='Teacher Portal'>
        {children}
      </AppShell>
    </LoginAlertProvider>
  );
}
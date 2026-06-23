'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, LogOut, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SuspendedPage() {
  const router = useRouter();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const fetchSchoolData = async () => {
    try {
      const res = await fetch('/api/admin/school');
      if (res.ok) {
        const data = await res.json();
        setSchoolData(data);
      }
    } catch (err) {
      console.error('Failed to fetch school data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">TT</span>
            </div>
            <span className="font-semibold text-slate-800">TimeTablePro</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Centered Alert Card */}
      <div className="flex items-center justify-center min-h-[calc(100vh-73px)] px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Red Header */}
            <div className="bg-red-600 px-6 py-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Account Suspended</h1>
                  <p className="text-red-100 text-sm mt-1">Your access has been revoked</p>
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-6 space-y-6">
              {/* Reason Badge */}
              <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Security Review
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Organization</span>
                  <span className="text-sm font-medium text-slate-800">
                    {loading ? 'Loading...' : schoolData?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Revocation Date</span>
                  <span className="text-sm font-medium text-slate-800">
                    {loading ? 'Loading...' : new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Contact Action */}
              <div className="space-y-3 pt-4">
                <Button
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                  onClick={() => window.location.href = 'mailto:support@timetablepro.com?subject=Account Suspension Inquiry'}
                >
                  Contact Us
                </Button>
                <div className="text-center">
                  <a
                    href="mailto:support@timetablepro.com"
                    className="text-sm text-indigo-600 hover:text-indigo-700 underline"
                  >
                    support@timetablepro.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

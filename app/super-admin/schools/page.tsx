'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Download, RefreshCw } from 'lucide-react';

import { useRequireAuth } from '@/lib/auth-context';
import { PageHeader } from '@/components/enterprise/page-header';
import { GlassCard } from '@/components/enterprise/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getPlatformSchools, type PlatformSchoolRow } from '@/lib/api-services';
import { getStatusBadgeClass, formatDate } from '@/lib/super-admin-utils';
import { cn } from '@/lib/utils';

export default function SchoolsPage() {
  useRequireAuth('super-admin');

  const [schools, setSchools] = useState<PlatformSchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trial' | 'suspended'>('all');

  const fetchSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPlatformSchools();
      setSchools(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      typeof school.name === 'string' && school.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && school.licenseStatus?.toLowerCase() === 'active') ||
      (statusFilter === 'trial' && school.licenseStatus?.toLowerCase() === 'trial') ||
      (statusFilter === 'suspended' && school.licenseStatus?.toLowerCase() === 'suspended');
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className='max-w-7xl mx-auto space-y-6'>
      <PageHeader
        title='School Management'
        description='View and manage all institutional tenant accounts and licensing status.'
        breadcrumbs={[{ label: 'Super Admin', href: '/super-admin/dashboard' }, { label: 'Schools' }]}
      />

      <GlassCard className='p-6'>
        <div className='flex flex-col sm:flex-row gap-4 items-center justify-between mb-6'>
          <div className='flex flex-1 gap-3 w-full sm:w-auto'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
              <Input
                placeholder='Search schools...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className='px-3 py-2 rounded-md border border-input bg-background text-sm'
            >
              <option value='all'>All Status</option>
              <option value='active'>Active</option>
              <option value='trial'>Trial</option>
              <option value='suspended'>Suspended</option>
            </select>
          </div>
          <div className='flex gap-2'>
            <Button variant='outline' size='icon' onClick={fetchSchools} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant='outline' size='icon' onClick={() => {
              if (typeof window !== 'undefined') {
                const csvContent = [
                  ['School', 'Plan', 'Status', 'Created', 'Admin Emails'],
                  ...filteredSchools.map(s => [
                    typeof s.name === 'string' ? s.name : '-',
                    typeof s.planName === 'string' ? s.planName : '-',
                    typeof s.licenseStatus === 'string' ? s.licenseStatus : '-',
                    formatDate(s.licenseDate),
                    Array.isArray(s.adminEmails) ? s.adminEmails.join('; ') : '-'
                  ])
                ].map(row => row.join(',')).join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `schools-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }
            }}>
              <Download className='w-4 h-4' />
            </Button>
          </div>
        </div>

        {error && (
          <div className='mb-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm'>
            {error}
          </div>
        )}

        {loading ? (
          <div className='space-y-3'>
            {[...Array(5)].map((_, i) => (
              <div key={i} className='h-16 bg-muted/30 rounded-lg animate-pulse' />
            ))}
          </div>
        ) : (
          <div className='overflow-hidden rounded-xl border border-border/50'>
            <table className='w-full text-sm'>
              <thead className='bg-muted/40'>
                <tr>
                  <th className='p-3 text-left font-medium'>School</th>
                  <th className='p-3 text-left font-medium'>Plan</th>
                  <th className='p-3 text-left font-medium'>Status</th>
                  <th className='p-3 text-left font-medium'>Created</th>
                  <th className='p-3 text-left font-medium'>Admin Emails</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchools.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='p-6 text-center text-sm text-muted-foreground'>
                      {searchQuery || statusFilter !== 'all'
                        ? 'No schools match your filters.'
                        : 'No school data available.'}
                    </td>
                  </tr>
                ) : (
                  filteredSchools.map((school) => (
                    <tr key={school.id} className='border-t border-border/30 hover:bg-muted/20 transition-colors'>
                      <td className='p-3 font-medium'>{typeof school.name === 'string' ? school.name : '-'}</td>
                      <td className='p-3'>{typeof school.planName === 'string' ? school.planName : '-'}</td>
                      <td className='p-3'>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusBadgeClass(school.licenseStatus))}>
                          {typeof school.licenseStatus === 'string' ? school.licenseStatus : '-'}
                        </span>
                      </td>
                      <td className='p-3'>{formatDate(school.licenseDate)}</td>
                      <td className='p-3'>
                        <div className='flex flex-wrap gap-1'>
                          {Array.isArray(school.adminEmails) && school.adminEmails.length > 0 ? (
                            school.adminEmails.slice(0, 2).map((email, idx) => (
                              <span key={idx} className='text-xs text-muted-foreground'>
                                {email}
                                {idx === 0 && school.adminEmails.length > 1 && ', ...'}
                              </span>
                            ))
                          ) : (
                            <span className='text-xs text-muted-foreground'>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredSchools.length > 0 && (
          <div className='mt-4 text-sm text-muted-foreground text-center'>
            Showing {filteredSchools.length} of {schools.length} schools
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className='space-y-6 animate-pulse'>
      <div className='h-20 rounded-2xl bg-muted/50' />
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className='h-28 rounded-2xl bg-muted/50' />
        ))}
      </div>
      <div className='h-64 rounded-2xl bg-muted/50' />
      {rows > 0 &&
        Array.from({ length: rows }).map((_, i) => (
          <div key={i} className='h-14 rounded-xl bg-muted/40' />
        ))}
    </div>
  );
}

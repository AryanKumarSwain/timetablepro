import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function GlassCard({
  className,
  children,
  hover = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-lg shadow-black/5',
        'dark:bg-card/40 dark:shadow-black/20',
        hover &&
          'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-primary/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

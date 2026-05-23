import { Card } from '@/components/ui/card';

interface KPICardProps {
  label: string;
  value: number | string;
  subtext?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger';
  icon?: React.ReactNode;
}

export function KPICard({
  label,
  value,
  subtext,
  variant = 'default',
  icon,
}: KPICardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    warning: 'bg-yellow-500/10 border-yellow-500/30',
    success: 'bg-green-500/10 border-green-500/30',
    danger: 'bg-destructive/10 border-destructive/30',
  };

  const textColorMap = {
    default: 'text-foreground',
    warning: 'text-yellow-600 dark:text-yellow-400',
    success: 'text-green-600 dark:text-green-400',
    danger: 'text-destructive',
  };

  return (
    <Card className={`p-6 border ${variantStyles[variant]}`}>
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <p className='text-sm font-medium text-muted-foreground mb-2'>
            {label}
          </p>
          <p className={`text-3xl font-bold ${textColorMap[variant]}`}>
            {value}
          </p>
          {subtext && (
            <p className='text-xs text-muted-foreground mt-2'>{subtext}</p>
          )}
        </div>
        {icon && <div className='text-2xl ml-4'>{icon}</div>}
      </div>
    </Card>
  );
}

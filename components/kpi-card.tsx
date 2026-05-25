import { StatCard } from '@/components/enterprise/stat-card';

interface KPICardProps {
  label: string;
  value: number | string;
  subtext?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger';
  icon?: React.ReactNode;
  index?: number;
}

const variantMap = {
  default: 'default' as const,
  warning: 'warning' as const,
  success: 'success' as const,
  danger: 'danger' as const,
};

export function KPICard({
  label,
  value,
  subtext,
  variant = 'default',
  index = 0,
}: KPICardProps) {
  return (
    <StatCard
      label={label}
      value={value}
      subtext={subtext}
      variant={variantMap[variant]}
      index={index}
    />
  );
}

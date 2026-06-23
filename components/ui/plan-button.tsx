'use client';

import { Button } from '@/components/ui/button';
import { usePlanTheme } from '@/lib/plan-theme';
import { cn } from '@/lib/utils';

interface PlanButtonProps extends Omit<React.ComponentProps<typeof Button>, 'variant'> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'destructive' | 'secondary';
}

export function PlanButton({ 
  variant = 'default', 
  className, 
  ...props 
}: PlanButtonProps) {
  const { theme } = usePlanTheme();

  if (variant === 'primary') {
    return (
      <Button
        className={cn(
          `bg-${theme.primary} hover:bg-${theme.primaryHover} text-white`,
          className
        )}
        {...props}
      />
    );
  }

  if (variant === 'outline') {
    return (
      <Button
        variant="outline"
        className={cn(
          `border-${theme.primaryBorder} ${theme.primaryText} hover:bg-${theme.primaryBg}/10`,
          className
        )}
        {...props}
      />
    );
  }

  return <Button variant={variant as any} className={className} {...props} />;
}

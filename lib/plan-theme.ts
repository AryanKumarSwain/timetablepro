'use client';

import { useState, useEffect } from 'react';

export interface PlanTheme {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  gradientFrom: string;
  gradientTo: string;
  primaryText: string;
  primaryTextDark: string;
  primaryBg: string;
  primaryBgDark: string;
  primaryBorder: string;
  primaryBorderDark: string;
  primaryShadow: string;
}

const planThemes: Record<string, PlanTheme> = {
  free: {
    primary: 'violet-600',
    primaryHover: 'violet-700',
    primaryLight: 'violet-500',
    primaryDark: 'violet-800',
    gradientFrom: 'violet-600',
    gradientTo: 'purple-700',
    primaryText: 'text-violet-600',
    primaryTextDark: 'text-violet-400',
    primaryBg: 'bg-violet-500',
    primaryBgDark: 'bg-violet-600',
    primaryBorder: 'border-violet-500',
    primaryBorderDark: 'border-violet-400',
    primaryShadow: 'shadow-violet-500/25',
  },
  standard: {
    primary: 'emerald-600',
    primaryHover: 'emerald-700',
    primaryLight: 'emerald-500',
    primaryDark: 'emerald-800',
    gradientFrom: 'emerald-500',
    gradientTo: 'green-600',
    primaryText: 'text-emerald-600',
    primaryTextDark: 'text-emerald-400',
    primaryBg: 'bg-emerald-500',
    primaryBgDark: 'bg-emerald-600',
    primaryBorder: 'border-emerald-500',
    primaryBorderDark: 'border-emerald-400',
    primaryShadow: 'shadow-emerald-500/25',
  },
  premium: {
    primary: 'orange-600',
    primaryHover: 'orange-700',
    primaryLight: 'orange-500',
    primaryDark: 'orange-800',
    gradientFrom: 'orange-500',
    gradientTo: 'amber-500',
    primaryText: 'text-orange-600',
    primaryTextDark: 'text-orange-400',
    primaryBg: 'bg-orange-500',
    primaryBgDark: 'bg-orange-600',
    primaryBorder: 'border-orange-500',
    primaryBorderDark: 'border-orange-400',
    primaryShadow: 'shadow-orange-500/25',
  },
  elite: {
    primary: 'yellow-600',
    primaryHover: 'yellow-700',
    primaryLight: 'yellow-500',
    primaryDark: 'yellow-800',
    gradientFrom: 'yellow-500',
    gradientTo: 'amber-400',
    primaryText: 'text-yellow-600',
    primaryTextDark: 'text-yellow-400',
    primaryBg: 'bg-yellow-500',
    primaryBgDark: 'bg-yellow-600',
    primaryBorder: 'border-yellow-500',
    primaryBorderDark: 'border-yellow-400',
    primaryShadow: 'shadow-yellow-500/25',
  },
};

export function getPlanTheme(planName: string | null): PlanTheme {
  if (!planName) return planThemes.free;

  const planNameLower = planName.toLowerCase();
  if (planNameLower.includes('free') || planNameLower.includes('trial') || planNameLower.includes('basic') || planNameLower.includes('starter')) {
    return planThemes.free;
  } else if (planNameLower.includes('standard') || planNameLower.includes('growth') || planNameLower.includes('pro')) {
    return planThemes.standard;
  } else if (planNameLower.includes('premium') || planNameLower.includes('business') || planNameLower.includes('plus')) {
    return planThemes.premium;
  } else if (planNameLower.includes('elite') || planNameLower.includes('enterprise') || planNameLower.includes('ultimate')) {
    return planThemes.elite;
  }

  return planThemes.free;
}

export function usePlanTheme() {
  const [planName, setPlanName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetch('/api/admin/school');
        if (res.ok) {
          const data = await res.json();
          if (data.plan) {
            setPlanName(data.plan.name);
          }
        }
      } catch (error) {
        console.error('Failed to fetch plan:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  const theme = getPlanTheme(planName);

  return { theme, planName, loading };
}

'use client';

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant: 'purple' | 'slate' | 'green' | 'red';
  isLoading?: boolean;
  loadingText?: string;
}

const variantStyles = {
  purple: {
    container: 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white',
    title: 'text-indigo-100',
    subtitle: 'text-indigo-200',
  },
  slate: {
    container: 'bg-slate-100 text-slate-900',
    title: 'text-slate-600',
    subtitle: 'text-slate-600',
  },
  green: {
    container: 'bg-gradient-to-br from-green-500 to-emerald-600 text-white',
    title: 'text-green-100',
    subtitle: 'text-white',
  },
  red: {
    container: 'bg-gradient-to-br from-red-500 to-rose-600 text-white',
    title: 'text-red-100',
    subtitle: 'text-white',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  variant,
  isLoading = false,
  loadingText = 'Načítám...',
}) => {
  const styles = variantStyles[variant];

  return (
    <div className={`rounded-2xl p-6 shadow-lg ${styles.container}`}>
      <h3 className={`text-xs font-medium uppercase tracking-wider mb-2 ${styles.title}`}>
        {title}
      </h3>
      <div
        className={`text-2xl md:text-3xl font-bold tracking-tight ${isLoading ? 'animate-pulse' : ''}`}
      >
        {isLoading ? loadingText : value}
      </div>
      {subtitle && !isLoading && (
        <p className={`text-sm font-medium ${styles.subtitle}`}>{subtitle}</p>
      )}
    </div>
  );
};

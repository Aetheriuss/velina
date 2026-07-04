'use client';

import React from 'react';

/** Centered accent spinner for whole-page pending states. */
export const Spinner: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20" role="status" aria-label={label}>
    <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-border border-t-accent" />
    <span className="text-sm text-text-muted">{label}</span>
  </div>
);

export default Spinner;

'use client';

import React from 'react';

/** Pulsing placeholder block; size it with width/height utilities. */
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => <div className={`animate-pulse rounded-rbx bg-surface-alt ${className}`} {...props} />;

export default Skeleton;

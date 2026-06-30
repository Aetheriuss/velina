'use client';

import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Removes default inner padding when laying out edge-to-edge content. */
  flush?: boolean;
}

/** Rounded 2020 surface card. */
export const Card: React.FC<CardProps> = ({ flush = false, className = '', children, ...props }) => (
  <div
    className={`bg-surface text-text border border-border rounded-rbx shadow-rbx ${
      flush ? '' : 'p-4'
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;

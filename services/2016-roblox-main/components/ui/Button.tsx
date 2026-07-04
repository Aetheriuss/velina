'use client';

import React from 'react';

type Variant = 'primary' | 'positive' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-rbx font-semibold transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
  'disabled:opacity-40 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  // Flat 2020 buttons (replace the 2016 gradient buttons).
  primary: 'bg-accent text-white hover:bg-accent-hover',
  positive: 'bg-positive text-white hover:bg-positive-hover', // purchase / Robux CTAs
  secondary: 'bg-surface text-text border border-border hover:bg-bg',
  ghost: 'bg-transparent text-accent hover:bg-accent-tint',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => (
  <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />
);

export default Button;

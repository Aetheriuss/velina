'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const base =
  'inline-flex items-center justify-center font-semibold rounded-rbx transition-colors ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ' +
  'disabled:cursor-not-allowed';

const variants: Record<Variant, string> = {
  // Flat 2020 accent button (replaces the 2016 gradient buttons).
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'bg-surface-alt text-text border border-border hover:bg-surface',
  ghost: 'bg-transparent text-text hover:bg-surface-alt',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-6 py-3',
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

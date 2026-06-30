import React from 'react';

/** Centered card shell shared by the auth pages (login, choose-username, account-deletion, info). */
export default function AuthCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-md ${className}`}>
      <div className="rounded-rbx border border-border bg-surface p-6 shadow-rbx">
        {title ? <h1 className="mb-3 text-2xl font-bold">{title}</h1> : null}
        {children}
      </div>
    </div>
  );
}

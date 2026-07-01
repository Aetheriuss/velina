'use client';

import React, { useRef, useState } from 'react';
import { useAuth } from '../../../components/providers/AuthProvider';
import { createGroup } from '../../../services/groups';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

export default function CreateGroupPage() {
  const { isAuthenticated, isPending } = useAuth();
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in to create a group.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setLocked(true);
    setFeedback(null);
    try {
      // createGroup reads files off the passed input element (matches the legacy signature).
      const d = await createGroup({ name: nameRef.current?.value, description: descRef.current?.value, iconElement: iconRef.current });
      window.location.href = `/My/Groups.aspx?gid=${d.id}`;
    } catch (err) {
      const e2 = err as { response?: { data?: { errors?: Array<{ message?: string }> } }; message?: string };
      setFeedback(e2.response?.data?.errors?.[0]?.message || e2.message || 'Could not create group.');
      setLocked(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-3xl font-black">Create a Group</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {feedback ? <p className="text-sm text-negative">{feedback}</p> : null}
          <label className="text-sm text-text-muted">Name</label>
          <input ref={nameRef} disabled={locked} autoComplete="off" className="rounded-rbx border border-border bg-surface px-3 py-2" />
          <label className="text-sm text-text-muted">Description</label>
          <textarea ref={descRef} disabled={locked} rows={8} autoComplete="off" className="rounded-rbx border border-border bg-surface px-3 py-2" />
          <label className="text-sm text-text-muted">Emblem</label>
          <input ref={iconRef} disabled={locked} type="file" accept="image/*" className="text-sm" />
          <p className="text-sm text-text-muted">Creating a group costs <strong className="text-positive">R$ 100</strong>. Your account will be charged on purchase.</p>
          <div>
            <Button type="submit" disabled={locked}>{locked ? 'Creating…' : 'Purchase'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

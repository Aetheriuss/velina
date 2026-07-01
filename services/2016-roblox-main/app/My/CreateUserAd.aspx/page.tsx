'use client';

import React, { Suspense, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { uploadAdvertisement } from '../../../services/ads';
import AuthCard from '../../auth/_components/AuthCard';
import Button from '../../../components/ui/Button';

function CreateAdInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetId = Number(searchParams?.get('targetId') || 0);
  const targetType = (searchParams?.get('targetType') || 'asset') as string;

  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    const file = fileRef.current?.files?.[0];
    const name = nameRef.current?.value;
    if (!file) return setFeedback('Please choose an image file.');
    if (!name) return setFeedback('Please enter an ad name.');
    setFeedback(null);
    setLocked(true);
    try {
      await uploadAdvertisement({ file, name, targetId, type: targetType });
      router.push('/develop?View=101');
    } catch (err) {
      setFeedback((err instanceof Error ? err.message : 'Upload failed.') + ' (If you use an ad blocker, try disabling it.)');
      setLocked(false);
    }
  };

  return (
    <AuthCard title="Create a User Ad" className="mt-8">
      <p className="mb-3 text-sm text-text-muted">
        Upload a banner (728×90), skyscraper (160×600), or rectangle (300×250) image to advertise this{' '}
        {targetType}.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <label className="text-sm text-text-muted">Ad image</label>
        <input ref={fileRef} type="file" accept="image/*" className="text-sm" />
        <label className="text-sm text-text-muted">Ad name</label>
        <input ref={nameRef} type="text" className="rounded-rbx border border-border bg-surface px-3 py-2" />
        {feedback ? <p className="text-sm text-negative">{feedback}</p> : null}
        <div className="mt-1">
          <Button type="submit" disabled={locked}>{locked ? 'Uploading…' : 'Upload'}</Button>
        </div>
      </form>
    </AuthCard>
  );
}

export default function CreateUserAdPage() {
  return (
    <Suspense fallback={null}>
      <CreateAdInner />
    </Suspense>
  );
}

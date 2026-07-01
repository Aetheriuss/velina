'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * The legacy /internal/place-update just redirected to /places/{id}/update, which is now a real
 * App Router page (Batch 4e). Mirror that redirect.
 */
function Inner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams?.get('id');
  useEffect(() => {
    router.replace(id ? `/places/${id}/update` : '/develop');
  }, [id, router]);
  return null;
}

export default function PlaceUpdateRedirect() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}

'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/** Legacy /User.aspx?ID= → /users/{id}/profile (ports pages/User.aspx.js). */
function Inner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams?.get('ID') || searchParams?.get('id');
  useEffect(() => {
    router.replace(id ? `/users/${id}/profile` : '/');
  }, [id, router]);
  return null;
}

export default function UserAspxRedirect() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}

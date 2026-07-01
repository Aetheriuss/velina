'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import InventoryView from '../_components/InventoryView';

export default function FavoritesPage() {
  const params = useParams();
  const userId = Number(Array.isArray(params?.userId) ? params?.userId[0] : params?.userId);
  if (!Number.isFinite(userId)) return null;
  return <InventoryView userId={userId} mode="Favorites" />;
}

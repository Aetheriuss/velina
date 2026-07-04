'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminGet, adminRequest } from '../../../../lib/adminClient';
import { useAdminPerms } from '../../../../components/admin/AdminPermissionsProvider';
import ProductHistory from '../../../../components/admin/ProductHistory';
import SaleHistory from '../../../../components/admin/SaleHistory';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

interface Product { name: string; isForSale: boolean; isLimited: boolean; isLimitedUnique: boolean; priceRobux?: number | null; priceTickets?: number | null; serialCount?: number | null; offsaleAt?: string | null }

function Inner() {
  const searchParams = useSearchParams();
  const { hasPermission } = useAdminPerms();
  const [assetId, setAssetId] = useState(searchParams?.get('assetId') || '');
  const [active, setActive] = useState(searchParams?.get('assetId') || '');

  const { data: p } = useQuery({ queryKey: ['product-details', active], enabled: !!active, queryFn: () => adminGet<Product>(`/product/details?assetId=${active}`) });

  const [f, setF] = useState({ priceRobux: '', priceTickets: '', isForSale: false, limited: 'none', maxCopies: '', offsaleDeadline: '' });
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!p) return;
    setF({ priceRobux: p.priceRobux != null ? String(p.priceRobux) : '', priceTickets: p.priceTickets != null ? String(p.priceTickets) : '', isForSale: p.isForSale, limited: p.isLimitedUnique ? 'unique' : p.isLimited ? 'limited' : 'none', maxCopies: p.serialCount != null ? String(p.serialCount) : '', offsaleDeadline: p.offsaleAt || '' });
  }, [p]);

  const save = async () => {
    setMsg(null);
    try {
      await adminRequest('PATCH', '/asset/product', { body: {
        assetId: parseInt(active, 10), isForSale: f.isForSale,
        maxCopies: f.maxCopies ? parseInt(f.maxCopies, 10) : null,
        priceRobux: f.priceRobux ? parseInt(f.priceRobux, 10) : null,
        priceTickets: f.priceTickets ? parseInt(f.priceTickets, 10) : null,
        offsaleDeadline: f.offsaleDeadline || null,
        isLimited: f.limited === 'limited', isLimitedUnique: f.limited === 'unique',
      } });
      setMsg('Product updated.');
    } catch (e) { setMsg((e as Error).message); }
  };

  const input = 'rounded-rbx border border-border bg-surface px-3 py-2';
  const set = (k: string, v: string | boolean) => setF((pr) => ({ ...pr, [k]: v }));
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Update Item Product</h1>
      <Card className="flex gap-2">
        <input className={`${input} flex-1`} placeholder="Asset ID" value={assetId} onChange={(e) => setAssetId(e.target.value)} />
        <Button size="sm" onClick={() => setActive(assetId)}>Search</Button>
      </Card>

      {p ? (
        <>
          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">{p.name}</h2>
            <input className={input} placeholder="Price R$" value={f.priceRobux} onChange={(e) => set('priceRobux', e.target.value)} />
            <input className={input} placeholder="Price T$" value={f.priceTickets} onChange={(e) => set('priceTickets', e.target.value)} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isForSale} onChange={(e) => set('isForSale', e.target.checked)} /> For sale</label>
            {hasPermission('MakeItemLimited') ? (
              <select className={input} value={f.limited} onChange={(e) => set('limited', e.target.value)}>
                <option value="none">Not Limited</option><option value="limited">Limited</option><option value="unique">Limited Unique</option>
              </select>
            ) : null}
            <input className={input} placeholder="Max copies" value={f.maxCopies} onChange={(e) => set('maxCopies', e.target.value)} />
            <input className={input} placeholder="Offsale deadline ISO (optional)" value={f.offsaleDeadline} onChange={(e) => set('offsaleDeadline', e.target.value)} />
            {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
            <div><Button onClick={save}>Update Product</Button></div>
          </Card>

          {hasPermission('GetSaleHistoryForAsset') ? (
            <Card><h2 className="mb-2 font-semibold">Product History</h2><ProductHistory assetId={parseInt(active, 10)} /></Card>
          ) : null}
          <Card><h2 className="mb-2 font-semibold">Sale History</h2><SaleHistory assetId={parseInt(active, 10)} /></Card>
        </>
      ) : null}
    </div>
  );
}

export default function UpdateProductPage() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}

'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { searchCatalog, getItemDetails } from '../../services/catalog';
import { multiGetAssetThumbnails } from '../../services/thumbnails';
import { buildThumbMap } from '../../lib/thumbnailMap';
import getFlag from '../../lib/getFlag';
import { CATALOG_NAV, CATALOG_SORTS } from './_constants';
import { ItemDetails } from './_types';
import CatalogCard from './_components/CatalogCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface SearchResult {
  items: ItemDetails[];
  next: string | null;
  prev: string | null;
}

function CatalogInner() {
  const searchParams = useSearchParams();
  const limit = getFlag('catalogPageLimit', 28) as number;

  const [category, setCategory] = useState('Featured');
  const [subCategory, setSubCategory] = useState('');
  const [sort, setSort] = useState(0);
  const [keyword, setKeyword] = useState(searchParams?.get('keyword') || '');
  const [searchBox, setSearchBox] = useState(keyword);
  const [cursor, setCursor] = useState<string | null>(null);

  // Any filter change resets pagination.
  const applyFilter = (fn: () => void) => {
    setCursor(null);
    fn();
  };

  const { data, isFetching } = useQuery<SearchResult>({
    queryKey: ['catalog-search', category, subCategory, sort, keyword, cursor, limit],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res = await searchCatalog({
        category,
        subCategory,
        query: keyword,
        limit,
        cursor,
        sort,
        creatorType: undefined,
        creatorId: undefined,
      });
      const ids: number[] = (res.data || []).map((v: { id: number }) => v.id);
      if (ids.length === 0) return { items: [], next: null, prev: null };
      const det = await getItemDetails(ids);
      const detList: ItemDetails[] = det.data.data;
      const items = (res.data as Array<{ id: number }>)
        .map((r) => detList.find((d) => d.id === r.id))
        .filter((x): x is ItemDetails => !!x);
      return { items, next: res.nextPageCursor || null, prev: res.previousPageCursor || null };
    },
  });

  const items = data?.items || [];
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const { data: thumbs } = useQuery({
    queryKey: ['catalog-thumbs', ids],
    queryFn: () => multiGetAssetThumbnails({ assetIds: ids }),
    enabled: ids.length > 0,
  });
  const thumbMap = useMemo(() => buildThumbMap(thumbs), [thumbs]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-text">Catalog</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilter(() => setKeyword(searchBox));
          }}
          className="flex w-full gap-2 sm:max-w-md"
        >
          <input
            type="text"
            value={searchBox}
            onChange={(e) => setSearchBox(e.target.value)}
            placeholder="Search the catalog"
            className="h-9 flex-1 rounded-rbx border border-border bg-surface px-3 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <Card className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-text">Sort By</label>
              <select
                value={sort}
                onChange={(e) => applyFilter(() => setSort(parseInt(e.target.value, 10)))}
                className="h-9 w-full rounded-rbx border border-border bg-surface px-2 text-sm text-text focus:border-accent focus:outline-none"
              >
                {CATALOG_SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <nav className="flex flex-col gap-4">
              {CATALOG_NAV.map((group) => (
                <div key={group.title}>
                  <p className="px-1 text-xs font-bold uppercase tracking-wide text-text-muted">{group.title}</p>
                  <ul className="mt-1 flex flex-col">
                    {group.items.map((it) => {
                      const active = it.category === category && it.subCategory === subCategory;
                      return (
                        <li key={it.label}>
                          <button
                            type="button"
                            onClick={() =>
                              applyFilter(() => {
                                setCategory(it.category);
                                setSubCategory(it.subCategory);
                              })
                            }
                            className={`relative flex h-9 w-full items-center rounded-rbx px-3 text-left text-sm transition-colors ${
                              active
                                ? 'bg-sidebar-active font-semibold text-accent before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:rounded-l-rbx before:bg-accent'
                                : 'text-text hover:bg-sidebar-hover'
                            }`}
                          >
                            {it.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </Card>
        </aside>

        <div className="min-w-0">
          {isFetching && items.length === 0 ? (
            <p className="text-text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-text-muted">No items found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <CatalogCard key={item.id} item={item} thumbUrl={thumbMap[item.id]} />
              ))}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              disabled={!data?.prev || isFetching}
              onClick={() => setCursor(data?.prev || null)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={!data?.next || isFetching}
              onClick={() => setCursor(data?.next || null)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <Suspense fallback={null}>
      <CatalogInner />
    </Suspense>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { multiGetPlaceDetails } from '../../../../services/games';
import { updateAsset, setUniverseMaxPlayers, uploadAssetVersion } from '../../../../services/develop';
import Card from '../../../../components/ui/Card';
import Button from '../../../../components/ui/Button';

const GENRES = ['All', 'Building', 'Horror', 'Town and City', 'Military', 'Comedy', 'Medieval', 'Adventure', 'Sci-Fi', 'Naval', 'FPS', 'RPG', 'Sports', 'Fighting', 'Western'];

export default function UpdatePlacePage() {
  const params = useParams();
  const placeId = Number(Array.isArray(params?.placeId) ? params?.placeId[0] : params?.placeId);

  const { data: place } = useQuery({
    queryKey: ['place-update', placeId],
    enabled: Number.isFinite(placeId),
    queryFn: async () => (await multiGetPlaceDetails({ placeIds: [placeId] }))?.[0],
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('All');
  const [comments, setComments] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState('50');
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!place) return;
    setName(place.name || '');
    setDescription(place.description || '');
    if (place.maxPlayers) setMaxPlayers(String(place.maxPlayers));
  }, [place]);

  if (!placeId) return <p className="text-text-muted">No place specified.</p>;
  if (!place) return <p className="text-text-muted">Loading…</p>;

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateAsset({ assetId: placeId, name, description, genres: [genre], isCopyingAllowed: false, enableComments: comments });
      if (place.universeId) await setUniverseMaxPlayers({ universeId: place.universeId, maxPlayers: parseInt(maxPlayers, 10) || 1 });
      setMsg('Saved.');
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return setUploadMsg('Choose a .rbxl file first.');
    setUploadMsg(null);
    try {
      await uploadAssetVersion({ assetId: placeId, file });
      setUploadMsg('Uploaded new version.');
    } catch (e) {
      setUploadMsg((e as Error).message);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Configure Place</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">Basic Settings</h2>
        <label className="text-sm text-text-muted">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" />
        <label className="text-sm text-text-muted">Description</label>
        <textarea value={description} rows={6} onChange={(e) => setDescription(e.target.value)} className="rounded-rbx border border-border bg-surface px-3 py-2" />
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">Genre</span>
            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="h-9 rounded-rbx border border-border bg-surface px-2 text-sm">
              {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-text-muted">Max Players</span>
            <input type="number" min={1} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} className="w-28 rounded-rbx border border-border bg-surface px-2 py-1.5" />
          </label>
          <label className="mt-6 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /> Allow comments
          </label>
        </div>
        {msg ? <p className="text-sm text-text-muted">{msg}</p> : null}
        <div><Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">Upload Place File</h2>
        <input ref={fileRef} type="file" accept=".rbxl,.rbxlx" className="text-sm" />
        {uploadMsg ? <p className="text-sm text-text-muted">{uploadMsg}</p> : null}
        <div><Button variant="secondary" size="sm" onClick={upload}>Upload Version</Button></div>
      </Card>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getComments, createComment } from '../../../../../services/catalog';
import { useAuth } from '../../../../../components/providers/AuthProvider';
import Button from '../../../../../components/ui/Button';

interface Comment {
  Id: number;
  AuthorId: number;
  AuthorName: string;
  PostedDate: string;
  Text: string;
}

export default function Comments({ assetId }: { assetId: number }) {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['comments', assetId];

  const { data, isLoading } = useQuery<Comment[]>({
    queryKey,
    queryFn: async () => {
      const res = await getComments({ assetId, offset: 0 });
      return (res.Comments || []) as Comment[];
    },
  });

  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (posting || !text.trim()) return;
    setError(null);
    setPosting(true);
    try {
      const res = await createComment({ assetId, comment: text });
      if (res && res.ErrorCode) {
        setError(res.ErrorCode);
      } else {
        setText('');
        await queryClient.invalidateQueries({ queryKey });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {isAuthenticated ? (
        <form onSubmit={post} className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            rows={2}
            className="rounded-rbx border border-border bg-surface px-3 py-2 text-sm"
          />
          {error ? <p className="text-sm text-negative">{error}</p> : null}
          <div>
            <Button size="sm" type="submit" disabled={posting}>
              {posting ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </form>
      ) : null}

      {isLoading ? (
        <p className="text-text-muted">Loading comments…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-text-muted">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((c) => (
            <div key={c.Id} className="rounded-rbx bg-surface-alt p-3">
              <div className="flex items-baseline gap-2">
                <a href={`/users/${c.AuthorId}/profile`} className="font-semibold text-accent hover:underline">
                  {c.AuthorName}
                </a>
                <span className="text-xs text-text-muted">{c.PostedDate}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.Text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

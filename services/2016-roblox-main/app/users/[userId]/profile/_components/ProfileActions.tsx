'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getFriendStatus,
  sendFriendRequest,
  acceptFriendRequest,
  unfriendUser,
  followUser,
  unfollowUser,
  isAuthenticatedUserFollowingUserId,
} from '../../../../../services/friends';
import { useAuth } from '../../../../../components/providers/AuthProvider';
import Button from '../../../../../components/ui/Button';

/** Friend + follow + message buttons for another user's profile. */
export default function ProfileActions({ userId }: { userId: number }) {
  const { userId: authId, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const isSelf = authId === userId;

  const statusKey = ['friend-status', authId, userId];
  const { data: friendStatus } = useQuery<string>({
    queryKey: statusKey,
    enabled: isAuthenticated && !isSelf,
    queryFn: () => getFriendStatus({ authenticatedUserId: authId as number, userId }),
  });

  const followKey = ['following', authId, userId];
  const { data: isFollowing } = useQuery<boolean>({
    queryKey: followKey,
    enabled: isAuthenticated && !isSelf,
    queryFn: () => isAuthenticatedUserFollowingUserId({ userId }),
  });

  const refreshStatus = () => queryClient.invalidateQueries({ queryKey: statusKey });
  const refreshFollow = () => queryClient.invalidateQueries({ queryKey: followKey });

  const friendButton = () => {
    switch (friendStatus) {
      case 'Friends':
        return <Button size="sm" variant="secondary" onClick={async () => { await unfriendUser({ userId }); refreshStatus(); }}>Unfriend</Button>;
      case 'RequestReceived':
        return <Button size="sm" onClick={async () => { await acceptFriendRequest({ userId }); refreshStatus(); }}>Accept Request</Button>;
      case 'RequestSent':
        return <Button size="sm" variant="secondary" disabled>Request Sent</Button>;
      default:
        return <Button size="sm" onClick={async () => { await sendFriendRequest({ userId }); refreshStatus(); }}>Add Friend</Button>;
    }
  };

  const openTradeWindow = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(
      `/Trade/TradeWindow.aspx?TradePartnerID=${userId}`,
      '_blank',
      'scrollbars=0, height=608, width=914',
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isAuthenticated && !isSelf && (
        <>
          {friendButton()}
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              if (isFollowing) await unfollowUser({ userId });
              else await followUser({ userId });
              refreshFollow();
            }}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
          <a href={`/messages/compose?userId=${userId}`}>
            <Button size="sm" variant="secondary">Message</Button>
          </a>
          <Button size="sm" variant="secondary" onClick={openTradeWindow}>Trade</Button>
        </>
      )}
      <a href={`/users/${userId}/inventory`}>
        <Button size="sm" variant="secondary">Inventory</Button>
      </a>
      <a href={`/internal/collectibles?userId=${userId}`}>
        <Button size="sm" variant="secondary">Collectibles</Button>
      </a>
    </div>
  );
}

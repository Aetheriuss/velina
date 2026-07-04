'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../components/providers/AuthProvider';
import { changePassword, validateUsername, changeUsername, logoutFromAllOtherSessions } from '../../../services/auth';
import { getUserInfo } from '../../../services/users';
import { setUserDescription } from '../../../services/accountInformation';
import {
  getInventoryPrivacy,
  setInventoryPrivacy,
  getTradePrivacy,
  setTradePrivacy,
  getTradeValue,
  setTradeValue,
} from '../../../services/accountSettings';
import getFlag from '../../../lib/getFlag';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';

type Tab = 'Account Info' | 'Security' | 'Privacy';
const PRIVACY_OPTS = ['AllUsers', 'FriendsFollowingAndFollowers', 'FriendsAndFollowing', 'Friends', 'NoOne'];
const TRADE_VALUE_OPTS = ['None', 'Low', 'Medium', 'High'];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-text-muted">{label}</span>
      {children}
    </label>
  );
}
const input = 'rounded-rbx border border-border bg-surface px-3 py-2';

export default function AccountPage() {
  const { userId, username, isAuthenticated, isPending } = useAuth();
  const enabled = getFlag('myAccountPage2016Enabled', false) as boolean;
  const [tab, setTab] = useState<Tab>('Account Info');

  const { data: userInfo } = useQuery({ queryKey: ['user-info', userId], queryFn: () => getUserInfo({ userId: userId as number }), enabled: !!userId });

  // Bio
  const [bio, setBio] = useState('');
  const [bioMsg, setBioMsg] = useState<string | null>(null);
  useEffect(() => { if (userInfo?.description != null) setBio(userInfo.description); }, [userInfo]);

  // Password change
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  // Username change
  const [un, setUn] = useState({ username: '', password: '' });
  const [unMsg, setUnMsg] = useState<string | null>(null);

  if (!enabled) return <p className="text-center text-text-muted">The 2016 account settings page is disabled.</p>;
  if (isPending) return null;
  if (!isAuthenticated) return <p className="text-center text-text-muted">Please sign in to manage your account.</p>;

  const saveBio = async () => {
    setBioMsg(null);
    try { await setUserDescription({ newDescription: bio }); setBioMsg('Saved.'); } catch (e) { setBioMsg((e as Error).message); }
  };
  const doPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.next !== pw.confirm) return setPwMsg('New passwords do not match.');
    try { await changePassword({ existingPassword: pw.current, newPassword: pw.next }); setPwMsg('Password changed.'); setPw({ current: '', next: '', confirm: '' }); }
    catch (err) { setPwMsg((err as Error).message); }
  };
  const doUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnMsg(null);
    try {
      const v = await validateUsername({ username: un.username, context: 'UsernameChange' });
      if (v && v.code !== 0) return setUnMsg(v.message || 'Username is not available.');
      await changeUsername({ username: un.username, password: un.password });
      setUnMsg('Username changed. Refresh to see the update.');
    } catch (err) { setUnMsg((err as Error).message); }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">My Account</h1>
      <div className="flex gap-2">
        {(['Account Info', 'Security', 'Privacy'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`inline-flex h-9 items-center rounded-rbx px-3 text-sm font-semibold transition-colors ${tab === t ? 'bg-accent text-white' : 'bg-surface border border-border hover:bg-bg'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Account Info' ? (
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">Username</h2>
            <p className="text-sm text-text-muted">Current: <strong>{username}</strong></p>
            <form onSubmit={doUsername} className="flex flex-col gap-2">
              <Field label="New username"><input className={input} value={un.username} onChange={(e) => setUn({ ...un, username: e.target.value })} /></Field>
              <Field label="Password"><input type="password" className={input} value={un.password} onChange={(e) => setUn({ ...un, password: e.target.value })} /></Field>
              {unMsg ? <p className="text-sm text-text-muted">{unMsg}</p> : null}
              <div><Button size="sm" type="submit">Change Username</Button></div>
            </form>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">Password</h2>
            <form onSubmit={doPassword} className="flex flex-col gap-2">
              <Field label="Current password"><input type="password" className={input} value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
              <Field label="New password"><input type="password" className={input} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
              <Field label="Confirm new password"><input type="password" className={input} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></Field>
              {pwMsg ? <p className="text-sm text-text-muted">{pwMsg}</p> : null}
              <div><Button size="sm" type="submit">Change Password</Button></div>
            </form>
          </Card>

          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">Bio</h2>
            <textarea className={input} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            {bioMsg ? <p className="text-sm text-text-muted">{bioMsg}</p> : null}
            <div><Button size="sm" onClick={saveBio}>Save Bio</Button></div>
          </Card>
        </div>
      ) : tab === 'Security' ? (
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">Security</h2>
          <p className="text-sm text-text-muted">Sign out everywhere else if you think someone else is using your account.</p>
          <div><Button size="sm" variant="secondary" onClick={() => logoutFromAllOtherSessions()}>Sign out of all other sessions</Button></div>
        </Card>
      ) : (
        <PrivacyTab />
      )}
    </div>
  );
}

function PrivacyTab() {
  const inv = useQuery({ queryKey: ['inv-privacy'], queryFn: getInventoryPrivacy });
  const trade = useQuery({ queryKey: ['trade-privacy'], queryFn: getTradePrivacy });
  const value = useQuery({ queryKey: ['trade-value'], queryFn: getTradeValue });

  const asStr = (v: unknown) => (typeof v === 'string' ? v : (v as { tradePrivacy?: string; tradeValue?: string })?.tradePrivacy || (v as { tradeValue?: string })?.tradeValue || '');

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-semibold">Privacy</h2>
      <Field label="Who can see my inventory">
        <select defaultValue={asStr(inv.data)} onChange={(e) => setInventoryPrivacy({ newPrivacy: e.target.value })} className={input}>
          {PRIVACY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Who can trade with me">
        <select defaultValue={asStr(trade.data)} onChange={(e) => setTradePrivacy({ newPrivacy: e.target.value })} className={input}>
          {PRIVACY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
      <Field label="Trade quality filter">
        <select defaultValue={asStr(value.data)} onChange={(e) => setTradeValue({ newValue: e.target.value })} className={input}>
          {TRADE_VALUE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>
    </Card>
  );
}

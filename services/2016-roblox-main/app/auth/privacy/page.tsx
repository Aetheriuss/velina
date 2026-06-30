import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Information' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl py-6">
      <h1 className="mb-4 text-3xl font-bold">Privacy Information</h1>
      <p className="text-sm text-text-muted">Last Updated June 29, 2026</p>
      <p className="mt-3">Here&apos;s a list of the type of data we store, as well as how you can delete it.</p>
      <ul className="mt-3 list-disc space-y-3 pl-6">
        <li>
          <span className="font-bold">If all you do is visit the website</span> (without logging in),
          the only data stored is your user agent, used purely for detecting bots. It is cleared
          roughly every 3 months.
        </li>
        <li>
          <span className="font-bold">If you create an account</span>, your username and password are
          both stored (your password hashed using argon2), as well as your account creation date and
          any on-site data generated at creation (avatar, thumbnail, etc). Your hashed IP address is
          also stored for about 1 hour, never directly linked to your account.
        </li>
        <li>
          <span className="font-bold">If you login to an account</span>, your hashed IP address is
          stored for about 1 hour, along with a count of login attempts (never directly linked to your
          account).
        </li>
        <li>
          <span className="font-bold">If you join a game</span>, your IP address is stored in a JSON
          file sent to your browser for client/server authentication. It is never stored on our
          servers, but giving the ticket to someone could expose your IP to them.
        </li>
      </ul>
      <p className="mt-4">
        Any information you directly input (description, status, etc.) is saved. When you delete your
        account, all information is deleted, aside from content you have uploaded (such as images).
      </p>
      <p className="mt-3">
        You can request an account deletion by{' '}
        <a href="/auth/account-deletion" className="text-accent hover:underline">
          clicking here
        </a>
        , however you must be offline for one week before you can delete your account.
      </p>
    </article>
  );
}

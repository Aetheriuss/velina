import React from 'react';
import type { Metadata } from 'next';
import Card from '../../../components/ui/Card';

export const metadata: Metadata = { title: 'Terms of Service' };

const Rule = ({ bold, children }: { bold: string; children?: React.ReactNode }) => (
  <li className="mb-2">
    <span className="font-bold">{bold}</span> {children}
  </li>
);

export default function TosPage() {
  return (
    <Card className="max-w-3xl text-text">
      <h1 className="mb-1 text-2xl font-semibold text-text">Terms of Service</h1>
      <p className="text-sm text-text-muted">Last Updated June 29, 2026</p>
      <p className="mt-3">
        This is essentially just a list of rules for our platform. We reserve the right to update
        this at any time without any notice, so check here frequently in case the terms are updated.
        For privacy information,{' '}
        <a href="/auth/privacy" className="text-accent hover:underline">
          click here
        </a>
        .
      </p>
      <p className="mt-3">
        A violation of any of these rules could result in a temporary OR permanent ban. New accounts
        will usually be permanently banned on their first infraction, while older accounts might be
        given temporary bans (e.g. 1 day or 1 week) depending on the severity.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-text">Text Guidelines</h2>
      <p className="text-text-muted">
        These apply to all text inputs on the site, such as in-game chat.
      </p>
      <ul className="mt-2 list-disc pl-6">
        <Rule bold="Do not discriminate or harass people.">
          Light swearing is OK, but don&apos;t use slurs as an insult.
        </Rule>
        <Rule bold="Do not reveal personal information pertaining to yourself or others." />
        <Rule bold="Try not to start drama.">
          For example, do not create posts &quot;exposing&quot; someone. If you are concerned about a
          user, you should send a message to a moderator.
        </Rule>
        <Rule bold="Do not excessively advertise websites, YouTube channels, or other off-platform URLs.">
          You can mention stuff like &quot;Hey, I own example.com&quot;, but spamming &quot;join my
          site&quot; will get you banned.
        </Rule>
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-text">Image Guidelines</h2>
      <p className="text-text-muted">
        As well as the above, these guidelines apply to images uploaded to the site:
      </p>
      <ul className="mt-2 list-disc pl-6">
        <Rule bold="Do not upload violent content.">Examples include gore, violent scenes, etc.</Rule>
        <Rule bold="Do not upload content with real people.">
          Exceptions will be made for celebrities if it&apos;s obvious who they are.
        </Rule>
        <Rule bold="Do not upload pornographic content featuring underage characters." />
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-text">Other Notes</h2>
      <ul className="mt-2 list-disc pl-6">
        <Rule bold="You are responsible for the security of your account.">
          Password resets are done on a case-by-case basis. Pick a strong password — if you forget it
          or someone guesses it, you may permanently lose access to your account.
        </Rule>
        <Rule bold="A few alternate accounts is OK.">
          Please don&apos;t abuse alternate accounts (e.g. to evade bans or manipulate the economy).
        </Rule>
        <Rule bold="Do not use the advertising system for URLs not relevant to this website.">
          Discord servers pertaining to this website (or old Roblox in general) would be OK; unknown
          websites, your YouTube channel, etc. would not.
        </Rule>
      </ul>
    </Card>
  );
}

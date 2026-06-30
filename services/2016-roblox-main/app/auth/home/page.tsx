import React from 'react';
import type { Metadata } from 'next';
import DiscordButton from '../_components/DiscordButton';

export const metadata: Metadata = {
  title: 'Relive 2016 with velina.lol',
  description:
    'Relive 2016. Free, no invite keys required, and completely browser based. The most secure and private website of its kind.',
};

const Point = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
  <div className="flex gap-4">
    <div className="text-3xl">{icon}</div>
    <p>
      <span className="font-bold">{title} </span>
      {children}
    </p>
  </div>
);

/** Logged-out landing (re-skinned port of the Razor /auth/home). */
export default function AuthHomePage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-rbx">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/UnsecuredContent/ImageFive.webp"
          alt=""
          className="h-[360px] w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 flex flex-col justify-center bg-black/30 p-6 text-white sm:p-12">
          <h1 className="text-4xl font-black drop-shadow sm:text-6xl">Relive 2016.</h1>
          <p className="mt-2 max-w-xl font-medium drop-shadow">
            Free, no invite keys required, and completely browser based. The most secure and private
            website of its kind.
          </p>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-light">How do I join?</h2>
        <p className="mt-2 text-text-muted">
          Signing up takes seconds — just continue with your Discord account. No invite keys, no
          application to fill out.
        </p>
        <div className="mt-4">
          <DiscordButton />
        </div>
      </section>

      <section className="rounded-rbx bg-nav-bg p-8 text-white">
        <h2 className="mb-6 text-2xl font-light">What makes this place different?</h2>
        <div className="flex flex-col gap-6">
          <Point icon="🔑" title="No invite key required.">
            Just sign up with your Discord account — no friend group, no tracking servers, no buying
            keys.
          </Point>
          <Point icon="🔒" title="A focus on privacy and security.">
            The game client runs entirely in your browser, eliminating many attacks. Your IP is only
            stored hashed and temporarily, and never directly linked to your account.
          </Point>
          <Point icon="💬" title="We moderate at all times.">
            We always have staff working — you could work for this site one day if you&apos;re active
            enough!
          </Point>
        </div>
      </section>
    </div>
  );
}

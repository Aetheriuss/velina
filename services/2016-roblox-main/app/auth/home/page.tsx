import React from 'react';
import type { Metadata } from 'next';
import DiscordButton from '../_components/DiscordButton';

export const metadata: Metadata = {
  title: 'Relive 2016 with velina.lol',
  description:
    'Relive 2016. Free, no invite keys required, and completely browser based. The most secure and private website of its kind.',
};

const Point = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
  <div className="rounded-rbx border border-border bg-surface p-6 shadow-rbx">
    <div className="mb-3 text-3xl">{icon}</div>
    <h3 className="mb-1 font-bold">{title}</h3>
    <p className="text-sm text-text-muted">{children}</p>
  </div>
);

/** Logged-out landing (re-skinned port of the Razor /auth/home). */
export default function AuthHomePage() {
  return (
    <div className="flex flex-col gap-14 py-2">
      <section className="relative overflow-hidden rounded-rbx shadow-rbx">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/UnsecuredContent/ImageFive.webp"
          alt=""
          className="h-[420px] w-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/80 via-black/50 to-black/20 p-6 text-white sm:p-12">
          <h1 className="text-4xl font-black drop-shadow sm:text-6xl">Relive 2016.</h1>
          <p className="mt-3 max-w-xl text-lg font-medium text-white/90 drop-shadow">
            Free, no invite keys required, and completely browser based. The most secure and private
            website of its kind.
          </p>
          <div className="mt-6">
            <DiscordButton />
          </div>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-semibold text-text">What makes this place different?</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
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

      <section className="rounded-rbx bg-nav-bg p-10 text-center text-white shadow-rbx">
        <h2 className="text-2xl font-semibold">How do I join?</h2>
        <p className="mx-auto mt-2 max-w-lg text-white/70">
          Signing up takes seconds — just continue with your Discord account. No invite keys, no
          application to fill out.
        </p>
        <div className="mt-5 flex justify-center">
          <DiscordButton />
        </div>
      </section>
    </div>
  );
}

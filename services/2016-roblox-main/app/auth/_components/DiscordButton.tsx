import React from 'react';

/**
 * Starts the Discord OAuth flow. This is a plain anchor (full navigation) to the .NET endpoint
 * /auth/discord/login, which stays on the backend — it sets the es_discord_state cookie and
 * redirects to discord.com. Do not turn this into a client fetch.
 */
export default function DiscordButton({ className = '' }: { className?: string }) {
  return (
    <a
      href="/auth/discord/login"
      className={`inline-flex items-center justify-center gap-2 rounded-rbx px-5 py-2.5 font-bold text-white transition-opacity hover:opacity-90 ${className}`}
      style={{ backgroundColor: '#5865F2' }}
    >
      Continue with Discord
    </a>
  );
}

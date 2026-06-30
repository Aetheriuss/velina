'use client';

import React from 'react';
import { useTheme } from '../../components/providers/ThemeProvider';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

/**
 * Scaffold/verification page for the App Router migration (Phase 0).
 * Proves: tokens resolve, light/dark toggle works, ui primitives render, and
 * the app shell (navbar/footer/providers) is wired. Remove once real routes land.
 */
export default function UiPreviewPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">2020 UI scaffold</h1>
        <p className="text-text-muted">
          Active theme: <strong>{theme}</strong>
        </p>
        <Button className="mt-2" variant="secondary" onClick={toggleTheme}>
          Toggle theme
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="font-semibold">Surface card</h2>
          <p className="text-text-muted text-sm">Rounded 2020 surface with token-driven colors.</p>
        </Card>
        <Card>
          <h2 className="font-semibold text-accent">Accent text</h2>
          <p className="text-text-muted text-sm">#00A2FF accent in both themes.</p>
        </Card>
        <Card>
          <h2 className="font-semibold text-positive">Positive</h2>
          <p className="text-text-muted text-sm">Economy/positive token sample.</p>
        </Card>
      </div>
    </div>
  );
}

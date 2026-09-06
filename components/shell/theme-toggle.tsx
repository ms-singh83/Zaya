'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { THEME_STORAGE_KEY } from './theme-script';

type ThemeChoice = 'light' | 'dark' | 'system';

const NEXT: Record<ThemeChoice, ThemeChoice> = { system: 'light', light: 'dark', dark: 'system' };
const ICON: Record<ThemeChoice, React.ComponentType<{ className?: string }>> = { system: Monitor, light: Sun, dark: Moon };
const LABEL: Record<ThemeChoice, string> = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' };

function readStored(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function apply(choice: ThemeChoice) {
  if (choice === 'system') {
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } else {
    document.documentElement.setAttribute('data-theme', choice);
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  }
}

/** Cycles system -> light -> dark -> system. One button, three states. */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => {
    setChoice(readStored());
  }, []);

  const Icon = ICON[choice];

  return (
    <button
      type="button"
      onClick={() => {
        const next = NEXT[choice];
        apply(next);
        setChoice(next);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded text-muted hover:bg-elevated hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      aria-label={`Theme: ${LABEL[choice]}. Click to change.`}
      title={LABEL[choice]}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

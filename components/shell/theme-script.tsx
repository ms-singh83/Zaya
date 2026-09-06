const THEME_STORAGE_KEY = 'zaya-theme';

/**
 * Applies a stored 'light' | 'dark' choice to <html data-theme> before hydration,
 * so there is no flash of the wrong theme. 'system' (the default) stores nothing
 * and leaves the attribute unset, so `@media (prefers-color-scheme)` in
 * app/globals.css decides. Runs as an inline, synchronous script because a React
 * effect would run after first paint.
 */
export function ThemeScript() {
  const script = `
    try {
      var t = localStorage.getItem('${THEME_STORAGE_KEY}');
      if (t === 'light' || t === 'dark') {
        document.documentElement.setAttribute('data-theme', t);
      }
    } catch (e) {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export { THEME_STORAGE_KEY };

import { useEffect, useState } from 'react';
export function permitsG1Preview(development: boolean, search: string): boolean { return development && new URLSearchParams(search).get('g1') === 'preview'; }
/** Hydrated explicit opt-in; compiled production builds can never enable this UI. */
export function useG1Preview() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { const read = () => setEnabled(permitsG1Preview(import.meta.env.DEV, window.location.search)); read(); window.addEventListener('popstate', read); return () => window.removeEventListener('popstate', read); }, []);
  return enabled;
}

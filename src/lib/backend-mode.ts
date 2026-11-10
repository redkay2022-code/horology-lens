// Server (real account) mode is the default. Set VITE_BACKEND_MODE=demo to run the session-only demo
// with mock community state and the DEMO role switcher.
export const isDemoMode = import.meta.env['VITE_BACKEND_MODE'] === 'demo';

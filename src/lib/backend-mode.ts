// Explicit mode switch. Demo (mock) mode is the default so existing session-only flows keep working;
// set VITE_BACKEND_MODE=server to disable DEMO role switching (production mode).
export const isDemoMode = import.meta.env['VITE_BACKEND_MODE'] !== 'server';

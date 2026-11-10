import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/lib/backend-mode', () => ({ isDemoMode: false }));
vi.mock('@tanstack/react-router', async (o) => ({ ...(await o<object>()), useNavigate: () => () => {}, Link: (p: { children?: unknown }) => p.children }));
import { Route } from '@/routes/profile';
import { HorologyProvider } from '@/components/horology/store';

// Server mode, signed out: the real account profile asks for sign-in and never
// falls back to the demo identity, mock counts or illustrative values.
describe('Profile in server mode (signed out)', () => {
  it('asks for sign-in and shows no demo identity or mock values', async () => {
    const C = Route.options.component!;
    render(<QueryClientProvider client={new QueryClient()}><HorologyProvider><C /></HorologyProvider></QueryClientProvider>);
    await waitFor(() => expect(screen.getByText('Sign in to view your profile and private collection.')).toBeTruthy());
    expect(screen.queryByText(/Alex Morgan/)).toBeNull();
    expect(screen.queryByText('1.2K')).toBeNull();
    expect(screen.queryByText('248')).toBeNull();
    expect(screen.queryByText('Estimated collection value')).toBeNull();
    expect(screen.queryByText(/DEMO/)).toBeNull();
  });
});

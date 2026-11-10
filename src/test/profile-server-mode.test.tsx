import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/backend-mode', () => ({ isDemoMode: false }));
vi.mock('@tanstack/react-router', async (o) => ({ ...(await o<object>()), useNavigate: () => () => {}, Link: (p: { children?: unknown }) => p.children }));
import { Route } from '@/routes/profile';
import { HorologyProvider } from '@/components/horology/store';

describe('Profile collection in server mode', () => {
  it('shows the unavailable state instead of sample watches or values', () => {
    const C = Route.options.component!;
    render(<HorologyProvider><C /></HorologyProvider>);
    expect(screen.getByText('Your private collection will appear here when account integration is available.')).toBeTruthy();
    expect(screen.queryByText('Estimated collection value')).toBeNull();
    expect(document.querySelector('.velvet-tray')).toBeNull();
  });
});

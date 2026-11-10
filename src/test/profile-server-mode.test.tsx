import { render, screen, fireEvent } from '@testing-library/react';
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

  it('hides mock follower and following counts', () => {
    const C = Route.options.component!;
    render(<HorologyProvider><C /></HorologyProvider>);
    expect(screen.queryByText('1.2K')).toBeNull();
    expect(screen.queryByText('248')).toBeNull();
    expect(screen.getAllByText('—').length).toBe(3);
  });

  it('shows an unavailable state in the Videos tab instead of sample films', () => {
    const C = Route.options.component!;
    render(<HorologyProvider><C /></HorologyProvider>);
    fireEvent.click(screen.getByRole('tab', { name: 'Videos' }));
    expect(document.querySelector('.profile-videos')).toBeNull();
    expect(screen.getByText('Your wrist stories will appear here when account integration is available.')).toBeTruthy();
    expect(screen.queryByText('films')).toBeNull();
  });
});

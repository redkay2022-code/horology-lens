import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@tanstack/react-router', async (o) => ({ ...(await o<object>()), useNavigate: () => () => {}, Link: (p: { children?: unknown }) => p.children }));
import { Route } from '@/routes/profile';
import { HorologyProvider } from '@/components/horology/store';

describe('Profile in demo mode', () => {
  it('keeps sample counts, collection value and sample films', () => {
    const C = Route.options.component!;
    render(<HorologyProvider><C /></HorologyProvider>);
    expect(screen.getByText('1.2K')).toBeTruthy();
    expect(screen.getByText('248')).toBeTruthy();
    expect(screen.getByText('Estimated collection value')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Videos' }));
    expect(document.querySelectorAll('.profile-videos button').length).toBeGreaterThan(0);
    expect(screen.queryByText('Your wrist stories will appear here when account integration is available.')).toBeNull();
  });
});

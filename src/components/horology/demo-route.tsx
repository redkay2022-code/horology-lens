import { createContext, useContext, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

// True only inside the development-only /demo preview routes, so collector links stay inside the demo.
export const DemoRouteContext = createContext(false);
export const useInDemoRoute = () => useContext(DemoRouteContext);
/** URL form of the same check, for components rendered outside the /demo route tree (the shell). Always false in production builds. */
export const isDemoPath = (path: string): boolean => import.meta.env.DEV && (path === '/demo' || path.startsWith('/demo/'));

type CollectorLinkProps = { handle: string; className?: string; 'aria-label'?: string; children?: ReactNode };

/** Collector profile link: /demo/collector/$handle inside the /demo preview, /creator/$handle everywhere else. */
export function CollectorLink({ handle, ...rest }: CollectorLinkProps) {
  return useInDemoRoute()
    ? <Link {...rest} to="/demo/collector/$handle" params={{ handle }} />
    : <Link {...rest} to="/creator/$handle" params={{ handle }} />;
}

/** Floating dev-preview switch between the real home (/) and the /demo feed. Renders nothing in production builds. */
export function DemoSwitchLink({ to }: { to: '/demo' | '/' }) {
  // Inline check: import.meta.env.DEV becomes the literal false in production, so the minifier drops the switch entirely.
  if (!import.meta.env.DEV) return null;
  return <Button asChild variant="outline" size="sm" className="demo-switch">
    {to === '/demo'
      ? <Link to="/demo" aria-label="시연 보기 (개발 미리보기 전용)"><Clapperboard size={14} />시연 보기</Link>
      : <Link to="/" aria-label="기본 홈으로 돌아가기"><ArrowLeft size={14} />기본 홈</Link>}
  </Button>;
}

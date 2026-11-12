import { createContext, useContext, type ReactNode } from 'react';
import { Link, useNavigate, useRouter } from '@tanstack/react-router';
import { ArrowLeft, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

// True only inside the development-only /demo preview routes, so collector links stay inside the demo.
export const DemoRouteContext = createContext(false);
export const useInDemoRoute = () => useContext(DemoRouteContext);
/** URL form of the same check, for components rendered outside the /demo route tree (the shell). Always false in production builds. */
export const isDemoPath = (path: string): boolean => import.meta.env.DEV && (path === '/demo' || path.startsWith('/demo/'));

/** Demo-only destinations for features that have no demo screen yet (rendered as an in-demo Coming Soon notice). */
export const demoSoonSections = ['live-bids', 'chats', 'notifications', 'messages', 'settings', 'profile'] as const;
export type DemoSoonSection = typeof demoSoonSections[number];

/** Share link for a post: demo posts point back into the dev-only /demo feed, never the real home. */
export const postShareUrl = (origin: string, id: string, inDemo: boolean) => `${origin}${inDemo ? '/demo' : '/'}?watch=${encodeURIComponent(id)}`;

// Previous in-app path, tracked by the shell, so demo Back buttons only step back when the previous page was a demo page.
let currentPath: string | null = null;
let previousPath: string | null = null;
export const notePath = (path: string) => { if (path === currentPath) return; previousPath = currentPath; currentPath = path; };

/** Back inside the demo: history back when the previous page was a demo page, otherwise the /demo feed (never a real page). */
export function useDemoBack() {
  const router = useRouter(); const navigate = useNavigate();
  return () => { if (previousPath && isDemoPath(previousPath) && router.history.canGoBack()) router.history.back(); else void navigate({ to: '/demo' }); };
}
export function DemoBackButton({ label = 'Back' }: { label?: string }) {
  const back = useDemoBack();
  return <Button variant="ghost" size="icon" aria-label={label} onClick={back}><ArrowLeft size={19} /></Button>;
}

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

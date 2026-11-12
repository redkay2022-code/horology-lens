import { createContext, useContext, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

// True only inside the development-only /demo preview routes, so collector links stay inside the demo.
export const DemoRouteContext = createContext(false);
export const useInDemoRoute = () => useContext(DemoRouteContext);

type CollectorLinkProps = { handle: string; className?: string; 'aria-label'?: string; children?: ReactNode };

/** Collector profile link: /demo/collector/$handle inside the /demo preview, /creator/$handle everywhere else. */
export function CollectorLink({ handle, ...rest }: CollectorLinkProps) {
  return useInDemoRoute()
    ? <Link {...rest} to="/demo/collector/$handle" params={{ handle }} />
    : <Link {...rest} to="/creator/$handle" params={{ handle }} />;
}

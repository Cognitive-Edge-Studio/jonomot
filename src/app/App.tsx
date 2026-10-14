import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, useLocation, useRoutes } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import type { Role } from '../../shared/contracts';
import { DemoStateProvider, useDemoSession, useDemoState } from '../shared/state';
import { researcherAdminRoutes } from '../features/researcher-admin';
import { respondentRoutes } from '../features/respondent';
import { DemoToolbar } from './DemoToolbar';
import { LandingPage } from './LandingPage';
import { roleForPath } from './navigation';
import './app.css';

function roleRoutes(): RouteObject[] {
  return [
    ...researcherAdminRoutes.map((route) => ({ ...route, element: <RoleBoundary role={roleForPath(route.path ?? '')!}>{route.element}</RoleBoundary> })),
    ...respondentRoutes.map((route) => ({ ...route, element: <RoleBoundary role="respondent"><RespondentPreview>{route.element}</RespondentPreview></RoleBoundary> })),
  ];
}

function RouteContent() {
  const location = useLocation();
  const routes = useMemo(() => [{ path: '/', element: <LandingPage /> }, ...roleRoutes(), { path: '*', element: <Navigate to="/" replace /> }], []);
  const content = useRoutes(routes);
  return <div className="app-route" key={location.pathname}>{content}</div>;
}

function RoleBoundary({ role, children }: { role: Role; children: ReactNode }) {
  const { state, loading, error } = useDemoState();
  const { user } = useDemoSession();
  if (loading && !state) return <main className="route-guard" role="status"><span className="route-guard__loading" />Loading your workspace…</main>;
  if (error && !state) return <main className="route-guard" role="alert"><h1>Demo data is unavailable</h1><p>{error}</p><Link to="/">Return to Jonomot</Link></main>;
  if (!user || user.role !== role) {
    const title = role === 'researcher' ? 'Researcher workspace' : role === 'admin' ? 'Admin review workspace' : 'Participant experience';
    return <main className="route-guard"><div className="route-guard__icon"><ShieldCheck aria-hidden="true" /></div><p className="app-eyebrow">A DIFFERENT PERSPECTIVE</p><h1>{title}</h1><p>{user ? `This workspace belongs to the ${role} role. You are currently exploring as ${user.name}.` : `Choose a ${role} persona to explore this part of the journey.`}</p><Link className="route-guard__button" to="/">Choose a persona<ArrowRight size={16} aria-hidden="true" /></Link></main>;
  }
  return <>{children}</>;
}

function RespondentPreview({ children }: { children: ReactNode }) {
  return <main className="respondent-preview"><div className="respondent-preview__label"><span>PARTICIPANT EXPERIENCE</span><span>PHONE PREVIEW</span></div><div className="respondent-phone"><span className="respondent-phone__camera" aria-hidden="true" />{children}</div></main>;
}

function AppLayout() {
  const location = useLocation();
  useLayoutEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); }, [location.pathname]);
  return <>{location.pathname !== '/' && <DemoToolbar />}<RouteContent /></>;
}

export function App() {
  return <DemoStateProvider><BrowserRouter><AppLayout /></BrowserRouter></DemoStateProvider>;
}

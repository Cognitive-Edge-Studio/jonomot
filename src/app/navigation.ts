import type { DemoUser, Role } from '../../shared/contracts';

export const roleForPath = (path: string): Role | null => path.startsWith('/respondent') ? 'respondent' : path.startsWith('/admin') ? 'admin' : path.startsWith('/researcher') ? 'researcher' : null;
export const routeForUser = (user: DemoUser) => user.role === 'researcher' ? '/researcher' : user.role === 'admin' ? '/admin/reviews' : user.onboardingComplete ? '/respondent/explore' : '/respondent/onboarding';

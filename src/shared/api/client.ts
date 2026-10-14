import type { CommandResult, DemoCommand, DemoState, ErrorEnvelope } from '../../../shared/contracts';
import { browserDemoEnabled } from './mode';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const apiUrl = (path: string) => `${apiBaseUrl}${path}`;
const demo = async () => (await import('../demo/browserDemo')).browserDemo;

export class DemoApiError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) { super(message); this.name = 'DemoApiError'; }
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), { ...init, headers: { 'content-type': 'application/json', ...init.headers } });
  const body = await response.json().catch(() => null) as T | ErrorEnvelope | null;
  if (!response.ok) {
    const error = body && typeof body === 'object' && 'error' in body ? body.error : { code: 'HTTP_ERROR', message: `Request failed (${response.status})` };
    throw new DemoApiError(error.message, error.code, response.status);
  }
  if (body === null) throw new DemoApiError('The server returned an empty response.', 'EMPTY_RESPONSE', response.status);
  return body as T;
}
export const api = {
  health: async () => browserDemoEnabled
    ? { status: 'ok' as const, revision: (await (await demo()).getState()).revision }
    : request<{ status: 'ok'; revision: number }>('/api/health'),
  getState: async () => browserDemoEnabled ? (await demo()).getState() : request<DemoState>('/api/state'),
  execute: async (command: DemoCommand, userId: string) => browserDemoEnabled
    ? (await demo()).execute(command, userId)
    : request<CommandResult>('/api/commands', { method: 'POST', headers: { 'x-demo-user-id': userId }, body: JSON.stringify(command) }),
  exportSurveyCsv: async (surveyId: string, userId?: string): Promise<Blob> => {
    const actingUserId = userId ?? (typeof window === 'undefined' ? null : window.sessionStorage.getItem('jonomot:persona'));
    if (browserDemoEnabled) {
      if (!actingUserId) throw new DemoApiError('Choose a demo persona before exporting.', 'ACTOR_REQUIRED', 401);
      return (await demo()).exportSurveyCsv(surveyId, actingUserId);
    }
    const response = await fetch(apiUrl(`/api/exports/surveys/${encodeURIComponent(surveyId)}.csv`), { headers: actingUserId ? { 'x-demo-user-id': actingUserId } : {} });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as ErrorEnvelope | null;
      throw new DemoApiError(body?.error.message ?? `Export failed (${response.status})`, body?.error.code ?? 'EXPORT_ERROR', response.status);
    }
    return response.blob();
  },
};

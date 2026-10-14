import type { CommandResult, DemoCommand, DemoState, ErrorEnvelope } from '../../../shared/contracts';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const apiUrl = (path: string) => `${apiBaseUrl}${path}`;

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
  health: () => request<{ status: 'ok'; revision: number }>('/api/health'),
  getState: () => request<DemoState>('/api/state'),
  execute: (command: DemoCommand, userId: string) => request<CommandResult>('/api/commands', { method: 'POST', headers: { 'x-demo-user-id': userId }, body: JSON.stringify(command) }),
  exportSurveyCsv: async (surveyId: string, userId?: string): Promise<Blob> => {
    const actingUserId = userId ?? (typeof window === 'undefined' ? null : window.sessionStorage.getItem('jonomot:persona'));
    const response = await fetch(apiUrl(`/api/exports/surveys/${encodeURIComponent(surveyId)}.csv`), { headers: actingUserId ? { 'x-demo-user-id': actingUserId } : {} });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as ErrorEnvelope | null;
      throw new DemoApiError(body?.error.message ?? `Export failed (${response.status})`, body?.error.code ?? 'EXPORT_ERROR', response.status);
    }
    return response.blob();
  },
};

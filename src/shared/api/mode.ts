const mode = import.meta.env.VITE_DEMO_MODE?.trim();
const hasExternalApi = Boolean(import.meta.env.VITE_API_BASE_URL?.trim());

// Static deployments have no server. API mode is an explicit deployment choice.
export const browserDemoEnabled = mode === 'browser'
  || (mode !== 'api' && import.meta.env.PROD && !hasExternalApi);

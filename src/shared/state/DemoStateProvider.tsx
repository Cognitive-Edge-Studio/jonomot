import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CommandResult, DemoCommand, DemoState, DemoUser } from '../../../shared/contracts';
import { api } from '../api';

interface StateContextValue { state: DemoState | null; loading: boolean; error: string | null; refresh: () => Promise<void>; execute: (command: DemoCommand) => Promise<CommandResult>; pending: boolean; commandError: string | null; userId: string | null; user: DemoUser | null; setPersona: (userId: string) => void; clearPersona: () => void }
const StateContext = createContext<StateContextValue | null>(null);
const PERSONA_KEY = 'jonomot:persona';
export function DemoStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(() => sessionStorage.getItem(PERSONA_KEY));
  const lastResetGeneration = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await api.getState();
      setState(next); setError(null);
      if (lastResetGeneration.current !== null && lastResetGeneration.current !== next.resetGeneration) {
        sessionStorage.removeItem(PERSONA_KEY); setUserId(null);
        window.dispatchEvent(new CustomEvent('jonomot:reset'));
      }
      lastResetGeneration.current = next.resetGeneration;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load demo state.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 2000);
    const onFocus = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onFocus); document.addEventListener('visibilitychange', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [refresh]);

  const setPersona = useCallback((id: string) => { sessionStorage.setItem(PERSONA_KEY, id); setUserId(id); }, []);
  const clearPersona = useCallback(() => { sessionStorage.removeItem(PERSONA_KEY); setUserId(null); }, []);
  const execute = useCallback(async (command: DemoCommand) => {
    if (!userId) { const message = 'Choose a demo persona before continuing.'; setCommandError(message); throw new Error(message); }
    setPending(true); setCommandError(null);
    try { const result = await api.execute(command, userId); setState(result.state); return result; }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Command failed.'; setCommandError(message); throw cause; }
    finally { setPending(false); }
  }, [userId]);
  const user = state?.users.find((item) => item.id === userId) ?? null;
  const value = useMemo(() => ({ state, loading, error, refresh, execute, pending, commandError, userId, user, setPersona, clearPersona }), [state, loading, error, refresh, execute, pending, commandError, userId, user, setPersona, clearPersona]);
  return <StateContext.Provider value={value}>{children}</StateContext.Provider>;
}
function useContextValue() { const value = useContext(StateContext); if (!value) throw new Error('Demo state hooks must be used within DemoStateProvider.'); return value; }
export function useDemoState() { const { state, loading, error, refresh } = useContextValue(); return { state, loading, error, refresh }; }
export function useDemoCommand() { const { execute, pending, commandError } = useContextValue(); return { execute, pending, error: commandError }; }
export function useDemoSession() { const { userId, user, setPersona, clearPersona } = useContextValue(); return { userId, user, setPersona, clearPersona }; }

import type { CommandResult, DemoCommand, DemoState } from '../../../shared/contracts';
import seed from './seed.json';
import { advanceDemo } from './advance';
import { surveyCsv } from './csv';
import { applyCommand } from './domain';
import { DomainError } from './errors';
import { validateState } from './validation';

const STORAGE_KEY = 'jonomot:browser-demo:v1';
let memory: DemoState | undefined;
let storageAvailable = true;
let queue: Promise<unknown> = Promise.resolve();

function freshState(): DemoState {
  const state = structuredClone(seed) as unknown as DemoState;
  validateState(state);
  return state;
}

function read(): DemoState {
  if (storageAvailable) {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(STORAGE_KEY); }
    catch { storageAvailable = false; }
    if (raw) {
      try {
        const state = JSON.parse(raw) as DemoState;
        validateState(state);
        memory = state;
        return structuredClone(state);
      } catch {
        // A damaged fictional fixture can be replaced without touching an API.
        memory = freshState();
      }
    }
  }
  return structuredClone(memory ?? freshState());
}

function save(state: DemoState): void {
  validateState(state);
  if (storageAvailable) {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { storageAvailable = false; }
  }
  // Restricted storage still permits a working demo for this page session.
  memory = structuredClone(state);
}

function exclusive<T>(operation: () => T): Promise<T> {
  if (navigator.locks?.request) return navigator.locks.request(STORAGE_KEY, operation);
  const result = queue.then(operation);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

export const browserDemo = {
  getState: (): Promise<DemoState> => exclusive(() => {
    const state = read();
    if (advanceDemo(state)) state.revision += 1;
    save(state);
    return structuredClone(state);
  }),
  execute: (command: DemoCommand, actorId: string): Promise<CommandResult> => exclusive(() => {
    const current = read();
    if (!current.users.some((user) => user.id === actorId)) throw new DomainError('UNKNOWN_PERSONA', 'Choose a valid demo persona.', 401);
    if (command.type === 'RESET_DEMO') {
      if (command.payload.confirm !== true) throw new DomainError('RESET_CONFIRMATION_REQUIRED', 'Confirm reset to restore the fictional demo.');
      const state = freshState();
      state.revision = current.revision + 1;
      state.resetGeneration = current.resetGeneration + 1;
      save(state);
      return { state: structuredClone(state) };
    }
    const state = structuredClone(current);
    advanceDemo(state);
    const result = applyCommand(state, actorId, command);
    state.revision = current.revision + 1;
    save(state);
    return { state: structuredClone(state), result };
  }),
  exportSurveyCsv: (surveyId: string, actorId: string): Promise<Blob> => exclusive(() => {
    const state = read();
    if (advanceDemo(state)) state.revision += 1;
    save(state);
    const exported = surveyCsv(state, surveyId, actorId);
    return new Blob([exported.content], { type: 'text/csv; charset=utf-8' });
  }),
};

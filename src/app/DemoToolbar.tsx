import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Languages, RotateCcw, SlidersHorizontal, UserRound, X } from 'lucide-react';
import type { DemoScenario, PaymentScenario } from '../../shared/contracts';
import { useDemoCommand, useDemoSession, useDemoState } from '../shared/state';
import { browserDemoEnabled } from '../shared/api/mode';
import { Button, Modal } from '../shared/ui';
import { Brand } from './Brand';
import { routeForUser } from './navigation';
import { useDemoLanguage } from './useDemoLanguage';

export function DemoToolbar() {
  const { state } = useDemoState();
  const { userId, user, setPersona, clearPersona } = useDemoSession();
  const { execute, pending } = useDemoCommand();
  const { language, chooseLanguage } = useDemoLanguage(user?.preferredLanguage);
  const navigate = useNavigate();
  const location = useLocation();
  const [controlsOpen, setControlsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const controlsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const people = state?.users ?? [];

  useEffect(() => { setControlsOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!controlsOpen) return;
    const onPointer = (event: PointerEvent) => { if (!controlsRef.current?.contains(event.target as Node)) setControlsOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setControlsOpen(false); toggleRef.current?.focus(); } };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [controlsOpen]);
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 6000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  async function updateScenario(payload: { responseScenario?: DemoScenario; paymentScenario?: PaymentScenario }) {
    setError(''); setNotice('');
    try { await execute({ type: 'SET_DEMO_SCENARIO', payload }); setNotice('Scenario saved for the next verification or payout.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Scenario could not be saved.'); }
  }
  async function resetDemo() {
    setError(''); setNotice('');
    try {
      await execute({ type: 'RESET_DEMO', payload: { confirm: true } });
      clearPersona(); setResetOpen(false); navigate('/');
      window.dispatchEvent(new CustomEvent('jonomot:reset'));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Reset could not be saved.'); }
  }
  function switchPersona(nextId: string) {
    setError(''); setNotice('');
    if (!nextId) { clearPersona(); navigate('/'); return; }
    const next = people.find((person) => person.id === nextId);
    if (next) { setPersona(next.id); navigate(routeForUser(next)); }
  }

  return <>
    <header className="demo-toolbar">
      <div className="demo-toolbar__identity"><Brand /><span className="demo-toolbar__disclosure"><i />{browserDemoEnabled ? (language === 'bn' ? 'ব্রাউজার ডেমো · তথ্য এই ব্রাউজারে থাকে' : 'Browser demo · changes stay in this browser') : 'Demo · simulated checks & payments'}</span></div>
      <div className="demo-toolbar__controls">
        <div className="demo-language" role="group" aria-label="Language"><Languages size={15} aria-hidden="true" /><button type="button" aria-pressed={language === 'en'} onClick={() => chooseLanguage('en')}>EN</button><span>/</span><button type="button" aria-pressed={language === 'bn'} onClick={() => chooseLanguage('bn')}>বাংলা</button></div>
        <label className="demo-persona"><UserRound size={15} aria-hidden="true" /><select aria-label="Demo persona" value={userId ?? ''} onChange={(event) => switchPersona(event.target.value)}><option value="">Choose a persona</option>{people.map((person) => <option key={person.id} value={person.id}>{person.name} · {person.role}</option>)}</select></label>
        <div className="demo-controls" ref={controlsRef}>
          <button ref={toggleRef} type="button" className={'demo-controls__toggle ' + (controlsOpen ? 'is-open' : '')} aria-expanded={controlsOpen} aria-controls="demo-controls-panel" onClick={() => setControlsOpen(!controlsOpen)}><SlidersHorizontal size={15} /><span>Demo controls</span><ChevronDown size={13} /></button>
          {controlsOpen && <section id="demo-controls-panel" className="demo-controls__panel" aria-label="Demo controls">
            <div className="demo-controls__heading"><div><p className="app-eyebrow">SET THE SCENE</p><h2>Explore a different outcome</h2></div><button type="button" aria-label="Close demo controls" className="demo-controls__close" onClick={() => setControlsOpen(false)}><X size={16} /></button></div>
            <label className="demo-scenario"><span>Response scenario</span><select aria-label="Response scenario" disabled={!userId || pending} value={state?.demoSettings.responseScenario ?? 'clean'} onChange={(event) => void updateScenario({ responseScenario: event.target.value as DemoScenario })}><option value="clean">Clean</option><option value="reviewFlag">Needs review</option><option value="voiceFlag">Voice flag</option></select></label>
            <label className="demo-scenario"><span>Payment scenario</span><select aria-label="Payment scenario" disabled={!userId || pending} value={state?.demoSettings.paymentScenario ?? 'success'} onChange={(event) => void updateScenario({ paymentScenario: event.target.value as PaymentScenario })}><option value="success">Success</option><option value="retry">Retry once</option></select></label>
            <p className="demo-controls__hint">Scenarios apply to future checks and payments.</p>
            <button type="button" className="demo-reset-button" disabled={!userId || pending} onClick={() => { setControlsOpen(false); setResetOpen(true); }}><RotateCcw size={14} />Restore the demo seed</button>
          </section>}
        </div>
      </div>
      {(notice || error) && <p className={'demo-toolbar__message ' + (error ? 'is-error' : '')} role={error ? 'alert' : 'status'}>{error || notice}</p>}
    </header>
    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Restore the demo seed?" footer={<><Button variant="secondary" onClick={() => setResetOpen(false)}>Keep current data</Button><Button variant="danger" disabled={pending} onClick={() => void resetDemo()}>Restore seed</Button></>}><div className="demo-reset-copy"><span><RotateCcw size={24} /></span><p>Current demo edits will be removed. Surveys, responses, and balances will return to the original fictional seed data.</p>{error && <p role="alert">{error}</p>}</div></Modal>
  </>;
}

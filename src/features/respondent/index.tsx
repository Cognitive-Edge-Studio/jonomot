import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import type { FormEvent } from 'react';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, BadgeCheck, Bell, BookOpenCheck, Check,
  CheckCircle2, ChevronRight, Clock3, Headphones, Info, Loader2, LockKeyhole, Mic2,
  ShieldCheck, Sparkles, UserRound, WalletCards,
} from 'lucide-react';
import type { Answers, DemoUser, IntegrityCheck, Payment, ResponseRecord, Survey, SurveyAnswer, SurveyQuestion } from '../../../shared/contracts';
import { Badge, Button, Card, Drawer, EmptyState, Input, Modal, Select, Skeleton, Textarea } from '../../shared/ui';
import { useDemoCommand, useDemoSession, useDemoState } from '../../shared/state';
import { localize, t, type CopyKey, type Language } from './copy';
import './respondent.css';

const LANGUAGE_KEY = 'jonomot:respondent-language';
const OTP_PROGRESS_KEY = 'jonomot:respondent-otp';
const VOICE_PHRASE = {
  en: 'My voice, my honest opinion.',
  bn: 'আমার কণ্ঠ, আমার সৎ মতামত।',
};

interface LanguageContextValue { language: Language; setLanguage(language: Language): void }
const LanguageContext = createContext<LanguageContextValue>({ language: 'en', setLanguage: () => undefined });

function useLanguage(user?: DemoUser | null): LanguageContextValue {
  const [language, setLanguageState] = useState<Language>(() => {
    const global = sessionStorage.getItem('jonomot:language');
    if (global === 'bn' || global === 'en') return global;
    const saved = sessionStorage.getItem(LANGUAGE_KEY);
    return saved === 'bn' || saved === 'en' ? saved : user?.preferredLanguage ?? 'en';
  });
  useEffect(() => {
    const global = sessionStorage.getItem('jonomot:language');
    const saved = sessionStorage.getItem(LANGUAGE_KEY);
    if (global === 'bn' || global === 'en') setLanguageState(global);
    else if (saved !== 'bn' && saved !== 'en' && user?.preferredLanguage) setLanguageState(user.preferredLanguage);
  }, [user?.id, user?.preferredLanguage]);
  useEffect(() => {
    const onLanguage = (event: Event) => {
      const next = (event as CustomEvent<Language>).detail;
      if (next === 'en' || next === 'bn') { sessionStorage.setItem(LANGUAGE_KEY, next); setLanguageState(next); }
    };
    window.addEventListener('jonomot:language', onLanguage);
    return () => window.removeEventListener('jonomot:language', onLanguage);
  }, []);
  const setLanguage = useCallback((next: Language) => {
    sessionStorage.setItem(LANGUAGE_KEY, next);
    sessionStorage.setItem('jonomot:language', next);
    sessionStorage.setItem('jonomot:researcher-admin-locale', next);
    setLanguageState(next);
    window.dispatchEvent(new CustomEvent('jonomot:language', { detail: next }));
  }, []);
  return { language, setLanguage };
}

function useCopy() { return useContext(LanguageContext); }
function tx(language: Language, key: CopyKey, values?: Record<string, string | number>) { return t(language, key, values); }
function formatMoney(paisa: number, language: Language) {
  const amount = new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en-BD', { maximumFractionDigits: 0 }).format(paisa / 100);
  return `৳${amount}`;
}
function formatDate(value: string | undefined, language: Language) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(language === 'bn' ? 'bn-BD' : 'en-BD', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Dhaka' }).format(new Date(value));
}
function readableError(error: unknown, fallback: string) { return error instanceof Error && error.message ? error.message : fallback; }

function AppFrame({ children, showNavigation, user, state, language, setLanguage }: {
  children: ReactNode; showNavigation: boolean; user?: DemoUser | null;
  state?: ReturnType<typeof useDemoState>['state']; language: Language; setLanguage(language: Language): void;
}) {
  const location = useLocation();
  const unreadCount = state?.notifications.filter((notification) => notification.recipientId === user?.id && !notification.readAt).length ?? 0;
  const navItems = [
    { to: '/respondent/explore', label: tx(language, 'explore'), Icon: BookOpenCheck },
    { to: '/respondent/earnings', label: tx(language, 'earnings'), Icon: WalletCards },
    { to: '/respondent/profile', label: tx(language, 'profile'), Icon: UserRound },
  ];
  return <div className="respondent-app">
    <header className="respondent-topbar">
      <Link to="/respondent/explore" className="respondent-brand" aria-label={tx(language, 'brand')}>
        <img src="/mobile/jonomot-mark.svg" alt="" />
        <span>{tx(language, 'brand')}</span>
      </Link>
      <div className="respondent-top-actions">
        {showNavigation && <Link className="respondent-bell" to="/respondent/profile" aria-label={`${tx(language, 'notifications')}${unreadCount ? `, ${unreadCount}` : ''}`}>
          <Bell size={18} aria-hidden="true" />{unreadCount > 0 && <span className="respondent-unread-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </Link>}
        <button className="respondent-language-toggle" type="button" onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')} aria-label={tx(language, 'language')}>
          <span aria-hidden="true">文</span>{tx(language, 'language')}
        </button>
      </div>
    </header>
    <div className="respondent-demo-note"><ShieldCheck size={13} aria-hidden="true" /><span>{tx(language, 'simulated')}</span></div>
    <main className="respondent-main">{children}</main>
    {showNavigation && <nav className="respondent-bottom-nav" aria-label="Respondent navigation">
      {navItems.map(({ to, label, Icon }) => {
        const active = location.pathname === to || (to === '/respondent/explore' && location.pathname.startsWith('/respondent/surveys/'));
        return <Link key={to} to={to} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
          <Icon size={19} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" /><span>{label}</span>
        </Link>;
      })}
    </nav>}
  </div>;
}

function RouteGate({ children, showNavigation = false }: { children: ReactNode; showNavigation?: boolean }) {
  const { state, loading, error, refresh } = useDemoState();
  const { userId, user, setPersona, clearPersona } = useDemoSession();
  const { language, setLanguage } = useLanguage(user);
  const location = useLocation();
  const respondentUsers = state?.users.filter((person) => person.role === 'respondent') ?? [];
  if (loading && !state) return <LanguageContext.Provider value={{ language, setLanguage }}><AppFrame showNavigation={false} state={state} user={user} language={language} setLanguage={setLanguage}><div className="respondent-page-loading" role="status"><Skeleton className="respondent-skeleton respondent-skeleton-title" /><Skeleton className="respondent-skeleton" /><Skeleton className="respondent-skeleton" /><span>{tx(language, 'loading')}</span></div></AppFrame></LanguageContext.Provider>;
  if (error && !state) return <LanguageContext.Provider value={{ language, setLanguage }}><AppFrame showNavigation={false} state={state} user={user} language={language} setLanguage={setLanguage}><section className="respondent-gate-card"><AlertCircle size={26} /><h1>{tx(language, 'loadError')}</h1><p>{error}</p><Button onClick={() => void refresh()}>{tx(language, 'retry')}</Button></section></AppFrame></LanguageContext.Provider>;
  if (!userId) return <LanguageContext.Provider value={{ language, setLanguage }}><AppFrame showNavigation={false} state={state} user={null} language={language} setLanguage={setLanguage}><section className="respondent-gate-card"><div className="respondent-gate-icon"><UserRound size={23} /></div><p className="respondent-eyebrow">{tx(language, 'brand')}</p><h1>{tx(language, 'welcome')}</h1><p>{tx(language, 'choosePersona')}</p>
    {respondentUsers.length === 0 ? <EmptyState title={tx(language, 'noRespondents')} /> : <div className="respondent-persona-list">{respondentUsers.map((person) => <Button key={person.id} variant="secondary" className="respondent-persona-button" onClick={() => setPersona(person.id)}><span>{person.name}</span><ArrowRight size={16} /></Button>)}</div>}
  </section></AppFrame></LanguageContext.Provider>;
  if (!user) return <LanguageContext.Provider value={{ language, setLanguage }}><AppFrame showNavigation={false} state={state} user={null} language={language} setLanguage={setLanguage}><section className="respondent-gate-card"><AlertCircle size={26} /><h1>{tx(language, 'missingUser')}</h1><Button onClick={clearPersona}>{tx(language, 'chooseAgain')}</Button></section></AppFrame></LanguageContext.Provider>;
  if (user.role !== 'respondent') return <LanguageContext.Provider value={{ language, setLanguage }}><AppFrame showNavigation={false} state={state} user={user} language={language} setLanguage={setLanguage}><section className="respondent-gate-card"><LockKeyhole size={26} /><h1>{tx(language, 'wrongRole')}</h1><p>{user.name}</p><Button onClick={clearPersona}>{tx(language, 'switchRole')}</Button></section></AppFrame></LanguageContext.Provider>;
  if (!user.onboardingComplete && location.pathname !== '/respondent/onboarding') return <Navigate to="/respondent/onboarding" replace />;
  if (user.onboardingComplete && location.pathname === '/respondent/onboarding') return <Navigate to="/respondent/explore" replace />;
  return <LanguageContext.Provider value={{ language, setLanguage }}><AppFrame showNavigation={showNavigation} state={state} user={user} language={language} setLanguage={setLanguage}>{children}</AppFrame></LanguageContext.Provider>;
}

function ScreenHeading({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="respondent-heading">
    {eyebrow && <p className="respondent-eyebrow">{eyebrow}</p>}
    <h1>{title}</h1>
    {description && <p className="respondent-intro">{description}</p>}
    {children}
  </div>;
}

function Notice({ tone = 'info', children, icon }: { tone?: 'info' | 'success' | 'warning' | 'danger'; children: ReactNode; icon?: ReactNode }) {
  return <div className={`respondent-notice respondent-notice-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>{icon ?? <Info size={17} aria-hidden="true" />}<div>{children}</div></div>;
}

function OnboardingScreen() {
  return <RouteGate><OnboardingContent /></RouteGate>;
}

function OnboardingContent() {
  const { language } = useCopy();
  const { user } = useDemoSession();
  const { execute, pending } = useDemoCommand();
  const navigate = useNavigate();
  const [stage, setStage] = useState<'phone' | 'consent' | 'identity' | 'demographics' | 'wallet'>(() => user && (user.phoneVerified || sessionStorage.getItem(`${OTP_PROGRESS_KEY}:${user.id}`) === 'verified') ? 'consent' : 'phone');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [otp, setOtp] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [nidLast4, setNidLast4] = useState('');
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [ageBand, setAgeBand] = useState('');
  const [gender, setGender] = useState('');
  const [district, setDistrict] = useState('');
  const [walletType, setWalletType] = useState<'bKash' | 'Nagad' | 'Rocket' | ''>('');
  const [error, setError] = useState('');
  const stages = ['phone', 'consent', 'identity', 'demographics', 'wallet'] as const;
  const stageIndex = stages.indexOf(stage);
  const stageTitle: Record<typeof stage, CopyKey> = { phone: 'phoneStep', consent: 'consentStep', identity: 'identityStep', demographics: 'profileStep', wallet: 'walletStep' };
  const nextStage = () => setStage(stages[Math.min(stageIndex + 1, stages.length - 1)]);
  const previousStage = () => setStage(stages[Math.max(stageIndex - 1, 0)]);
  useEffect(() => {
    if (!user) return;
    const resetOnboarding = () => {
      sessionStorage.removeItem(`${OTP_PROGRESS_KEY}:${user.id}`);
      setStage('phone'); setOtp(''); setConsentAccepted(false); setNidLast4(''); setIdentityConfirmed(false);
      setAgeBand(''); setGender(''); setDistrict(''); setWalletType(''); setError('');
    };
    window.addEventListener('jonomot:reset', resetOnboarding);
    return () => window.removeEventListener('jonomot:reset', resetOnboarding);
  }, [user?.id]);

  async function verifyPhone(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!/^\+?[0-9 ()-]{8,20}$/.test(phone.trim()) || !/^\d{6}$/.test(otp)) { setError(tx(language, 'otpInvalid')); return; }
    try {
      await execute({ type: 'VERIFY_OTP', payload: { phone: phone.trim().replace(/[ ()-]/g, ''), code: otp } });
      if (user) sessionStorage.setItem(`${OTP_PROGRESS_KEY}:${user.id}`, 'verified');
      setStage('consent');
    } catch (cause) { setError(readableError(cause, tx(language, 'otpWrong'))); }
  }
  function continueConsent(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!consentAccepted) { setError(tx(language, 'consentRequired')); return; }
    nextStage();
  }
  function continueIdentity(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!/^\d{4}$/.test(nidLast4) || !identityConfirmed) { setError(tx(language, 'requiredFields')); return; }
    nextStage();
  }
  function continueDemographics(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!ageBand || !gender || !district) { setError(tx(language, 'requiredFields')); return; }
    nextStage();
  }
  async function saveProfile(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!walletType) { setError(tx(language, 'requiredFields')); return; }
    try {
      await execute({ type: 'COMPLETE_ONBOARDING', payload: { consentAccepted, demographics: { ageBand, gender, district }, walletType, nidLast4 } });
      if (user) sessionStorage.removeItem(`${OTP_PROGRESS_KEY}:${user.id}`);
      navigate('/respondent/explore', { replace: true });
    } catch (cause) { setError(readableError(cause, tx(language, 'commandError'))); }
  }

  return <div className="respondent-page respondent-onboarding-page">
    <ScreenHeading eyebrow={tx(language, 'onboarding')} title={tx(language, 'welcome')} description={tx(language, 'onboardingIntro')} />
    <Card className="respondent-onboarding-card">
      <div className="respondent-onboarding-progress"><span>{tx(language, 'stepOf', { step: stageIndex + 1, total: stages.length })}</span><span>{Math.round(((stageIndex + 1) / stages.length) * 100)}%</span></div>
      <div className="respondent-progress-track"><span style={{ width: `${((stageIndex + 1) / stages.length) * 100}%` }} /></div>
      <div className="respondent-onboarding-stage-title"><span className="respondent-stage-icon">{stage === 'phone' ? <LockKeyhole size={19} /> : stage === 'identity' ? <ShieldCheck size={19} /> : stage === 'wallet' ? <WalletCards size={19} /> : <UserRound size={19} />}</span><div><h2>{tx(language, stageTitle[stage])}</h2><p>{stage === 'identity' ? tx(language, 'identityIntro') : stage === 'wallet' ? tx(language, 'walletIntro') : ''}</p></div></div>
      {error && <Notice tone="danger" icon={<AlertCircle size={17} />}>{error}</Notice>}
      {stage === 'phone' && <form onSubmit={verifyPhone} className="respondent-form-stack">
        <label className="respondent-field"><span>{tx(language, 'phoneLabel')}</span><Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+880 17XX-XXXXXX" required /></label>
        <p className="respondent-field-help">{tx(language, 'phoneHint')}</p>
        <label className="respondent-field"><span>{tx(language, 'otpLabel')}</span><Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" required /></label>
        <div className="respondent-code-hint"><LockKeyhole size={16} /><span>{tx(language, 'otpHint')}</span><strong>123456</strong></div>
        <Button type="submit" loading={pending} className="respondent-full-button">{tx(language, 'verifyContinue')}<ArrowRight size={17} /></Button>
      </form>}
      {stage === 'consent' && <form onSubmit={continueConsent} className="respondent-form-stack">
        <label className="respondent-consent-check"><input type="checkbox" checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} /><span><strong>{tx(language, 'consent')}</strong><span>{tx(language, 'consentTitle')}</span></span></label>
        <Notice tone="info"><span>{tx(language, 'noCash')}</span></Notice>
        <WizardActions onBack={previousStage} primary={tx(language, 'next')} />
      </form>}
      {stage === 'identity' && <form onSubmit={continueIdentity} className="respondent-form-stack">
        <label className="respondent-field"><span>{tx(language, 'nidLabel')}</span><Input inputMode="numeric" maxLength={4} value={nidLast4} onChange={(event) => setNidLast4(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" required /></label>
        <Card className={`respondent-selfie-card ${identityConfirmed ? 'is-confirmed' : ''}`}>
          <div className="respondent-selfie-icon"><UserRound size={24} /></div><div><strong>{tx(language, 'selfieTitle')}</strong><p>{tx(language, 'selfieCopy')}</p></div>
          {identityConfirmed && <CheckCircle2 size={19} className="respondent-confirmed-icon" />}
        </Card>
        <Button type="button" variant={identityConfirmed ? 'secondary' : 'ghost'} className="respondent-full-button respondent-selfie-action" onClick={() => setIdentityConfirmed((value) => !value)}>
          {identityConfirmed ? <><Check size={17} />{tx(language, 'verified')}</> : <><ShieldCheck size={17} />{language === 'bn' ? 'নমুনা যাচাই সম্পন্ন করুন' : 'Complete sample check'}</>}
        </Button>
        <WizardActions onBack={previousStage} primary={tx(language, 'next')} />
      </form>}
      {stage === 'demographics' && <form onSubmit={continueDemographics} className="respondent-form-stack">
        <label className="respondent-field"><span>{tx(language, 'ageLabel')}</span><Select value={ageBand} onChange={(event) => setAgeBand(event.target.value)} required><option value="">{tx(language, 'selectOne')}</option><option value="18-24">{tx(language, 'age18to24')}</option><option value="25-34">{tx(language, 'age25to34')}</option><option value="35-44">{tx(language, 'age35to44')}</option><option value="45+">{tx(language, 'age45plus')}</option></Select></label>
        <label className="respondent-field"><span>{tx(language, 'genderLabel')}</span><Select value={gender} onChange={(event) => setGender(event.target.value)} required><option value="">{tx(language, 'selectOne')}</option><option value="Woman">{tx(language, 'genderWoman')}</option><option value="Man">{tx(language, 'genderMan')}</option><option value="Non-binary">{tx(language, 'genderNonbinary')}</option><option value="Prefer not to say">{tx(language, 'genderPreferNot')}</option></Select></label>
        <label className="respondent-field"><span>{tx(language, 'districtLabel')}</span><Select value={district} onChange={(event) => setDistrict(event.target.value)} required><option value="">{tx(language, 'selectOne')}</option><option value="Dhaka">{tx(language, 'districtDhaka')}</option><option value="Chattogram">{tx(language, 'districtChattogram')}</option><option value="Other">{tx(language, 'districtOther')}</option></Select></label>
        <WizardActions onBack={previousStage} primary={tx(language, 'next')} />
      </form>}
      {stage === 'wallet' && <form onSubmit={saveProfile} className="respondent-form-stack">
        <label className="respondent-field"><span>{tx(language, 'walletLabel')}</span><Select value={walletType} onChange={(event) => setWalletType(event.target.value as typeof walletType)} required><option value="">{tx(language, 'selectOne')}</option><option value="bKash">bKash</option><option value="Nagad">Nagad</option><option value="Rocket">Rocket</option></Select></label>
        <Notice tone="info" icon={<WalletCards size={17} />}>{tx(language, 'noCash')}</Notice>
        <WizardActions onBack={previousStage} primary={tx(language, 'finishSetup')} loading={pending} />
      </form>}
    </Card>
    <div className="respondent-trust-caption"><ShieldCheck size={15} /><span>{tx(language, 'simulated')}</span></div>
  </div>;
}

function WizardActions({ onBack, primary, loading }: { onBack: () => void; primary: string; loading?: boolean }) {
  const { language } = useCopy();
  return <div className="respondent-wizard-actions"><Button type="button" variant="ghost" onClick={onBack}><ArrowLeft size={16} />{language === 'bn' ? 'আগে' : 'Back'}</Button><Button type="submit" loading={loading}>{primary}<ArrowRight size={16} /></Button></div>;
}

function surveyMatches(survey: Survey, user: DemoUser) {
  const rules = survey.eligibility;
  if (rules.districts?.length && (!user.demographics?.district || !rules.districts.includes(user.demographics.district))) return false;
  if (rules.ageBands?.length && (!user.demographics?.ageBand || !rules.ageBands.includes(user.demographics.ageBand))) return false;
  if (rules.genders?.length && (!user.demographics?.gender || !rules.genders.includes(user.demographics.gender))) return false;
  return true;
}

function ExploreScreen() {
  return <RouteGate showNavigation><ExploreContent /></RouteGate>;
}

function ExploreContent() {
  const { language } = useCopy();
  const { state, loading, error, refresh } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending } = useDemoCommand();
  const navigate = useNavigate();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [commandError, setCommandError] = useState('');
  const drawerOpenerRef = useRef<HTMLElement | null>(null);
  const activeSurveys = useMemo(() => state?.surveys.filter((survey) => {
    const researcher = state.users.find((person) => person.id === survey.researcherId);
    const used = state.responses.filter((response) => response.surveyId === survey.id && response.quotaConsumed).length;
    return survey.status === 'Active' && researcher?.verified && used < survey.quota && !!user && surveyMatches(survey, user);
  }) ?? [], [state, user]);
  const selectedSurvey = activeSurveys.find((survey) => survey.id === selectedSurveyId) ?? null;
  const existingResponse = selectedSurvey && user ? state?.responses.find((response) => response.surveyId === selectedSurvey.id && response.respondentId === user.id) : undefined;

  useEffect(() => {
    if (!selectedSurveyId) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedSurveyId(null); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.respondent-app .drawer header button')?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      drawerOpenerRef.current?.focus();
    };
  }, [selectedSurveyId]);

  async function startSurvey(survey: Survey) {
    setCommandError('');
    try {
      const result = await execute({ type: 'START_RESPONSE', payload: { surveyId: survey.id } });
      const responseId = result.result?.responseId;
      const response = responseId ? result.state.responses.find((record) => record.id === responseId) : undefined;
      if (!responseId || !response) throw new Error(tx(language, 'commandError'));
      setSelectedSurveyId(null);
      navigate(response.status === 'Draft' ? `/respondent/surveys/${survey.id}` : `/respondent/responses/${response.id}/verify`);
    } catch (cause) { setCommandError(readableError(cause, tx(language, 'commandError'))); }
  }

  return <div className="respondent-page respondent-explore-page">
    <div className="respondent-welcome-row"><div><p className="respondent-eyebrow">{tx(language, 'brand')}</p><h1>{tx(language, 'hello', { name: user?.name ?? '' })}</h1></div><div className="respondent-avatar"><UserRound size={21} /></div></div>
    <ScreenHeading title={tx(language, 'todaysSurveys')} description={tx(language, 'exploreIntro')} />
    {error && <Notice tone="danger" icon={<AlertCircle size={17} />}>{error} <button className="respondent-inline-action" onClick={() => void refresh()}>{tx(language, 'retry')}</button></Notice>}
    {commandError && <Notice tone="danger" icon={<AlertCircle size={17} />}>{commandError}</Notice>}
    {loading && !state && <div className="respondent-card-list"><Skeleton className="respondent-skeleton respondent-skeleton-card" /><Skeleton className="respondent-skeleton respondent-skeleton-card" /></div>}
    {!loading && activeSurveys.length === 0 && <EmptyState title={tx(language, 'noSurveys')} description={tx(language, 'noSurveysCopy')} action={<Button variant="secondary" onClick={() => void refresh()}>{tx(language, 'retry')}</Button>} />}
    <div className="respondent-card-list">
      {activeSurveys.map((survey) => {
        const researcher = state?.users.find((person) => person.id === survey.researcherId);
        const used = state?.responses.filter((response) => response.surveyId === survey.id && response.quotaConsumed).length ?? 0;
        const spots = Math.max(0, survey.quota - used);
        const response = state?.responses.find((record) => record.surveyId === survey.id && record.respondentId === user?.id);
        return <Card key={survey.id} className="respondent-survey-card">
          <div className="respondent-survey-card-top"><span className="respondent-topic-chip">{survey.topic || tx(language, 'topic')}</span><Badge tone="success"><CheckCircle2 size={13} />{tx(language, 'available')}</Badge></div>
          <h2>{localize(survey.title, language)}</h2><p className="respondent-survey-desc">{localize(survey.description, language)}</p>
          <div className="respondent-researcher"><span className="respondent-researcher-avatar">{researcher?.name?.slice(0, 1) ?? 'R'}</span><span>{researcher?.name ?? tx(language, 'verifiedResearcher')}</span><BadgeCheck size={15} aria-label={tx(language, 'verifiedResearcher')} /></div>
          <div className="respondent-survey-meta"><span><Clock3 size={16} />{survey.estimatedMinutes ?? 3} {tx(language, 'minutes')}</span><strong>{formatMoney(survey.rewardPaisa, language)}</strong></div>
          <div className="respondent-survey-card-bottom"><span>{tx(language, 'quotaLeft', { count: spots })}</span><Button variant="secondary" onClick={(event) => { drawerOpenerRef.current = event.currentTarget; setSelectedSurveyId(survey.id); setCommandError(''); }}>{response ? response.status === 'Draft' ? tx(language, 'resumeSurvey') : tx(language, 'reviewPending') : tx(language, 'details')}<ChevronRight size={16} /></Button></div>
        </Card>;
      })}
    </div>
    <Drawer open={!!selectedSurvey} title={selectedSurvey ? localize(selectedSurvey.title, language) : tx(language, 'aboutSurvey')} onClose={() => setSelectedSurveyId(null)}>
      {selectedSurvey && <div className="respondent-survey-drawer-content">
        <div className="respondent-drawer-reward"><Sparkles size={19} /><div><span>{tx(language, 'reward')}</span><strong>{formatMoney(selectedSurvey.rewardPaisa, language)}</strong></div><small>{selectedSurvey.estimatedMinutes ?? 3} {tx(language, 'minutes')}</small></div>
        <p>{localize(selectedSurvey.description, language)}</p>
        <div className="respondent-detail-list"><span><BookOpenCheck size={16} />{selectedSurvey.questions.length} {tx(language, 'questions')}</span><span><ShieldCheck size={16} />{tx(language, 'verifiedResearcher')}</span></div>
        <Notice tone="success" icon={<CheckCircle2 size={17} />}>{tx(language, 'eligibility')}</Notice>
        {commandError && <Notice tone="danger" icon={<AlertCircle size={17} />}>{commandError}</Notice>}
        <Button className="respondent-full-button" loading={pending} onClick={() => void startSurvey(selectedSurvey)}>{existingResponse?.status === 'Draft' ? tx(language, 'resumeSurvey') : existingResponse ? tx(language, 'startVerification') : tx(language, 'startSurvey')}<ArrowRight size={17} /></Button>
      </div>}
    </Drawer>
  </div>;
}

function SurveyRunnerScreen() {
  return <RouteGate><SurveyRunnerContent /></RouteGate>;
}

function SurveyRunnerContent() {
  const { language } = useCopy();
  const { surveyId = '' } = useParams();
  const { state } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending } = useDemoCommand();
  const navigate = useNavigate();
  const survey = state?.surveys.find((item) => item.id === surveyId);
  const [responseId, setResponseId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [startError, setStartError] = useState('');
  const [validation, setValidation] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leavePending, setLeavePending] = useState(false);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(true);
  const latestAnswersRef = useRef<Answers>({});
  const responseIdRef = useRef<string | null>(null);
  const lastSavedRef = useRef('');
  const flushCycleRef = useRef<Promise<boolean> | null>(null);
  const startedAtRef = useRef(Date.now());
  latestAnswersRef.current = answers;
  responseIdRef.current = responseId;
  const questions = survey?.questions ?? [];
  const question = questions[index];

  useEffect(() => {
    if (!reviewOpen && !confirmOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setReviewOpen(false); setConfirmOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    const focusTimer = window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.respondent-app .overlay [role="dialog"] header button')?.focus());
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(focusTimer);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [reviewOpen, confirmOpen]);

  useEffect(() => {
    activeRef.current = true;
    if (!user || !surveyId) return;
    let cancelled = false;
    setStartError('');
    void execute({ type: 'START_RESPONSE', payload: { surveyId } }).then((result) => {
      if (cancelled) return;
      const id = result.result?.responseId;
      const response = id ? result.state.responses.find((record) => record.id === id) : undefined;
      if (!id || !response) throw new Error(tx(language, 'commandError'));
      if (response.status !== 'Draft') {
        navigate(`/respondent/responses/${response.id}/verify`, { replace: true });
        return;
      }
      setAnswers(response.answers ?? {});
      latestAnswersRef.current = response.answers ?? {};
      lastSavedRef.current = JSON.stringify(response.answers ?? {});
      setResponseId(id);
      responseIdRef.current = id;
    }).catch((cause) => { if (!cancelled) setStartError(readableError(cause, tx(language, 'commandError'))); });
    return () => { cancelled = true; };
  }, [surveyId, user?.id, execute, navigate]);

  const flushDraft = useCallback((): Promise<boolean> => {
    if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    if (flushCycleRef.current) return flushCycleRef.current;
    const cycle = (async () => {
      while (activeRef.current) {
        const id = responseIdRef.current;
        if (!id) return true;
        const payload = { ...latestAnswersRef.current };
        const payloadSnapshot = JSON.stringify(payload);
        if (payloadSnapshot === lastSavedRef.current) return true;
        setSaveStatus('saving'); setSaveError('');
        try {
          await execute({ type: 'SAVE_DRAFT', payload: { responseId: id, answers: payload, timingSeconds: Math.floor((Date.now() - startedAtRef.current) / 1000) } });
        } catch (cause) {
          if (activeRef.current && responseIdRef.current === id) { setSaveStatus('error'); setSaveError(readableError(cause, tx(language, 'saveError'))); }
          return false;
        }
        if (!activeRef.current || responseIdRef.current !== id) return true;
        lastSavedRef.current = payloadSnapshot;
        setSaveStatus('saved'); setSaveError('');
      }
      return true;
    })().finally(() => { flushCycleRef.current = null; });
    flushCycleRef.current = cycle;
    return cycle;
  }, [execute, language]);

  useEffect(() => {
    if (!responseId || !activeRef.current) return;
    const snapshot = JSON.stringify(answers);
    if (snapshot === lastSavedRef.current) return;
    setSaveStatus('unsaved'); setSaveError('');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { void flushDraft(); }, 550);
    return () => { if (timerRef.current !== null) { window.clearTimeout(timerRef.current); timerRef.current = null; } };
  }, [answers, responseId, flushDraft]);

  useEffect(() => {
    const onReset = () => { activeRef.current = false; if (timerRef.current !== null) window.clearTimeout(timerRef.current); responseIdRef.current = null; setResponseId(null); setAnswers({}); };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving' || saveStatus === 'error') {
        void flushDraft(); event.preventDefault(); event.returnValue = '';
      }
    };
    window.addEventListener('jonomot:reset', onReset);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { window.removeEventListener('jonomot:reset', onReset); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [flushDraft, saveStatus]);

  function updateAnswer(questionId: string, value: SurveyAnswer | undefined) {
    setAnswers((current) => { const next = { ...current }; if (value === undefined) delete next[questionId]; else next[questionId] = value; return next; });
    setValidation(''); setSubmitError('');
  }
  function validateOne(item: SurveyQuestion, value: SurveyAnswer | undefined): string | null {
    if (item.type === 'multipleChoice') {
      const selected = Array.isArray(value) ? value : [];
      const min = item.minSelections ?? (item.required ? 1 : 0);
      if (selected.length < min) return tx(language, item.required && selected.length === 0 ? 'chooseAnswer' : 'selectAtLeast', { count: min });
      if (item.maxSelections !== undefined && selected.length > item.maxSelections) return tx(language, 'selectAtMost', { count: item.maxSelections });
      return null;
    }
    if (item.type === 'text') {
      const text = typeof value === 'string' ? value.trim() : '';
      if (item.required && !text) return tx(language, 'chooseAnswer');
      if (text && item.minLength !== undefined && text.length < item.minLength) return tx(language, 'answerTooShort', { count: item.minLength });
      if (text && item.maxLength !== undefined && text.length > item.maxLength) return tx(language, 'answerTooLong', { count: item.maxLength });
      return null;
    }
    if (item.type === 'number') {
      if (value === undefined || value === null || value === '') return item.required ? tx(language, 'chooseAnswer') : null;
      if (typeof value !== 'number' || !Number.isFinite(value)) return tx(language, 'chooseAnswer');
      if (item.min !== undefined && value < item.min) return tx(language, 'numberTooSmall', { count: item.min });
      if (item.max !== undefined && value > item.max) return tx(language, 'numberTooLarge', { count: item.max });
      if (item.step !== undefined && item.min !== undefined && Math.abs((value - item.min) / item.step - Math.round((value - item.min) / item.step)) > 1e-8) return tx(language, 'numberStep', { count: item.step });
      return null;
    }
    const blank = value === undefined || value === null || value === '';
    return blank && item.required ? tx(language, 'chooseAnswer') : null;
  }
  function validateAll() {
    for (const item of questions) {
      const message = validateOne(item, answers[item.id]);
      if (message) { setIndex(questions.indexOf(item)); setValidation(message); return false; }
    }
    setValidation(''); return true;
  }
  async function leaveRunner() {
    setLeavePending(true); setSubmitError('');
    const saved = await flushDraft();
    setLeavePending(false);
    if (!saved) { setSubmitError(tx(language, 'leaveWarning')); return; }
    navigate('/respondent/explore');
  }
  async function submitAnswers() {
    if (!validateAll() || !responseId) { setConfirmOpen(false); setReviewOpen(true); return; }
    setSubmitError('');
    const saved = await flushDraft();
    if (!saved) { setConfirmOpen(false); setReviewOpen(false); return; }
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    activeRef.current = false;
    try {
      const result = await execute({ type: 'SUBMIT_RESPONSE', payload: { responseId } });
      setConfirmOpen(false); setReviewOpen(false);
      navigate(`/respondent/responses/${responseId}/verify`, { replace: true });
      void result;
    } catch (cause) { activeRef.current = true; setSubmitError(readableError(cause, tx(language, 'commandError'))); setConfirmOpen(false); }
  }

  if (!survey) return <RouteGate><div className="respondent-page"><ScreenHeading title={tx(language, 'surveyClosed')} /><Button variant="secondary" onClick={() => navigate('/respondent/explore')}>{tx(language, 'backExplore')}</Button></div></RouteGate>;
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0;
  const currentValue = question ? answers[question.id] : undefined;
  const response = state?.responses.find((record) => record.id === responseId);

  return <div className="respondent-page respondent-runner-page">
    <div className="respondent-runner-top"><button className="respondent-back-button" type="button" onClick={() => void leaveRunner()} disabled={leavePending}><ArrowLeft size={18} /><span>{tx(language, 'leaveSurvey')}</span></button><span className="respondent-save-indicator" aria-live="polite">{saveStatus === 'saving' ? <><Loader2 className="respondent-spin" size={14} />{tx(language, 'saving')}</> : saveStatus === 'saved' ? <><Check size={14} />{tx(language, 'saved')}</> : saveStatus === 'unsaved' ? tx(language, 'saveDraft') : null}</span></div>
    <div className="respondent-runner-title"><p>{localize(survey.title, language)}</p><strong>{tx(language, 'question')} {index + 1} {tx(language, 'of')} {questions.length}</strong></div>
    <div className="respondent-progress-track"><span style={{ width: `${progress}%` }} /></div>
    {!responseId && !startError && <div className="respondent-page-loading" role="status"><Loader2 className="respondent-spin" /><span>{tx(language, 'loading')}</span></div>}
    {startError && <Notice tone="danger" icon={<AlertCircle size={17} />}>{startError}</Notice>}
    {question && responseId && <Card className="respondent-question-card">
      <p className="respondent-question-counter">{tx(language, 'question')} {index + 1} / {questions.length}</p>
      <h1>{localize(question.prompt, language)}</h1>
      <div className="respondent-required-tag">{question.required ? tx(language, 'required') : tx(language, 'optional')}</div>
      <QuestionInput question={question} value={currentValue} language={language} onChange={(value) => updateAnswer(question.id, value)} />
      {question.type === 'text' && <div className="respondent-character-count">{typeof currentValue === 'string' ? currentValue.length : 0}{question.maxLength ? ` / ${question.maxLength}` : ''}</div>}
      {validation && <Notice tone="warning" icon={<AlertCircle size={16} />}>{validation}</Notice>}
      {saveStatus === 'error' && <Notice tone="danger" icon={<AlertCircle size={16} />}><span>{saveError || tx(language, 'saveError')}</span><Button variant="secondary" onClick={() => void flushDraft()}>{tx(language, 'retrySave')}</Button></Notice>}
      {submitError && <Notice tone="danger" icon={<AlertCircle size={16} />}>{submitError}</Notice>}
    </Card>}
    {question && responseId && <div className="respondent-runner-actions"><Button variant="ghost" onClick={() => { setIndex((value) => Math.max(0, value - 1)); setValidation(''); }} disabled={index === 0 || pending}><ArrowLeft size={16} />{tx(language, 'previous')}</Button>
      {index < questions.length - 1 ? <Button onClick={() => { const issue = validateOne(question, currentValue); if (issue) { setValidation(issue); return; } setValidation(''); setIndex((value) => value + 1); }}>{tx(language, 'next')}<ArrowRight size={16} /></Button> : <Button onClick={() => { if (validateAll()) setReviewOpen(true); }}><Check size={16} />{tx(language, 'reviewAnswers')}</Button>}
    </div>}
    {response && <p className="respondent-draft-note"><Activity size={14} />{saveStatus === 'saved' ? tx(language, 'draftCount') : response.status === 'Draft' ? tx(language, 'draftCount') : ''}</p>}
    <Modal open={reviewOpen} title={tx(language, 'reviewAnswers')} onClose={() => setReviewOpen(false)} footer={<><Button variant="secondary" onClick={() => setReviewOpen(false)}>{tx(language, 'close')}</Button><Button onClick={() => { setReviewOpen(false); setConfirmOpen(true); }}>{tx(language, 'submitSurvey')}<ArrowRight size={16} /></Button></>}>
      <div className="respondent-review-list">{questions.map((item, itemIndex) => <button key={item.id} type="button" className="respondent-review-row" onClick={() => { setIndex(itemIndex); setReviewOpen(false); }}><span><strong>{itemIndex + 1}. {localize(item.prompt, language)}</strong><small>{formatAnswer(item, answers[item.id], language)}</small></span><ChevronRight size={17} /></button>)}</div>
      {saveStatus === 'error' && <Notice tone="danger">{saveError || tx(language, 'saveError')} <Button variant="secondary" onClick={() => void flushDraft()}>{tx(language, 'retrySave')}</Button></Notice>}
    </Modal>
    <Modal open={confirmOpen} title={tx(language, 'submitConfirmTitle')} onClose={() => setConfirmOpen(false)} footer={<><Button variant="secondary" onClick={() => setConfirmOpen(false)}>{tx(language, 'close')}</Button><Button loading={pending} onClick={() => void submitAnswers()}>{tx(language, 'confirmSubmit')}<ArrowRight size={16} /></Button></>}>
      <p>{tx(language, 'submitConfirmCopy')}</p>{submitError && <Notice tone="danger">{submitError}</Notice>}{saveStatus === 'error' && <Notice tone="danger">{saveError || tx(language, 'saveError')} <Button variant="secondary" onClick={() => void flushDraft()}>{tx(language, 'retrySave')}</Button></Notice>}
    </Modal>
  </div>;
}

function QuestionInput({ question, value, language, onChange }: { question: SurveyQuestion; value?: SurveyAnswer; language: Language; onChange(value: SurveyAnswer | undefined): void }) {
  if (question.type === 'singleChoice') return <div className="respondent-choice-list" role="radiogroup" aria-label={localize(question.prompt, language)}>{question.options.map((option) => <label className={`respondent-choice-option ${value === option.id ? 'is-selected' : ''}`} key={option.id}><input type="radio" name={question.id} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} /><span className="respondent-choice-indicator" /><span>{localize(option.label, language)}</span></label>)}</div>;
  if (question.type === 'multipleChoice') {
    const selected = Array.isArray(value) ? value : [];
    return <div className="respondent-choice-list" aria-label={localize(question.prompt, language)}>{question.options.map((option) => {
      const checked = selected.includes(option.id);
      return <label className={`respondent-choice-option ${checked ? 'is-selected' : ''}`} key={option.id}><input type="checkbox" checked={checked} onChange={() => {
        if (checked) onChange(selected.filter((item) => item !== option.id));
        else if (question.maxSelections === undefined || selected.length < question.maxSelections) onChange([...selected, option.id]);
      }} /><span className="respondent-checkbox-indicator">{checked && <Check size={13} />}</span><span>{localize(option.label, language)}</span></label>;
    })}<p className="respondent-field-help">{language === 'bn' ? `সর্বোচ্চ ${question.maxSelections ?? question.options.length}টি বেছে নিন` : `Choose up to ${question.maxSelections ?? question.options.length}`}</p></div>;
  }
  if (question.type === 'likert') {
    const values = Array.from({ length: question.max - question.min + 1 }, (_, offset) => question.min + offset);
    return <div className="respondent-likert-wrap"><div className="respondent-likert-labels"><span>{question.minLabel ? localize(question.minLabel, language) : ''}</span><span>{question.maxLabel ? localize(question.maxLabel, language) : ''}</span></div><div className="respondent-likert-options" role="radiogroup" aria-label={localize(question.prompt, language)}>{values.map((number) => <label className={`respondent-likert-option ${value === number ? 'is-selected' : ''}`} key={number}><input type="radio" name={question.id} value={number} checked={value === number} onChange={() => onChange(number)} /><span>{number}</span></label>)}</div></div>;
  }
  if (question.type === 'text') return <Textarea className="respondent-answer-textarea" rows={5} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} maxLength={question.maxLength} placeholder={language === 'bn' ? 'আপনার উত্তর লিখুন…' : 'Write your answer…'} aria-label={localize(question.prompt, language)} />;
  return <Input className="respondent-answer-number" type="number" inputMode="decimal" value={typeof value === 'number' ? value : ''} min={question.min} max={question.max} step={question.step ?? 'any'} onChange={(event) => onChange(event.target.value === '' ? undefined : Number(event.target.value))} placeholder={language === 'bn' ? 'সংখ্যা লিখুন' : 'Enter a number'} aria-label={localize(question.prompt, language)} />;
}

function formatAnswer(question: SurveyQuestion, answer: SurveyAnswer | undefined, language: Language) {
  if (answer === undefined || answer === '') return language === 'bn' ? 'উত্তর দেওয়া হয়নি' : 'Not answered';
  if (question.type === 'singleChoice') return localize(question.options.find((option) => option.id === answer)?.label, language);
  if (question.type === 'multipleChoice' && Array.isArray(answer)) return answer.map((id) => localize(question.options.find((option) => option.id === id)?.label, language)).join(', ');
  return String(answer);
}

function statusLabel(status: ResponseRecord['status'] | Payment['status'], language: Language): string {
  const map: Record<string, CopyKey> = { Draft: 'draft', Submitted: 'responseSubmitted', UnderReview: 'underReview', Approved: 'approved', Rejected: 'rejected', Processing: 'processing', Failed: 'failed', Paid: 'paid' };
  return tx(language, map[status] ?? 'status');
}
function badgeTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'Paid' || status === 'Approved' || status === 'Passed') return 'success';
  if (status === 'Failed' || status === 'Rejected' || status === 'Flagged') return 'danger';
  if (status === 'Processing' || status === 'Pending' || status === 'UnderReview' || status === 'Submitted') return 'warning';
  return 'neutral';
}

function VerificationScreen() {
  return <RouteGate><VerificationContent /></RouteGate>;
}

function VerificationContent() {
  const { language } = useCopy();
  const { responseId = '' } = useParams();
  const { state } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending } = useDemoCommand();
  const navigate = useNavigate();
  const [recording, setRecording] = useState(false);
  const [captureError, setCaptureError] = useState('');
  const response = state?.responses.find((item) => item.id === responseId && item.respondentId === user?.id);
  const survey = response ? state?.surveys.find((item) => item.id === response.surveyId) : undefined;
  const run = state?.verificationRuns.filter((item) => item.responseId === responseId).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const payment = state?.payments.find((item) => item.responseId === responseId);
  const unresolvedFlags = [...(response?.flags ?? []), ...(user?.accountFlags ?? []), ...(run?.flags ?? [])].filter((flag) => !flag.resolvedAt);

  async function capture() {
    if (!response) return;
    setCaptureError(''); setRecording(true);
    const visualDelay = new Promise((resolve) => window.setTimeout(resolve, 1150));
    try {
      const command = execute({ type: 'CAPTURE_AUDIO', payload: { responseId: response.id, phrase: { en: VOICE_PHRASE.en, bn: VOICE_PHRASE.bn }, clipDurationMs: 3200 } });
      await Promise.all([command, visualDelay]);
    } catch (cause) { setCaptureError(readableError(cause, tx(language, 'commandError'))); }
    finally { setRecording(false); }
  }

  const checks = [
    { key: 'device', label: tx(language, 'deviceCheck') },
    { key: 'timing', label: tx(language, 'timingCheck') },
    { key: 'attention', label: tx(language, 'attentionCheck') },
    { key: 'voice', label: tx(language, 'voiceCheck') },
  ];
  const isPending = response?.verificationStatus === 'Pending' || run?.status === 'Pending';
  const canCapture = !!response && response.status !== 'Draft' && response.verificationStatus === 'NotStarted' && !run;

  return <div className="respondent-page respondent-verification-page">
    <button className="respondent-back-button" type="button" onClick={() => navigate('/respondent/explore')}><ArrowLeft size={18} />{tx(language, 'backExplore')}</button>
    {!response ? <EmptyState title={tx(language, 'missingUser')} description={tx(language, 'surveyClosed')} action={<Button onClick={() => navigate('/respondent/explore')}>{tx(language, 'goToExplore')}</Button>} /> : <>
      <ScreenHeading eyebrow={survey ? localize(survey.title, language) : undefined} title={run || response.verificationStatus !== 'NotStarted' ? tx(language, 'verificationComplete') : tx(language, 'audioTitle')} description={response.verificationStatus === 'Flagged' ? tx(language, 'flaggedCopy') : run || response.verificationStatus !== 'NotStarted' ? tx(language, 'cleanCopy') : tx(language, 'audioIntro')} />
      <div className="respondent-status-strip"><div><span>{tx(language, 'responseStatus')}</span><Badge tone={badgeTone(response.status)}>{statusLabel(response.status, language)}</Badge></div><div><span>{tx(language, 'verificationStatus')}</span><Badge tone={badgeTone(response.verificationStatus)}>{response.verificationStatus === 'NotStarted' ? tx(language, 'notRun') : response.verificationStatus === 'Pending' ? tx(language, 'verificationPending') : response.verificationStatus === 'Passed' ? tx(language, 'passed') : tx(language, 'flagged')}</Badge></div>{payment && <div><span>{tx(language, 'earnings')}</span><Badge tone={badgeTone(payment.status)}>{statusLabel(payment.status, language)}</Badge></div>}</div>
      {canCapture && <Card className="respondent-audio-card">
        <p className="respondent-eyebrow">{tx(language, 'speakPhrase')}</p><blockquote>{localize({ en: VOICE_PHRASE.en, bn: VOICE_PHRASE.bn }, language)}</blockquote>
        <img className={`respondent-waveform ${recording ? 'is-recording' : ''}`} src="/mobile/sample-waveform.svg" alt={language === 'bn' ? 'নমুনা তরঙ্গরূপ' : 'Sample audio waveform'} />
        <div className="respondent-audio-meta"><span><Clock3 size={15} />{tx(language, 'sampleLength')}</span><span><Headphones size={15} />{tx(language, 'audioDisclaimer')}</span></div>
        {captureError && <Notice tone="danger" icon={<AlertCircle size={16} />}>{captureError}</Notice>}
        <Button className="respondent-record-button" onClick={() => void capture()} loading={recording || pending}><span className="respondent-record-pulse"><Mic2 size={19} /></span>{recording ? tx(language, 'recording') : pending ? tx(language, 'checking') : tx(language, 'recordSample')}</Button>
        <p className="respondent-microcopy">{tx(language, 'audioDisclaimer')}</p>
      </Card>}
      {isPending && <Notice tone="info" icon={<Loader2 className="respondent-spin" size={17} />}>{tx(language, 'verificationPending')}</Notice>}
      {response.verificationStatus === 'NotStarted' && !canCapture && response.status !== 'Draft' && <Notice tone="warning" icon={<Clock3 size={17} />}>{tx(language, 'awaitingCapture')}</Notice>}
      {(run || Object.keys(response.checks).length > 0) && <Card className="respondent-receipt-card">
        <div className="respondent-receipt-heading"><span className="respondent-receipt-stamp"><ShieldCheck size={22} /></span><div><p className="respondent-eyebrow">{tx(language, 'verificationComplete')}</p><h2>{run?.status === 'Pending' || isPending ? tx(language, 'verificationPending') : response.verificationStatus === 'Flagged' ? tx(language, 'flagged') : response.verificationStatus === 'Passed' ? tx(language, 'passed') : tx(language, 'notRun')}</h2></div></div>
        {run && <div className="respondent-saved-phrase"><div><span>{tx(language, 'speakPhrase')}</span><strong>{localize(run.phrase, language)}</strong></div><small>{tx(language, 'receiptReference')}: {run.id.slice(-8)} · {formatDate(run.startedAt, language)} · {(run.clipDurationMs / 1000).toFixed(1)}s</small></div>}
        <div className="respondent-check-list">{checks.map(({ key, label }) => {
          const check: IntegrityCheck | undefined = run?.checks[key] ?? response.checks[key];
          return <div className="respondent-check-row" key={key}><span className="respondent-check-icon">{check ? check.passed ? <CheckCircle2 size={17} /> : <AlertCircle size={17} /> : <Clock3 size={17} />}</span><div><strong>{label}</strong><p>{check ? check.detail : isPending ? tx(language, 'checkPending') : tx(language, 'notRun')}</p></div><span className={`respondent-check-result ${check ? check.passed ? 'is-passed' : 'is-flagged' : 'is-pending'}`}>{check ? check.passed ? tx(language, 'passed') : tx(language, 'flagged') : tx(language, 'checkPending')}</span></div>;
        })}</div>
        {unresolvedFlags.length > 0 && <div className="respondent-flag-list">{unresolvedFlags.map((flag) => <Notice key={flag.id} tone="warning" icon={<AlertCircle size={16} />}><strong>{flag.label}</strong><span>{flag.reason}</span></Notice>)}</div>}
        {response.reviewDecision && <div className={`respondent-review-decision ${response.reviewDecision.decision}`}><strong>{tx(language, response.reviewDecision.decision === 'approved' ? 'approved' : 'rejected')}</strong><p>{response.reviewDecision.note}</p><small>{formatDate(response.reviewDecision.at, language)}</small></div>}
        {response.verificationStatus === 'Flagged' && <Notice tone="warning" icon={<AlertCircle size={16} />}>{tx(language, 'flaggedCopy')}</Notice>}
        {response.verificationStatus === 'Passed' && response.status !== 'Approved' && response.status !== 'Rejected' && <Notice tone="success" icon={<CheckCircle2 size={16} />}>{tx(language, 'cleanCopy')}</Notice>}
      </Card>}
      <Card className="respondent-journey-card"><h2>{tx(language, 'nextAction')}</h2><JourneyStep done={response.status !== 'Draft'} label={tx(language, 'responseSubmitted')} />
        <JourneyStep done={response.verificationStatus === 'Passed' || response.verificationStatus === 'Flagged'} active={isPending} label={response.verificationStatus === 'Flagged' ? tx(language, 'flagged') : response.verificationStatus === 'Passed' ? tx(language, 'passed') : tx(language, 'verificationPending')} />
        <JourneyStep done={response.status === 'Approved' || response.status === 'Rejected'} active={response.status === 'UnderReview' || (response.status === 'Submitted' && !isPending)} label={response.status === 'Approved' ? tx(language, 'approved') : response.status === 'Rejected' ? tx(language, 'rejected') : tx(language, 'reviewPending')} />
        {payment && <JourneyStep done={payment.status === 'Paid'} active={payment.status === 'Processing'} label={statusLabel(payment.status, language)} />}
        {response.status === 'Rejected' && response.reviewDecision?.note && <p className="respondent-rejection-note">{response.reviewDecision.note}</p>}
      </Card>
      <div className="respondent-page-actions"><Button variant="secondary" onClick={() => navigate('/respondent/earnings')}>{tx(language, 'viewEarnings')}<ArrowRight size={16} /></Button></div>
    </>}
  </div>;
}

function JourneyStep({ done, active, label }: { done?: boolean; active?: boolean; label: string }) {
  return <div className={`respondent-journey-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}><span>{done ? <Check size={13} /> : active ? <Loader2 className="respondent-spin" size={13} /> : <span />}</span><strong>{label}</strong></div>;
}

function EarningsScreen() {
  return <RouteGate showNavigation><EarningsContent /></RouteGate>;
}

function EarningsContent() {
  const { language } = useCopy();
  const { state, refresh, error } = useDemoState();
  const { user } = useDemoSession();
  const navigate = useNavigate();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const respondentPayments = state?.payments.filter((payment) => payment.respondentId === user?.id).sort((a, b) => (b.completedAt ?? b.scheduledAt).localeCompare(a.completedAt ?? a.scheduledAt)) ?? [];
  const pendingTotal = respondentPayments.filter((payment) => payment.status === 'Processing').reduce((total, payment) => total + payment.rewardPaisa, 0);
  const walletAccount = user ? `respondent:${user.id}:wallet` : '';
  const paidTotal = state?.ledgerEntries.filter((entry) => entry.toAccount === walletAccount).reduce((total, entry) => total + entry.amountPaisa, 0) ?? 0;
  const selectedPayment = respondentPayments.find((payment) => payment.id === selectedPaymentId);
  const successful = respondentPayments.find((payment) => payment.status === 'Paid');

  return <div className="respondent-page respondent-earnings-page">
    <ScreenHeading eyebrow={tx(language, 'brand')} title={tx(language, 'earnings')} description={tx(language, 'earningsIntro')} />
    {successful && <Notice tone="success" icon={<Sparkles size={17} />}><strong>{tx(language, 'paid')} · {formatMoney(successful.rewardPaisa, language)}</strong><span>{tx(language, 'paidReceipt')}</span></Notice>}
    {error && <Notice tone="danger" icon={<AlertCircle size={17} />}>{error}<button className="respondent-inline-action" onClick={() => void refresh()}>{tx(language, 'retry')}</button></Notice>}
    <div className="respondent-balance-grid"><Card className="respondent-balance-card pending"><span>{tx(language, 'pendingRewards')}</span><strong>{formatMoney(pendingTotal, language)}</strong><small><Clock3 size={14} />{respondentPayments.filter((payment) => payment.status === 'Processing').length} {tx(language, 'processing')}</small></Card><Card className="respondent-balance-card paid"><span>{tx(language, 'paidTotal')}</span><strong>{formatMoney(paidTotal, language)}</strong><small><CheckCircle2 size={14} />{respondentPayments.filter((payment) => payment.status === 'Paid').length} {tx(language, 'paid')}</small></Card></div>
    <div className="respondent-section-title"><h2>{tx(language, 'paymentHistory')}</h2><span>{respondentPayments.length}</span></div>
    {respondentPayments.length === 0 ? <EmptyState title={tx(language, 'noPayments')} description={tx(language, 'noPaymentsCopy')} action={<Button variant="secondary" onClick={() => navigate('/respondent/explore')}>{tx(language, 'goToExplore')}<ArrowRight size={16} /></Button>} /> : <div className="respondent-payment-list">{respondentPayments.map((payment) => {
      const survey = state?.surveys.find((item) => item.id === payment.surveyId);
      return <button type="button" className="respondent-payment-card" key={payment.id} onClick={() => setSelectedPaymentId(payment.id)}>
        <span className={`respondent-payment-icon ${payment.status.toLowerCase()}`}>{payment.status === 'Paid' ? <Check size={19} /> : payment.status === 'Failed' ? <AlertCircle size={19} /> : <Clock3 size={19} />}</span>
        <span className="respondent-payment-main"><strong>{survey ? localize(survey.title, language) : tx(language, 'paidReceipt')}</strong><small>{formatDate(payment.completedAt ?? payment.scheduledAt, language)}{payment.sampleHistory ? ` · ${tx(language, 'sampleHistory')}` : ''}</small></span>
        <span className="respondent-payment-value"><strong>{formatMoney(payment.rewardPaisa, language)}</strong><Badge tone={badgeTone(payment.status)}>{statusLabel(payment.status, language)}</Badge></span><ChevronRight size={17} />
      </button>;
    })}</div>}
    <Notice tone="info" icon={<WalletCards size={17} />}>{tx(language, 'noCash')}</Notice>
    <Drawer open={!!selectedPayment} title={tx(language, 'paidReceipt')} onClose={() => setSelectedPaymentId(null)}>
      {selectedPayment && <PaymentReceipt payment={selectedPayment} onOpenSurvey={() => {
        const response = state?.responses.find((record) => record.id === selectedPayment.responseId);
        setSelectedPaymentId(null);
        if (response?.status === 'Draft') navigate(`/respondent/surveys/${selectedPayment.surveyId}`);
        else if (response) navigate(`/respondent/responses/${response.id}/verify`);
        else navigate('/respondent/explore');
      }} />}
    </Drawer>
  </div>;
}

function PaymentReceipt({ payment, onOpenSurvey }: { payment: Payment; onOpenSurvey(): void }) {
  const { language } = useCopy();
  const { state } = useDemoState();
  const survey = state?.surveys.find((item) => item.id === payment.surveyId);
  const wallet = state?.users.find((item) => item.id === payment.respondentId)?.walletType;
  return <div className="respondent-receipt-details">
    <div className={`respondent-receipt-amount ${payment.status === 'Paid' ? 'is-paid' : ''}`}><span>{tx(language, 'reward')}</span><strong>{formatMoney(payment.rewardPaisa, language)}</strong><Badge tone={badgeTone(payment.status)}>{statusLabel(payment.status, language)}</Badge></div>
    <dl><div><dt>{tx(language, 'aboutSurvey')}</dt><dd>{survey ? localize(survey.title, language) : '—'}</dd></div><div><dt>{tx(language, 'mockWallet')}</dt><dd>{wallet ?? '—'} · {tx(language, 'noCash')}</dd></div><div><dt>{tx(language, 'transaction')}</dt><dd>{payment.transactionRef ?? (payment.status === 'Processing' ? tx(language, 'processing') : '—')}</dd></div><div><dt>{tx(language, 'timestamp')}</dt><dd>{formatDate(payment.completedAt ?? payment.scheduledAt, language)}</dd></div></dl>
    {payment.status === 'Processing' && <Notice tone="info" icon={<Clock3 size={16} />}>{tx(language, 'paymentProcessingCopy')}</Notice>}
    {payment.status === 'Failed' && <Notice tone="danger" icon={<AlertCircle size={16} />}>{payment.lastError || tx(language, 'paymentFailedCopy')}</Notice>}
    {survey && <Button variant="secondary" className="respondent-full-button" onClick={onOpenSurvey}>{tx(language, 'openSurvey')}<ArrowRight size={16} /></Button>}
  </div>;
}

function ProfileScreen() {
  return <RouteGate showNavigation><ProfileContent /></RouteGate>;
}

function ProfileContent() {
  const { language, setLanguage } = useCopy();
  const { state } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending } = useDemoCommand();
  const [error, setError] = useState('');
  const notifications = state?.notifications.filter((notification) => notification.recipientId === user?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) ?? [];
  const ageLabel: Record<string, CopyKey> = { '18-24': 'age18to24', '25-34': 'age25to34', '35-44': 'age35to44', '45+': 'age45plus' };
  const genderLabel: Record<string, CopyKey> = { Woman: 'genderWoman', Man: 'genderMan', 'Non-binary': 'genderNonbinary', 'Prefer not to say': 'genderPreferNot' };
  const districtLabel: Record<string, CopyKey> = { Dhaka: 'districtDhaka', Chattogram: 'districtChattogram', Other: 'districtOther' };
  async function markRead(id: string) {
    setError('');
    try { await execute({ type: 'MARK_NOTIFICATION_READ', payload: { notificationId: id } }); }
    catch (cause) { setError(readableError(cause, tx(language, 'commandError'))); }
  }

  return <div className="respondent-page respondent-profile-page">
    <ScreenHeading eyebrow={tx(language, 'brand')} title={tx(language, 'profileTitle')} description={tx(language, 'profileIntro')} />
    <Card className="respondent-profile-card">
      <div className="respondent-profile-avatar"><UserRound size={28} /></div><div className="respondent-profile-name"><h2>{user?.name ?? '—'}</h2><p>{user?.phone ?? '—'}</p></div>
      <div className="respondent-profile-badges"><Badge tone={user?.identityStatus === 'Verified' ? 'success' : user?.identityStatus === 'Flagged' ? 'danger' : 'warning'}>{user?.identityStatus === 'Verified' ? <CheckCircle2 size={13} /> : <ShieldCheck size={13} />}{tx(language, 'identityBadge')}: {user?.identityStatus === 'Verified' ? tx(language, 'verified') : user?.identityStatus === 'Flagged' ? tx(language, 'flagged') : tx(language, 'notVerified')}</Badge><Badge tone={user?.verified ? 'success' : 'neutral'}>{user?.verified ? <CheckCircle2 size={13} /> : <Info size={13} />}{tx(language, 'verificationBadge')}: {user?.verified ? tx(language, 'verified') : tx(language, 'notVerified')}</Badge><Badge tone={user?.phone ? 'info' : 'neutral'}>{tx(language, 'phoneBadge')}: {user?.phone ?? '—'}</Badge></div>
    </Card>
    <Card className="respondent-profile-info-card"><div className="respondent-section-title"><h2>{tx(language, 'demographics')}</h2><UserRound size={17} /></div><dl><div><dt>{tx(language, 'ageLabel')}</dt><dd>{user?.demographics?.ageBand ? tx(language, ageLabel[user.demographics.ageBand] ?? 'ageLabel') : '—'}</dd></div><div><dt>{tx(language, 'genderLabel')}</dt><dd>{user?.demographics?.gender ? tx(language, genderLabel[user.demographics.gender] ?? 'genderLabel') : '—'}</dd></div><div><dt>{tx(language, 'districtLabel')}</dt><dd>{user?.demographics?.district ? tx(language, districtLabel[user.demographics.district] ?? 'districtLabel') : '—'}</dd></div><div><dt>{tx(language, 'wallet')}</dt><dd><span className="respondent-wallet-label"><WalletCards size={15} />{user?.walletType ?? '—'}</span></dd></div><div><dt>{tx(language, 'consent')}</dt><dd>{user?.consentAccepted ? tx(language, 'verified') : tx(language, 'notVerified')}</dd></div></dl></Card>
    <Card className="respondent-language-card"><div><div className="respondent-language-icon"><span>文</span></div><div><h2>{tx(language, 'languagePreference')}</h2><p>{language === 'bn' ? tx(language, 'bangla') : tx(language, 'english')}</p></div></div><div className="respondent-language-options" role="group" aria-label={tx(language, 'languagePreference')}><button type="button" className={language === 'en' ? 'is-selected' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button><button type="button" className={language === 'bn' ? 'is-selected' : ''} aria-pressed={language === 'bn'} onClick={() => setLanguage('bn')}>বাংলা</button></div></Card>
    <div className="respondent-section-title"><h2>{tx(language, 'notifications')}</h2><Badge tone={notifications.some((notification) => !notification.readAt) ? 'info' : 'neutral'}>{notifications.filter((notification) => !notification.readAt).length}</Badge></div>
    {error && <Notice tone="danger" icon={<AlertCircle size={16} />}>{error}</Notice>}
    {notifications.length === 0 ? <EmptyState title={tx(language, 'noNotifications')} /> : <div className="respondent-notification-list">{notifications.map((notification) => <Card className={`respondent-notification-card ${notification.readAt ? 'is-read' : ''}`} key={notification.id}>
      <span className="respondent-notification-icon">{notification.readAt ? <Check size={17} /> : <Bell size={17} />}</span><div className="respondent-notification-content"><h3>{localize(notification.title, language)}</h3><p>{localize(notification.body, language)}</p><small>{formatDate(notification.createdAt, language)}</small></div>{!notification.readAt && <Button variant="ghost" className="respondent-read-button" loading={pending} onClick={() => void markRead(notification.id)}>{tx(language, 'markRead')}</Button>}
    </Card>)}</div>}
  </div>;
}

export const respondentRoutes: RouteObject[] = [
  { path: '/respondent/onboarding', element: <OnboardingScreen /> },
  { path: '/respondent/explore', element: <ExploreScreen /> },
  { path: '/respondent/surveys/:surveyId', element: <SurveyRunnerScreen /> },
  { path: '/respondent/responses/:responseId/verify', element: <VerificationScreen /> },
  { path: '/respondent/earnings', element: <EarningsScreen /> },
  { path: '/respondent/profile', element: <ProfileScreen /> },
];

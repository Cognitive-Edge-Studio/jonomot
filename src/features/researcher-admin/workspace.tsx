import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDownToLine, BadgeCheck, Banknote, Check, CircleAlert, Clock3, FileCheck2, Flag, LockKeyhole, RotateCw, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { DemoCommand, IntegrityFlag, ResponseRecord, Survey, SurveyQuestion } from '../../../shared/contracts';
import { api } from '../../shared/api';
import { useDemoCommand, useDemoSession, useDemoState } from '../../shared/state';
import { Badge, Button, Card, Drawer, EmptyState, Modal, Textarea } from '../../shared/ui';
import { dateTime, ErrorNotice, PageLoading, prettyStatus, RoleNotice, statusTone, SurveyStatusBadge, t, useFeatureLocale, WorkspaceShell, money, type Locale } from './common';
import { accountBalance, answerLabel, availableResearcherPaisa, feeForReward, stateForSurvey, surveyBudget, unresolvedFlags } from './data';
import './researcher-admin.css';

type WorkspaceTab = 'overview' | 'responses' | 'analytics' | 'budget';
type ResponseFilter = 'all' | 'pending' | 'flagged' | 'approved' | 'rejected' | 'paid';

function surveyEscrowAccount(surveyId: string) { return `survey:${surveyId}:escrow` as const; }
function validReviewStatus(response: ResponseRecord) { return response.status === 'Submitted' || response.status === 'UnderReview'; }
function paymentFor(state: NonNullable<ReturnType<typeof useDemoState>['state']>, responseId: string) { return state.payments.find((payment) => payment.responseId === responseId); }
function localeCount(value: number, locale: Locale) { return value.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD'); }

export function SurveyWorkspace() {
  const { surveyId = '' } = useParams();
  const { state, loading, error, refresh } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending, error: commandError } = useDemoCommand();
  const { locale, setLocale } = useFeatureLocale(user);
  const navigate = useNavigate();
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [fundingOpen, setFundingOpen] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const survey = state?.surveys.find((item) => item.id === surveyId);
  const owner = survey?.researcherId === user?.id;
  const surveyData = state && survey ? stateForSurvey(state, survey.id) : null;
  const responses = surveyData?.responses ?? [];
  const funds = state && user ? availableResearcherPaisa(state, user.id) : 0;
  const feePaisa = survey ? feeForReward(survey.rewardPaisa, survey.feeBps) : 0;
  const totalBudget = survey ? surveyBudget(survey) : 0;

  async function command(action: DemoCommand) {
    try { await execute(action); await refresh(); return true; }
    catch { return false; }
  }
  async function exportCsv() {
    if (!survey || !user) return;
    setExporting(true); setExportError('');
    try {
      const blob = await api.exportSurveyCsv(survey.id, user.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const safeName = (survey.title.en || 'survey').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'survey';
      anchor.href = url; anchor.download = `${safeName}-responses.csv`; document.body.append(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) {
      setExportError(cause instanceof Error ? cause.message : t(locale, 'CSV export failed.', 'CSV রপ্তানি ব্যর্থ হয়েছে।'));
    } finally { setExporting(false); }
  }

  const heading = survey ? survey.title[locale] || survey.title.en : t(locale, 'Survey workspace', 'জরিপ কর্মক্ষেত্র');
  const actions = survey && owner ? <>
    {survey.status === 'Draft' && <Button variant="secondary" onClick={() => navigate(`/researcher/surveys/${survey.id}/edit`)}>{t(locale, 'Edit draft', 'খসড়া সম্পাদনা')}</Button>}
    <Button variant="secondary" loading={exporting} onClick={() => void exportCsv()}><ArrowDownToLine size={15} aria-hidden="true" />{t(locale, 'Export CSV', 'CSV রপ্তানি')}</Button>
  </> : undefined;

  return (
    <WorkspaceShell user={user} locale={locale} onLocale={setLocale} active="researcher" title={heading}
      description={survey ? survey.description[locale] || survey.description.en : t(locale, 'Track launch readiness, review responses, and reconcile survey spending.', 'চালুর প্রস্তুতি দেখুন, উত্তর পর্যালোচনা করুন এবং জরিপের খরচ মিলিয়ে নিন।')}
      eyebrow={survey?.topic ?? t(locale, 'Survey workspace', 'জরিপ কর্মক্ষেত্র')} actions={actions}>
      {loading && !state ? <PageLoading locale={locale} /> : null}
      {error && <ErrorNotice locale={locale} message={error} onRetry={() => void refresh()} />}
      {state && user?.role !== 'researcher' && <RoleNotice locale={locale} user={user} role="researcher" />}
      {state && user?.role === 'researcher' && !survey && <EmptyState title={t(locale, 'Survey not found', 'জরিপ পাওয়া যায়নি')} description={t(locale, 'This survey may have been reset or the link may be incorrect.', 'জরিপটি রিসেট হয়েছে অথবা লিংকটি ভুল হতে পারে।')} action={<Link className="ui-button ui-button--secondary" to="/researcher">{t(locale, 'Back to surveys', 'জরিপে ফিরুন')}</Link>} />}
      {state && survey && !owner && user?.role === 'researcher' && <RoleNotice locale={locale} user={user} role="researcher" />}
      {state && survey && owner && surveyData && <>
        <div className="desk-workspace-status"><SurveyStatusBadge status={survey.status} locale={locale} />
          <span className="desk-copy-line">{t(locale, 'Updated', 'হালনাগাদ')} {dateTime(survey.updatedAt, locale)}</span>
          {survey.sampleHistory && <Badge tone="warning">{t(locale, 'Sample history', 'নমুনা ইতিহাস')}</Badge>}
          <span className="desk-workspace-status__spacer" />
          <span className="desk-workspace-stat"><Users size={15} aria-hidden="true" />{localeCount(responses.filter((item) => item.status !== 'Draft').length, locale)} / {localeCount(survey.quota, locale)} {t(locale, 'responses', 'উত্তর')}</span>
        </div>
        {commandError && <div className="desktop-error" role="alert"><strong>{t(locale, 'Action not saved', 'কাজটি সংরক্ষিত হয়নি')}</strong><p>{commandError}</p></div>}
        {exportError && <div className="desktop-error" role="alert"><strong>{t(locale, 'Export unavailable', 'রপ্তানি পাওয়া যায়নি')}</strong><p>{exportError}</p></div>}
        <nav className="desk-tabs" aria-label={t(locale, 'Survey workspace sections', 'জরিপ কর্মক্ষেত্রের বিভাগ')}>
          <TabButton id="overview" selected={tab} setSelected={setTab} icon={<FileCheck2 size={16} />}>{t(locale, 'Launch checklist', 'চালুর তালিকা')}</TabButton>
          <TabButton id="responses" selected={tab} setSelected={setTab} icon={<Users size={16} />}>{t(locale, 'Responses', 'উত্তর')} <span className="desk-tab__count">{localeCount(responses.filter((item) => item.status !== 'Draft').length, locale)}</span></TabButton>
          <TabButton id="analytics" selected={tab} setSelected={setTab} icon={<ActivityIcon />}>{t(locale, 'Analytics', 'বিশ্লেষণ')}</TabButton>
          <TabButton id="budget" selected={tab} setSelected={setTab} icon={<Wallet size={16} />}>{t(locale, 'Budget & payments', 'বাজেট ও পেমেন্ট')}</TabButton>
        </nav>

        {tab === 'overview' && <OverviewTab state={state} survey={survey} responses={responses} locale={locale} pending={pending} availablePaisa={funds} feePaisa={feePaisa} totalBudget={totalBudget} onFund={() => setFundingOpen(true)} onCommand={command} />}
        {tab === 'responses' && <ResponseReviewTab state={state} survey={survey} responses={responses} locale={locale} pending={pending} onCommand={command} />}
        {tab === 'analytics' && <AnalyticsTab state={state} survey={survey} responses={responses} locale={locale} onExport={() => void exportCsv()} exporting={exporting} />}
        {tab === 'budget' && <BudgetTab state={state} survey={survey} responses={responses} payments={surveyData.payments} ledger={surveyData.ledger} locale={locale} pending={pending} onCommand={command} />}

        <FundingModal open={fundingOpen} onClose={() => setFundingOpen(false)} survey={survey} availablePaisa={funds} feePaisa={feePaisa} totalBudget={totalBudget} locale={locale} pending={pending}
          onConfirm={async () => { const ok = await command({ type: 'FUND_SURVEY', payload: { surveyId: survey.id } }); if (ok) setFundingOpen(false); }} />
      </>}
    </WorkspaceShell>
  );
}

function ActivityIcon() { return <BadgeCheck size={16} aria-hidden="true" />; }
function TabButton({ id, selected, setSelected, icon, children }: { id: WorkspaceTab; selected: WorkspaceTab; setSelected: (tab: WorkspaceTab) => void; icon: ReactNode; children: ReactNode }) {
  return <button type="button" className="desk-tab" role="tab" aria-selected={selected === id} aria-label={typeof children === 'string' ? children : undefined} onClick={() => setSelected(id)}>{icon}{children}</button>;
}

function OverviewTab({ state, survey, responses, locale, pending, availablePaisa, feePaisa, totalBudget, onFund, onCommand }: {
  state: NonNullable<ReturnType<typeof useDemoState>['state']>; survey: Survey; responses: ResponseRecord[]; locale: Locale; pending: boolean; availablePaisa: number; feePaisa: number; totalBudget: number; onFund: () => void; onCommand: (action: DemoCommand) => Promise<boolean>;
}) {
  const questionsReady = survey.questions.length > 0;
  const funded = !!survey.fundedAt;
  const ethicsApproved = survey.ethicsReview?.decision === 'approved' || ['Published', 'Active', 'Paused', 'Closed'].includes(survey.status);
  const active = survey.status === 'Active';
  const wasActivated = ['Active', 'Paused', 'Closed', 'Archived'].includes(survey.status);
  const steps = [
    { done: questionsReady, title: t(locale, 'Questions ready', 'প্রশ্ন প্রস্তুত'), detail: questionsReady ? t(locale, `${survey.questions.length} questions · bilingual questionnaire`, `${survey.questions.length}টি প্রশ্ন · দ্বিভাষিক প্রশ্নমালা`) : t(locale, 'Add at least one question in English and Bangla.', 'ইংরেজি ও বাংলায় অন্তত একটি প্রশ্ন যোগ করুন।'), action: !questionsReady ? <Link className="desk-review-link" to={`/researcher/surveys/${survey.id}/edit`}>{t(locale, 'Edit questions', 'প্রশ্ন সম্পাদনা')} →</Link> : null },
    { done: funded, title: t(locale, 'Funded', 'তহবিল যোগ'), detail: funded ? t(locale, `Escrow reserved · ${money(totalBudget, locale)}`, `এসক্রো সংরক্ষিত · ${money(totalBudget, locale)}`) : t(locale, `Reserve ${money(totalBudget, locale)} for ${survey.quota} responses.`, `${survey.quota}টি উত্তরের জন্য ${money(totalBudget, locale)} সংরক্ষণ করুন।`), action: !funded && survey.status === 'Draft' ? <button type="button" className="desk-review-link" onClick={onFund}>{t(locale, 'Review funding', 'তহবিল দেখুন')} →</button> : null },
    { done: ethicsApproved, title: t(locale, 'Ethics review', 'নৈতিকতা পর্যালোচনা'), detail: ethicsApproved ? t(locale, 'Questionnaire approved by admin', 'অ্যাডমিন প্রশ্নমালা অনুমোদন করেছেন') : survey.status === 'UnderReview' ? t(locale, 'Waiting for an admin decision', 'অ্যাডমিনের সিদ্ধান্তের অপেক্ষায়') : t(locale, 'Submit the funded survey for admin approval.', 'তহবিল যোগের পর অ্যাডমিন অনুমোদনের জন্য জমা দিন।'), action: survey.status === 'Draft' && funded && questionsReady ? <Button variant="secondary" loading={pending} onClick={() => void onCommand({ type: 'SUBMIT_SURVEY_REVIEW', payload: { surveyId: survey.id } })}>{t(locale, 'Submit for review', 'পর্যালোচনায় জমা')}</Button> : survey.status === 'UnderReview' ? <Badge tone="warning">{t(locale, 'In review', 'পর্যালোচনাধীন')}</Badge> : null },
    { done: wasActivated, title: t(locale, 'Activation', 'চালু'), detail: active ? t(locale, 'Eligible respondents can discover this survey.', 'যোগ্য উত্তরদাতারা জরিপটি খুঁজে পাবেন।') : survey.status === 'Published' ? t(locale, 'Approved. Activate when you are ready to collect responses.', 'অনুমোদিত। উত্তর সংগ্রহে প্রস্তুত হলে চালু করুন।') : wasActivated ? t(locale, `Previously launched · current status ${prettyStatus(survey.status, locale)}.`, `আগে চালু হয়েছিল · বর্তমান অবস্থা ${prettyStatus(survey.status, locale)}।`) : t(locale, 'Activation stays locked until admin approval.', 'অ্যাডমিন অনুমোদনের আগে চালু করা যাবে না।'), action: survey.status === 'Published' ? <Button loading={pending} onClick={() => void onCommand({ type: 'ACTIVATE_SURVEY', payload: { surveyId: survey.id } })}>{t(locale, 'Activate survey', 'জরিপ চালু করুন')}</Button> : null },
  ];
  return <div className="desk-launch">
    <Card className="desk-panel"><div className="desk-panel__heading"><div><h2>{t(locale, 'From draft to live study', 'খসড়া থেকে চালু জরিপ')}</h2><p>{t(locale, 'Prepare your questions, reserve the rewards, and get approval before inviting participants.', 'অংশগ্রহণকারীদের আমন্ত্রণের আগে প্রশ্ন প্রস্তুত করুন, পুরস্কারের অর্থ রাখুন এবং অনুমোদন নিন।')}</p></div><Badge tone={active ? 'success' : funded ? 'info' : 'neutral'}>{active ? t(locale, 'Ready for responses', 'উত্তরের জন্য প্রস্তুত') : t(locale, 'Launch path', 'চালুর ধাপ')}</Badge></div>
      <div className="desk-panel__body"><div className="desk-launch-checks">{steps.map((step, index) => <div className={`desk-launch-step ${step.done ? 'is-done' : ''}`} key={step.title}><span className="desk-launch-step__marker">{step.done ? <Check size={16} aria-hidden="true" /> : index + 1}</span><span className="desk-launch-step__copy"><strong>{step.title}</strong><small>{step.detail}</small></span><span className="desk-launch-step__action">{step.action}</span></div>)}</div>
        {survey.ethicsReview?.decision === 'rejected' && <div className="desk-rejection-note"><CircleAlert size={17} aria-hidden="true" /><div><strong>{t(locale, 'Revision requested', 'সংশোধন অনুরোধ')}</strong><p>{survey.ethicsReview.note || t(locale, 'The reviewer did not leave a note.', 'পর্যালোচক কোনো নোট দেননি।')}</p><Link to={`/researcher/surveys/${survey.id}/edit`}>{t(locale, 'Edit and resubmit', 'সম্পাদনা করে আবার জমা দিন')} →</Link></div></div>}
        <div className="desk-checklist-footer"><LockKeyhole size={15} aria-hidden="true" />{t(locale, 'Admin approval is required before you can activate this study.', 'এই গবেষণা চালু করতে আগে অ্যাডমিনের অনুমোদন দরকার।')}</div>
      </div>
    </Card>
    <aside className="desk-launch-aside"><p className="desktop-eyebrow">{t(locale, 'FUNDING SNAPSHOT', 'তহবিলের সারাংশ')}</p><h3>{t(locale, 'Clear costs before launch', 'চালুর আগে খরচ পরিষ্কার')}</h3><p>{t(locale, 'The full quota reserve is moved to escrow once. Each paid response later settles its reward and fee from that reserve.', 'সম্পূর্ণ কোটা একবার এসক্রোতে যায়। পরে প্রতিটি পরিশোধিত উত্তরের পুরস্কার ও ফি সেই সংরক্ষিত অর্থ থেকে মেটে।')}</p>
      <div className="desk-launch-aside__price"><span>{t(locale, 'Reward', 'পুরস্কার')}</span><strong>{money(survey.rewardPaisa, locale)} × {survey.quota}</strong></div>
      <div className="desk-launch-aside__price"><span>{t(locale, '1% platform fee', '১% প্ল্যাটফর্ম ফি')}</span><strong>{money(feePaisa, locale)} × {survey.quota}</strong></div>
      <div className="desk-launch-aside__price desk-launch-aside__price--total"><span>{t(locale, 'Total escrow', 'মোট এসক্রো')}</span><strong>{money(totalBudget, locale)}</strong></div>
      <div className="desk-checklist-footer"><Wallet size={15} aria-hidden="true" />{t(locale, 'Available mock balance', 'ডেমোতে উপলভ্য ব্যালেন্স')}: <strong>{money(availablePaisa, locale)}</strong></div>
      {!funded && survey.status === 'Draft' && <div className="desk-section-gap"><Button onClick={onFund}><Banknote size={16} aria-hidden="true" />{t(locale, 'Fund survey', 'জরিপে তহবিল দিন')}</Button></div>}
    </aside>
    <Card className="desk-panel desk-launch-recent"><div className="desk-panel__heading"><div><h2>{t(locale, 'Recent activity', 'সাম্প্রতিক কার্যকলাপ')}</h2><p>{t(locale, 'Follow funding, review, and launch decisions in one place.', 'তহবিল, পর্যালোচনা ও চালুর সিদ্ধান্ত এক জায়গায় দেখুন।')}</p></div></div><div className="desk-panel__body">{state.activityEvents.filter((event) => event.surveyId === survey.id).length === 0 ? <p className="desk-copy-line">{t(locale, 'No recorded activity yet.', 'এখনও কোনো কার্যকলাপ রেকর্ড নেই।')}</p> : <div className="desk-history-list">{state.activityEvents.filter((event) => event.surveyId === survey.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((event) => <div className="desk-history-item" key={event.id}><span>{event.detail || event.action.replaceAll('_', ' ')}</span><small>{dateTime(event.createdAt, locale)}</small></div>)}</div>}</div></Card>
    <Card className="desk-panel desk-launch-summary"><div className="desk-panel__heading"><div><h2>{t(locale, 'Study at a glance', 'গবেষণার সারাংশ')}</h2><p>{t(locale, 'Research plan and current participation.', 'গবেষণা পরিকল্পনা ও বর্তমান অংশগ্রহণ।')}</p></div></div><div className="desk-panel__body"><div className="desk-quality-row"><span>{t(locale, 'Questions', 'প্রশ্ন')}</span><div className="desk-progress"><span style={{ width: questionsReady ? '100%' : '0%' }} /></div><strong>{localeCount(survey.questions.length, locale)}</strong></div><div className="desk-quality-row"><span>{t(locale, 'Response quota', 'উত্তরের কোটা')}</span><div className="desk-progress"><span style={{ width: `${Math.min(100, Math.round(responses.filter((item) => item.status !== 'Draft').length / Math.max(survey.quota, 1) * 100))}%` }} /></div><strong>{localeCount(responses.filter((item) => item.status !== 'Draft').length, locale)} / {localeCount(survey.quota, locale)}</strong></div><div className="desk-quality-row"><span>{t(locale, 'Manual review', 'ম্যানুয়াল পর্যালোচনা')}</span><Badge tone={survey.manualReview ? 'info' : 'neutral'}>{survey.manualReview ? t(locale, 'On', 'চালু') : t(locale, 'Off', 'বন্ধ')}</Badge><strong /></div></div></Card>
  </div>;
}

function FundingModal({ open, onClose, survey, availablePaisa, feePaisa, totalBudget, locale, pending, onConfirm }: { open: boolean; onClose: () => void; survey: Survey; availablePaisa: number; feePaisa: number; totalBudget: number; locale: Locale; pending: boolean; onConfirm: () => Promise<void> }) {
  const enough = availablePaisa >= totalBudget;
  return <Modal open={open} title={t(locale, 'Review survey funding', 'জরিপের তহবিল পর্যালোচনা')} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>{t(locale, 'Cancel', 'বাতিল')}</Button><Button loading={pending} disabled={!enough || !!survey.fundedAt || survey.status !== 'Draft'} onClick={() => void onConfirm()}><Banknote size={15} aria-hidden="true" />{t(locale, 'Confirm and fund', 'নিশ্চিত করে তহবিল দিন')}</Button></>}>
    <div className="desk-funding-intro"><span className="desk-funding-intro__mark"><Wallet size={19} aria-hidden="true" /></span><p>{t(locale, 'Funding moves the full planned budget into this survey’s escrow. The server records the transfer once and confirms the new balance.', 'তহবিল দিলে পরিকল্পিত সম্পূর্ণ বাজেট এই জরিপের এসক্রোতে যায়। সার্ভার একবার স্থানান্তর সংরক্ষণ করে নতুন ব্যালেন্স নিশ্চিত করে।')}</p></div>
    <div className="desk-funding-table"><FundingLine label={t(locale, 'Reward per response', 'প্রতি উত্তরের পুরস্কার')} value={money(survey.rewardPaisa, locale)} /><FundingLine label={t(locale, 'Platform fee per response', 'প্রতি উত্তরের প্ল্যাটফর্ম ফি')} value={money(feePaisa, locale)} hint="1%" /><FundingLine label={t(locale, 'Responses', 'উত্তর')} value={localeCount(survey.quota, locale)} /><FundingLine label={t(locale, 'Total to escrow', 'এসক্রোতে মোট')} value={money(totalBudget, locale)} total /></div>
    <div className={`desk-funding-balance ${enough ? '' : 'is-short'}`}><span>{t(locale, 'Available after funding', 'তহবিলের পরে উপলভ্য')}</span><strong>{money(availablePaisa - totalBudget, locale)}</strong><small>{enough ? t(locale, `Current mock balance: ${money(availablePaisa, locale)}`, `বর্তমান ডেমো ব্যালেন্স: ${money(availablePaisa, locale)}`) : t(locale, 'The available balance is below the required escrow amount.', 'উপলভ্য ব্যালেন্স প্রয়োজনীয় এসক্রো পরিমাণের কম।')}</small></div>
  </Modal>;
}
function FundingLine({ label, value, hint, total }: { label: string; value: string; hint?: string; total?: boolean }) { return <div className={`desk-funding-line ${total ? 'is-total' : ''}`}><span>{label}{hint && <small>{hint}</small>}</span><strong>{value}</strong></div>; }

function ResponseReviewTab({ state, survey, responses, locale, pending, onCommand }: { state: NonNullable<ReturnType<typeof useDemoState>['state']>; survey: Survey; responses: ResponseRecord[]; locale: Locale; pending: boolean; onCommand: (action: DemoCommand) => Promise<boolean> }) {
  const [filter, setFilter] = useState<ResponseFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const categories: { id: ResponseFilter; label: string; count: number }[] = [
    { id: 'all', label: t(locale, 'All', 'সব'), count: responses.filter((response) => response.status !== 'Draft').length },
    { id: 'pending', label: t(locale, 'Pending', 'অপেক্ষমাণ'), count: responses.filter((response) => validReviewStatus(response) || response.verificationStatus === 'Pending').length },
    { id: 'flagged', label: t(locale, 'Flagged', 'চিহ্নিত'), count: responses.filter((response) => isFlagged(state, response)).length },
    { id: 'approved', label: t(locale, 'Approved', 'অনুমোদিত'), count: responses.filter((response) => response.status === 'Approved').length },
    { id: 'rejected', label: t(locale, 'Rejected', 'প্রত্যাখ্যাত'), count: responses.filter((response) => response.status === 'Rejected').length },
    { id: 'paid', label: t(locale, 'Paid', 'পরিশোধিত'), count: responses.filter((response) => paymentFor(state, response.id)?.status === 'Paid').length },
  ];
  const visible = responses.filter((response) => {
    if (filter === 'all') return response.status !== 'Draft';
    if (filter === 'pending') return validReviewStatus(response) || response.verificationStatus === 'Pending';
    if (filter === 'flagged') return isFlagged(state, response);
    if (filter === 'approved') return response.status === 'Approved';
    if (filter === 'rejected') return response.status === 'Rejected';
    return paymentFor(state, response.id)?.status === 'Paid';
  }).sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  const selected = responses.find((response) => response.id === selectedId) ?? null;
  return <>
    <Card className="desk-panel">
      <div className="desk-panel__heading"><div><h2>{t(locale, 'Response review', 'উত্তর পর্যালোচনা')}</h2><p>{t(locale, 'Inspect the answers and checks, record your decision, and follow the reward.', 'উত্তর ও যাচাই দেখুন, সিদ্ধান্ত দিন এবং পুরস্কারের অগ্রগতি জানুন।')}</p></div></div>
      <div className="desk-filter-row"><div className="desk-filter-row__filters" role="group" aria-label={t(locale, 'Filter responses', 'উত্তর ফিল্টার')}>
        {categories.map((category) => <button type="button" key={category.id} className="desk-filter-chip" aria-pressed={filter === category.id} onClick={() => setFilter(category.id)}>{category.label}<small>{localeCount(category.count, locale)}</small></button>)}
      </div><span className="desk-copy-line">{t(locale, 'Select any row to inspect its integrity receipt and answers.', 'উত্তর ও যাচাইয়ের রসিদ দেখতে যেকোনো সারি বেছে নিন।')}</span></div>
      {visible.length === 0 ? <EmptyState title={filter === 'all' ? t(locale, 'No submitted responses yet', 'এখনও কোনো উত্তর জমা হয়নি') : t(locale, `No ${categories.find((item) => item.id === filter)?.label.toLowerCase()} responses`, `${categories.find((item) => item.id === filter)?.label} উত্তর নেই`)} description={t(locale, 'New records appear here after respondents submit this survey. Sample history is labeled separately.', 'উত্তরদাতারা জরিপ জমা দিলে নতুন রেকর্ড এখানে আসবে। নমুনা ইতিহাস আলাদা করে চিহ্নিত।')} /> :
        <div className="desk-table-wrap"><table className="desk-table"><thead><tr><th>{t(locale, 'Respondent', 'উত্তরদাতা')}</th><th>{t(locale, 'Verification', 'যাচাই')}</th><th>{t(locale, 'Review', 'পর্যালোচনা')}</th><th>{t(locale, 'Payment', 'পেমেন্ট')}</th><th>{t(locale, 'Submitted', 'জমা')}</th><th><span className="sr-only">{t(locale, 'Actions', 'কাজ')}</span></th></tr></thead><tbody>
          {visible.map((response) => {
            const respondent = state.users.find((item) => item.id === response.respondentId);
            const payment = paymentFor(state, response.id);
            return <tr key={response.id}>
              <td><span className="desk-table__primary">{respondent?.name ?? (response.sampleHistory ? t(locale, 'Sample participant', 'নমুনা অংশগ্রহণকারী') : t(locale, 'Respondent', 'উত্তরদাতা'))}</span><span className="desk-table__secondary">{response.sampleHistory ? t(locale, 'Historical sample', 'ঐতিহাসিক নমুনা') : response.id.slice(0, 12)}</span></td>
              <td><Badge tone={statusTone(response.verificationStatus)}>{prettyStatus(response.verificationStatus, locale)}</Badge>{isFlagged(state, response) && <span className="desk-table__secondary">{t(locale, 'Flag needs attention', 'চিহ্ন পর্যালোচনা করুন')}</span>}</td>
              <td><Badge tone={statusTone(response.status)}>{prettyStatus(response.status, locale)}</Badge></td>
              <td>{payment ? <Badge tone={statusTone(payment.status)}>{prettyStatus(payment.status, locale)}</Badge> : <span className="desk-table__secondary">{t(locale, 'Not scheduled', 'নির্ধারিত নয়')}</span>}</td>
              <td>{dateTime(response.submittedAt ?? response.createdAt, locale)}</td>
              <td className="desk-table__action"><button type="button" className="desk-review-link" onClick={() => setSelectedId(response.id)}>{t(locale, 'Review', 'পর্যালোচনা')} →</button></td>
            </tr>;
          })}
        </tbody></table></div>}
    </Card>
    <ResponseDrawer open={!!selected} response={selected} survey={survey} state={state} locale={locale} pending={pending} onClose={() => setSelectedId(null)} onCommand={onCommand} />
  </>;
}

function isFlagged(state: NonNullable<ReturnType<typeof useDemoState>['state']>, response: ResponseRecord) {
  const respondent = state.users.find((user) => user.id === response.respondentId);
  return response.verificationStatus === 'Flagged' || unresolvedFlags(response.flags).length > 0 || unresolvedFlags(respondent?.accountFlags ?? []).length > 0;
}

function ResponseDrawer({ open, response, survey, state, locale, pending, onClose, onCommand }: { open: boolean; response: ResponseRecord | null; survey: Survey; state: NonNullable<ReturnType<typeof useDemoState>['state']>; locale: Locale; pending: boolean; onClose: () => void; onCommand: (action: DemoCommand) => Promise<boolean> }) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [decisionNote, setDecisionNote] = useState('');
  if (!response) return <Drawer open={false} title="" onClose={onClose}><div /></Drawer>;
  const responseValue = response;
  const respondent = state.users.find((item) => item.id === response.respondentId);
  const accountFlags = unresolvedFlags(respondent?.accountFlags ?? []);
  const responseOpenFlags = unresolvedFlags(response.flags);
  const verification = state.verificationRuns.filter((item) => item.responseId === response.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const checks = { ...(verification?.checks ?? {}), ...response.checks };
  const verificationComplete = response.verificationStatus === 'Passed' || verification?.status === 'Completed';
  const canReview = validReviewStatus(response) && verificationComplete;
  const canApprove = canReview && responseOpenFlags.length === 0 && accountFlags.length === 0;
  const activity = state.activityEvents.filter((event) => event.responseId === response.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const payment = paymentFor(state, response.id);
  async function resolveFlag(flag: IntegrityFlag) {
    const reason = reasons[flag.id]?.trim();
    if (!reason) return;
    const success = await onCommand({ type: 'RESOLVE_RESPONSE_FLAG', payload: { responseId: responseValue.id, flagId: flag.id, reason } });
    if (success) setReasons((current) => ({ ...current, [flag.id]: '' }));
  }
  async function decide(decision: 'approve' | 'reject') {
    if (!decisionNote.trim()) return;
    const success = await onCommand({ type: 'REVIEW_RESPONSE', payload: { responseId: responseValue.id, decision, note: decisionNote.trim() } });
    if (success) onClose();
  }
  return <Drawer open={open} title={t(locale, 'Response integrity receipt', 'উত্তরের যাচাই রসিদ')} onClose={onClose} footer={<div className="desk-drawer-footer__inner">
    <div className="desk-drawer-footer__states"><span>{t(locale, 'Verification', 'যাচাই')}: <Badge tone={statusTone(response.verificationStatus)}>{prettyStatus(response.verificationStatus, locale)}</Badge></span><span>{t(locale, 'Review', 'পর্যালোচনা')}: <Badge tone={statusTone(response.status)}>{prettyStatus(response.status, locale)}</Badge></span><span>{t(locale, 'Payment', 'পেমেন্ট')}: <Badge tone={payment ? statusTone(payment.status) : 'neutral'}>{payment ? prettyStatus(payment.status, locale) : t(locale, 'Not scheduled', 'নির্ধারিত নয়')}</Badge></span></div>
    {canReview && response.status !== 'Approved' && response.status !== 'Rejected' && <div className="desk-review-decision"><label className="desk-field"><span className="desk-field__label">{t(locale, 'Decision note', 'সিদ্ধান্তের নোট')} <span className="desk-field__hint">{t(locale, 'Required for audit history', 'অডিট ইতিহাসের জন্য আবশ্যক')}</span></span><Textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder={t(locale, 'Add a clear reason…', 'সুস্পষ্ট কারণ লিখুন…')} /></label><div className="desk-inline-actions"><Button variant="danger" disabled={pending || !decisionNote.trim()} onClick={() => void decide('reject')}>{t(locale, 'Reject response', 'উত্তর প্রত্যাখ্যান')}</Button><Button disabled={pending || !canApprove || !decisionNote.trim()} onClick={() => void decide('approve')}><Check size={15} aria-hidden="true" />{t(locale, 'Approve & schedule payment', 'অনুমোদন করে পেমেন্ট নির্ধারণ')}</Button></div>{!canApprove && <p className="desk-field__hint">{accountFlags.length ? t(locale, 'Admin account-flag resolution is still required.', 'অ্যাডমিনের অ্যাকাউন্ট-চিহ্ন সমাধান প্রয়োজন।') : responseOpenFlags.length ? t(locale, 'Resolve each response flag with a reason before approval.', 'অনুমোদনের আগে প্রতিটি উত্তর-চিহ্নের কারণসহ সমাধান করুন।') : !verificationComplete ? t(locale, 'Approval waits until verification is complete.', 'যাচাই শেষ হলে অনুমোদন করা যাবে।') : ''}</p>}</div>}
  </div>}>
    <div className="desk-response-identity"><span className="desk-response-identity__avatar">{(respondent?.name ?? 'R').slice(0, 1)}</span><div><strong>{respondent?.name ?? (response.sampleHistory ? t(locale, 'Sample participant', 'নমুনা অংশগ্রহণকারী') : t(locale, 'Respondent', 'উত্তরদাতা'))}</strong><span>{response.sampleHistory ? t(locale, 'Historical sample response', 'ঐতিহাসিক নমুনা উত্তর') : `${t(locale, 'Response', 'উত্তর')} · ${response.id}`}</span></div><span className="desk-response-identity__spacer" /><span className="desk-response-time"><Clock3 size={14} aria-hidden="true" />{formatDuration(response.timingSeconds, locale)}</span></div>
    <section className="desk-drawer-section"><SectionHeading icon={<FileCheck2 size={16} />} title={t(locale, 'Submitted answers', 'জমা দেওয়া উত্তর')} detail={`${localeCount(Object.keys(response.answers).length, locale)} ${t(locale, 'answers recorded', 'টি উত্তর রেকর্ড')}`} /><div className="desk-answer-list">{survey.questions.map((question, index) => <AnswerRow key={question.id} question={question} value={response.answers[question.id]} index={index} locale={locale} />)}</div></section>
    <section className="desk-drawer-section"><SectionHeading icon={<ShieldCheck size={16} />} title={t(locale, 'Integrity receipt', 'যাচাই রসিদ')} detail={verification ? `${t(locale, 'Captured', 'সংরক্ষিত')} ${dateTime(verification.completedAt ?? verification.startedAt, locale)}` : t(locale, 'No verification run is recorded.', 'যাচাই কার্যক্রম রেকর্ড নেই।')} />
      {Object.keys(checks).length === 0 ? <div className="desk-callout">{t(locale, 'Verification checks will appear here after the respondent completes the simulated capture.', 'উত্তরদাতা অনুকৃত ক্যাপচার সম্পন্ন করলে যাচাই এখানে দেখা যাবে।')}</div> : <div className="desk-receipt-grid">{Object.entries(checks).map(([key, check]) => <div className={`desk-receipt-check ${check.passed ? '' : 'is-failed'}`} key={key}><span className="desk-receipt-check__icon">{check.passed ? <Check size={13} aria-hidden="true" /> : <Flag size={12} aria-hidden="true" />}</span><span><strong>{checkName(key, locale)}</strong><small>{check.detail}</small></span><span>{check.passed ? t(locale, 'Passed', 'পাস') : t(locale, 'Flagged', 'চিহ্নিত')}</span></div>)}</div>}
      {verification && <div className="desk-integrity-meta"><span>{t(locale, 'Scenario snapshot', 'পরিস্থিতি সংরক্ষণ')}: <strong>{verification.scenario}</strong></span><span>{t(locale, 'Clip', 'ক্লিপ')}: {verification.clipDurationMs} ms</span></div>}
    </section>
    <section className="desk-drawer-section"><SectionHeading icon={<Flag size={16} />} title={t(locale, 'Original flags & resolutions', 'মূল চিহ্ন ও সমাধান')} detail={`${localeCount(response.flags.length, locale)} ${t(locale, 'response-level flags', 'টি উত্তর-সংক্রান্ত চিহ্ন')}`} />
      {response.flags.length === 0 ? <p className="desk-copy-line">{t(locale, 'No response flags were recorded.', 'কোনো উত্তর-সংক্রান্ত চিহ্ন রেকর্ড হয়নি।')}</p> : <div className="desk-flag-list">{response.flags.map((flag) => <div className={`desk-flag ${flag.resolvedAt ? 'is-resolved' : ''}`} key={flag.id}><div className="desk-flag__top"><div><strong>{flag.label}</strong><p>{flag.reason}</p></div><Badge tone={flag.resolvedAt ? 'success' : 'warning'}>{flag.resolvedAt ? t(locale, 'Resolved', 'সমাধান হয়েছে') : t(locale, 'Needs review', 'পর্যালোচনা প্রয়োজন')}</Badge></div>
        {flag.resolvedAt ? <div className="desk-flag__resolution">{flag.resolutionReason}<small>{dateTime(flag.resolvedAt, locale)}{flag.resolvedBy ? ` · ${state.users.find((item) => item.id === flag.resolvedBy)?.name ?? flag.resolvedBy}` : ''}</small></div> : <div className="desk-flag-resolve"><Textarea aria-label={t(locale, 'Reason for resolving flag', 'চিহ্ন সমাধানের কারণ')} value={reasons[flag.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [flag.id]: event.target.value }))} placeholder={t(locale, 'Document the reviewer’s reasoning…', 'পর্যালোচকের কারণ নথিভুক্ত করুন…')} /><Button variant="secondary" loading={pending} disabled={!reasons[flag.id]?.trim()} onClick={() => void resolveFlag(flag)}>{t(locale, 'Resolve flag', 'চিহ্ন সমাধান')}</Button></div>}</div>)}</div>}
      {accountFlags.length > 0 && <div className="desk-account-block"><LockKeyhole size={16} aria-hidden="true" /><div><strong>{t(locale, 'Account flag blocks approval', 'অ্যাকাউন্ট চিহ্ন অনুমোদন আটকে রেখেছে')}</strong><p>{t(locale, 'Only an admin can resolve account-level flags. The researcher controls remain disabled until that decision is saved.', 'শুধু অ্যাডমিন অ্যাকাউন্ট-সংক্রান্ত চিহ্ন সমাধান করতে পারেন। সিদ্ধান্ত সংরক্ষণ না হওয়া পর্যন্ত গবেষকের অনুমোদন বন্ধ থাকবে।')}</p>{accountFlags.map((flag) => <span key={flag.id} className="desk-account-block__flag">{flag.label}: {flag.reason}</span>)}</div></div>}
    </section>
    <section className="desk-drawer-section"><SectionHeading icon={<Clock3 size={16} />} title={t(locale, 'Review history', 'পর্যালোচনা ইতিহাস')} detail={t(locale, 'Saved decisions and overrides', 'সংরক্ষিত সিদ্ধান্ত ও পরিবর্তন')} />
      {response.reviewDecision && <div className="desk-decision-history"><Badge tone={response.reviewDecision.decision === 'approved' ? 'success' : 'danger'}>{prettyStatus(response.reviewDecision.decision === 'approved' ? 'Approved' : 'Rejected', locale)}</Badge><span>{response.reviewDecision.note}</span><small>{state.users.find((item) => item.id === response.reviewDecision?.reviewerId)?.name ?? response.reviewDecision.reviewerId} · {dateTime(response.reviewDecision.at, locale)}</small></div>}
      {activity.length > 0 ? <div className="desk-history-list">{activity.map((event) => <div className="desk-history-item" key={event.id}><span>{event.detail || event.action.replaceAll('_', ' ')}</span><small>{dateTime(event.createdAt, locale)}</small></div>)}</div> : !response.reviewDecision && <p className="desk-copy-line">{t(locale, 'No review decision has been recorded.', 'কোনো পর্যালোচনা সিদ্ধান্ত রেকর্ড নেই।')}</p>}
      {payment && <div className="desk-payment-receipt"><Banknote size={16} aria-hidden="true" /><div><strong>{payment.transactionRef ? t(locale, 'Payment receipt', 'পেমেন্ট রসিদ') : prettyStatus(payment.status, locale)}</strong><span>{payment.transactionRef ?? payment.lastError ?? payment.id}</span><small>{payment.completedAt ? dateTime(payment.completedAt, locale) : t(locale, `Attempt ${payment.attempts}`, `প্রচেষ্টা ${payment.attempts}`)}</small></div></div>}
    </section>
  </Drawer>;
}

function SectionHeading({ icon, title, detail }: { icon: ReactNode; title: string; detail?: string }) { return <div className="desk-drawer-section__heading"><span>{icon}</span><div><strong>{title}</strong>{detail && <small>{detail}</small>}</div></div>; }
function AnswerRow({ question, value, index, locale }: { question: SurveyQuestion; value: ResponseRecord['answers'][string] | undefined; index: number; locale: Locale }) { return <div className="desk-answer"><p className="desk-answer__question">{index + 1}. {question.prompt[locale] || question.prompt.en}</p><div className="desk-answer__value">{answerLabel(question, value, locale)}</div></div>; }
function checkName(key: string, locale: Locale) {
  const labels: Record<string, [string, string]> = { device: ['Device consistency', 'ডিভাইস সামঞ্জস্য'], timing: ['Completion timing', 'সময় যাচাই'], attention: ['Attention check', 'মনোযোগ যাচাই'], voice: ['Voice phrase match', 'কণ্ঠের বাক্য যাচাই'], identity: ['Identity check', 'পরিচয় যাচাই'] };
  return labels[key]?.[locale === 'bn' ? 1 : 0] ?? key.replaceAll('_', ' ');
}
function formatDuration(seconds: number | undefined, locale: Locale) {
  if (seconds === undefined) return t(locale, 'Timing not recorded', 'সময় রেকর্ড নেই');
  const minutes = Math.floor(seconds / 60); const remaining = seconds % 60;
  return t(locale, `${minutes}m ${remaining}s`, `${minutes}মি ${remaining}সে`);
}

function AnalyticsTab({ state, survey, responses, locale, onExport, exporting }: { state: NonNullable<ReturnType<typeof useDemoState>['state']>; survey: Survey; responses: ResponseRecord[]; locale: Locale; onExport: () => void; exporting: boolean }) {
  const submitted = responses.filter((response) => response.status !== 'Draft');
  const paidIds = new Set(state.payments.filter((payment) => payment.surveyId === survey.id && payment.status === 'Paid').map((payment) => payment.responseId));
  const quality = [
    { label: t(locale, 'Verified', 'যাচাইকৃত'), value: submitted.filter((response) => response.verificationStatus === 'Passed').length },
    { label: t(locale, 'Flagged', 'চিহ্নিত'), value: submitted.filter((response) => isFlagged(state, response)).length },
    { label: t(locale, 'Approved', 'অনুমোদিত'), value: submitted.filter((response) => response.status === 'Approved').length },
    { label: t(locale, 'Rejected', 'প্রত্যাখ্যাত'), value: submitted.filter((response) => response.status === 'Rejected').length },
    { label: t(locale, 'Paid', 'পরিশোধিত'), value: paidIds.size },
  ];
  return <div className="desk-analytics-grid">
    <Card className="desk-panel desk-analytics-quality"><div className="desk-panel__heading"><div><h2>{t(locale, 'Response quality', 'উত্তরের মান')}</h2><p>{t(locale, 'See which submitted answers have passed checks, received a decision, or earned a paid reward.', 'কোন জমা দেওয়া উত্তর যাচাই পেরিয়েছে, সিদ্ধান্ত পেয়েছে বা পুরস্কার পেয়েছে দেখুন।')}</p></div><Badge tone="info">{localeCount(submitted.length, locale)} {t(locale, 'responses', 'উত্তর')}</Badge></div><div className="desk-panel__body">{quality.map((item) => <div className="desk-quality-row" key={item.label}><span>{item.label}</span><div className="desk-progress"><span style={{ width: `${submitted.length ? item.value / submitted.length * 100 : 0}%` }} /></div><strong>{localeCount(item.value, locale)}</strong></div>)}<div className="desk-analytics-note">{t(locale, 'Measures use this study’s submitted responses. Question charts exclude unanswered fields.', 'এই গবেষণায় জমা দেওয়া উত্তর থেকে হিসাব। প্রশ্নের চার্টে উত্তরহীন ঘর বাদ দেওয়া হয়েছে।')}</div></div></Card>
    {survey.questions.map((question, index) => <QuestionAnalytics key={question.id} question={question} responses={submitted} locale={locale} index={index} />)}
    <Card className="desk-panel desk-analytics-export"><div className="desk-panel__heading"><div><h2>{t(locale, 'Download the response data', 'উত্তরের তথ্য ডাউনলোড')}</h2><p>{t(locale, 'Download answers, review decisions, and reward receipts for closer analysis.', 'বিস্তারিত বিশ্লেষণের জন্য উত্তর, পর্যালোচনার সিদ্ধান্ত ও পুরস্কারের রসিদ ডাউনলোড করুন।')}</p></div><ArrowDownToLine size={18} color="#0B6B61" aria-hidden="true" /></div><div className="desk-panel__body"><Button variant="secondary" loading={exporting} onClick={onExport}><ArrowDownToLine size={15} aria-hidden="true" />{t(locale, 'Export CSV', 'CSV রপ্তানি')}</Button><p className="desk-field__hint">{t(locale, 'The CSV supports Bangla text and opens in spreadsheet apps.', 'CSV-তে বাংলা লেখা থাকে এবং স্প্রেডশিট অ্যাপে খোলা যায়।')}</p></div></Card>
  </div>;
}

function QuestionAnalytics({ question, responses, locale, index }: { question: SurveyQuestion; responses: ResponseRecord[]; locale: Locale; index: number }) {
  const answered = responses.map((response) => response.answers[question.id]).filter((value) => value !== undefined && value !== '');
  const buckets: { label: string; count: number }[] = [];
  if (question.type === 'singleChoice' || question.type === 'multipleChoice') {
    for (const option of question.options) buckets.push({ label: option.label[locale] || option.label.en, count: answered.filter((value) => Array.isArray(value) ? value.includes(option.id) : value === option.id).length });
  } else if (question.type === 'likert') {
    const spread = question.max - question.min;
    const scaleValues = spread <= 50
      ? Array.from({ length: spread + 1 }, (_, offset) => question.min + offset)
      : [...new Set(answered.map(Number).filter((value) => value >= question.min && value <= question.max))].sort((a, b) => a - b);
    for (const value of scaleValues) buckets.push({ label: String(value), count: answered.filter((answer) => Number(answer) === value).length });
  } else if (question.type === 'number') {
    const counts = new Map<string, number>();
    answered.forEach((value) => { const key = String(value); counts.set(key, (counts.get(key) ?? 0) + 1); });
    const numericValues = [...counts.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
    numericValues.slice(0, 7).forEach(([label, count]) => buckets.push({ label, count }));
    if (numericValues.length > 7) buckets.push({ label: t(locale, 'Other values', 'অন্যান্য মান'), count: numericValues.slice(7).reduce((total, [, count]) => total + count, 0) });
  }
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const excerpts = question.type === 'text' ? responses.filter((response) => response.answers[question.id] !== undefined).slice(0, 4) : [];
  return <Card className="desk-panel desk-question-analytics"><div className="desk-panel__heading"><div><p className="desktop-eyebrow">{t(locale, `QUESTION ${index + 1}`, `প্রশ্ন ${index + 1}`)}</p><h2>{question.prompt[locale] || question.prompt.en}</h2><p>{t(locale, 'Answers recorded', 'রেকর্ড করা উত্তর')}: {localeCount(answered.length, locale)}</p></div></div><div className="desk-panel__body">
    {question.type === 'text' ? excerpts.length ? <div className="desk-excerpts">{excerpts.map((response) => <blockquote key={response.id}>{String(response.answers[question.id])}<small>{response.sampleHistory ? t(locale, 'Sample history', 'নমুনা ইতিহাস') : formatDuration(response.timingSeconds, locale)}</small></blockquote>)}</div> : <p className="desk-copy-line">{t(locale, 'No written responses yet.', 'এখনও কোনো লিখিত উত্তর নেই।')}</p> : buckets.length ? <div className="desk-chart" role="img" aria-label={t(locale, `Distribution for question ${index + 1}`, `প্রশ্ন ${index + 1}-এর বণ্টন`)}>{buckets.map((bucket) => <div className="desk-chart__row" key={bucket.label}><span className="desk-chart__label" title={bucket.label}>{bucket.label}</span><span className="desk-chart__track"><span className="desk-chart__bar" style={{ display: 'block', width: `${bucket.count / max * 100}%` }} /></span><span className="desk-chart__count">{localeCount(bucket.count, locale)}</span></div>)}</div> : <p className="desk-copy-line">{t(locale, 'No answers recorded for this question.', 'এই প্রশ্নের কোনো উত্তর রেকর্ড হয়নি।')}</p>}
  </div></Card>;
}

function BudgetTab({ state, survey, responses, payments, ledger, locale, pending, onCommand }: { state: NonNullable<ReturnType<typeof useDemoState>['state']>; survey: Survey; responses: ResponseRecord[]; payments: NonNullable<ReturnType<typeof useDemoState>['state']>['payments']; ledger: NonNullable<ReturnType<typeof useDemoState>['state']>['ledgerEntries']; locale: Locale; pending: boolean; onCommand: (action: DemoCommand) => Promise<boolean> }) {
  const fundedPaisa = ledger.filter((entry) => entry.toAccount === surveyEscrowAccount(survey.id)).reduce((total, entry) => total + entry.amountPaisa, 0);
  const escrowPaisa = accountBalance(state, surveyEscrowAccount(survey.id));
  const paidRewards = payments.filter((payment) => payment.status === 'Paid').reduce((total, payment) => total + payment.rewardPaisa, 0);
  const paidFees = payments.filter((payment) => payment.status === 'Paid').reduce((total, payment) => total + payment.feePaisa, 0);
  const processing = payments.filter((payment) => payment.status === 'Processing');
  const failed = payments.filter((payment) => payment.status === 'Failed');
  const responseById = new Map(responses.map((response) => [response.id, response]));
  const respondentName = (paymentResponseId: string) => { const response = responseById.get(paymentResponseId); return response ? state.users.find((item) => item.id === response.respondentId)?.name ?? (response.sampleHistory ? t(locale, 'Sample participant', 'নমুনা অংশগ্রহণকারী') : t(locale, 'Respondent', 'উত্তরদাতা')) : t(locale, 'Response record', 'উত্তরের রেকর্ড'); };
  return <>
    <div className="desk-budget-stats">
      <BudgetStat label={t(locale, 'Total funded', 'মোট তহবিল')} value={money(fundedPaisa, locale)} hint={survey.fundedAt ? t(locale, `Funded ${dateTime(survey.fundedAt, locale)}`, `তহবিল যোগ ${dateTime(survey.fundedAt, locale)}`) : t(locale, 'Not yet funded', 'এখনও তহবিল হয়নি')} />
      <BudgetStat label={t(locale, 'Escrow remaining', 'অবশিষ্ট এসক্রো')} value={money(escrowPaisa, locale)} hint={t(locale, 'Current ledger balance', 'বর্তমান লেজার ব্যালেন্স')} />
      <BudgetStat label={t(locale, 'Rewards paid', 'পরিশোধিত পুরস্কার')} value={money(paidRewards, locale)} hint={`${localeCount(payments.filter((payment) => payment.status === 'Paid').length, locale)} ${t(locale, 'paid responses', 'টি পরিশোধিত উত্তর')}`} />
      <BudgetStat label={t(locale, 'Platform fees paid', 'পরিশোধিত প্ল্যাটফর্ম ফি')} value={money(paidFees, locale)} hint={t(locale, 'Recorded with paid transfers', 'পরিশোধিত স্থানান্তরের সঙ্গে রেকর্ড')} />
    </div>
    {(processing.length > 0 || failed.length > 0) && <div className="desk-payment-status-strip">{processing.length > 0 && <span><Clock3 size={15} aria-hidden="true" />{localeCount(processing.length, locale)} {t(locale, 'payment(s) processing', 'টি পেমেন্ট প্রক্রিয়াধীন')}</span>}{failed.length > 0 && <span className="is-failed"><CircleAlert size={15} aria-hidden="true" />{localeCount(failed.length, locale)} {t(locale, 'payment(s) failed · retry below', 'টি পেমেন্ট ব্যর্থ · নিচে আবার চেষ্টা করুন')}</span>}</div>}
    <Card className="desk-panel"><div className="desk-panel__heading"><div><h2>{t(locale, 'Payment records', 'পেমেন্ট রেকর্ড')}</h2><p>{t(locale, 'Receipts and retry actions are attached to the original payment identity.', 'রসিদ ও পুনরায় চেষ্টার কাজ মূল পেমেন্ট পরিচয়ের সঙ্গেই যুক্ত।')}</p></div><Badge tone={payments.length ? 'info' : 'neutral'}>{localeCount(payments.length, locale)} {t(locale, 'records', 'টি রেকর্ড')}</Badge></div>
      {payments.length === 0 ? <EmptyState title={t(locale, 'No payment scheduled', 'কোনো পেমেন্ট নির্ধারিত নয়')} description={t(locale, 'Payment rows appear after a response is approved by the researcher.', 'গবেষক উত্তর অনুমোদন করলে পেমেন্ট সারি দেখা যাবে।')} /> : <div className="desk-table-wrap"><table className="desk-table"><thead><tr><th>{t(locale, 'Respondent', 'উত্তরদাতা')}</th><th>{t(locale, 'Status & receipt', 'অবস্থা ও রসিদ')}</th><th className="desk-table__number">{t(locale, 'Reward', 'পুরস্কার')}</th><th className="desk-table__number">{t(locale, 'Fee', 'ফি')}</th><th className="desk-table__number">{t(locale, 'Attempts', 'চেষ্টা')}</th><th>{t(locale, 'Action', 'কাজ')}</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id}><td><span className="desk-table__primary">{respondentName(payment.responseId)}</span><span className="desk-table__secondary">{payment.sampleHistory ? t(locale, 'Sample history', 'নমুনা ইতিহাস') : payment.id}</span></td><td><Badge tone={statusTone(payment.status)}>{prettyStatus(payment.status, locale)}</Badge><span className="desk-table__secondary">{payment.transactionRef ? `${t(locale, 'Receipt', 'রসিদ')}: ${payment.transactionRef}` : payment.lastError ?? payment.idempotencyKey}</span>{payment.completedAt && <span className="desk-table__secondary">{dateTime(payment.completedAt, locale)}</span>}</td><td className="desk-table__number">{money(payment.rewardPaisa, locale)}</td><td className="desk-table__number">{money(payment.feePaisa, locale)}</td><td className="desk-table__number">{localeCount(payment.attempts, locale)}</td><td>{payment.status === 'Failed' ? <Button variant="secondary" loading={pending} onClick={() => void onCommand({ type: 'RETRY_PAYMENT', payload: { paymentId: payment.id } })}><RotateCw size={14} aria-hidden="true" />{t(locale, 'Retry payout', 'পেমেন্ট আবার চেষ্টা')}</Button> : payment.status === 'Paid' ? <span className="desk-payment-paid"><Check size={14} aria-hidden="true" />{t(locale, 'Receipt saved', 'রসিদ সংরক্ষিত')}</span> : <span className="desk-copy-line">{t(locale, 'Waiting for worker', 'প্রক্রিয়ার অপেক্ষায়')}</span>}</td></tr>)}</tbody></table></div>}
    </Card>
    <div className="desk-callout desk-section-gap"><strong>{t(locale, 'Retry safety', 'পুনরায় চেষ্টার সুরক্ষা')}.</strong> {t(locale, 'Retry the existing payment when a transfer fails. A successful retry keeps one reward and one receipt for this response.', 'ট্রান্সফার ব্যর্থ হলে একই পেমেন্ট আবার চেষ্টা করুন। সফল হলে এই উত্তরের জন্য একটি পুরস্কার ও একটি রসিদ থাকবে।')}</div>
  </>;
}
function BudgetStat({ label, value, hint }: { label: string; value: string; hint: string }) { return <Card className="desk-budget-stat"><span>{label}</span><strong>{value}</strong><small>{hint}</small></Card>; }


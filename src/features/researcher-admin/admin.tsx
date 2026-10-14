import { useEffect, useState } from 'react';
import { BadgeCheck, Check, FileSearch, ShieldAlert, X } from 'lucide-react';
import type { DemoCommand, IntegrityFlag, Survey } from '../../../shared/contracts';
import { useDemoCommand, useDemoSession, useDemoState } from '../../shared/state';
import { Badge, Button, Card, EmptyState, Input, Textarea } from '../../shared/ui';
import { ErrorNotice, PageLoading, RoleNotice, t, useFeatureLocale, WorkspaceShell, dateTime, type Locale } from './common';
import { questionTypeLabel, unresolvedFlags } from './data';
import './researcher-admin.css';

type AdminTab = 'questionnaires' | 'account-flags';

export function AdminReviewInbox() {
  const { state, loading, error, refresh } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending, error: commandError } = useDemoCommand();
  const { locale, setLocale } = useFeatureLocale(user);
  const [tab, setTab] = useState<AdminTab>('questionnaires');
  const surveys = state?.surveys.filter((survey) => survey.status === 'UnderReview') ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const selected = surveys.find((survey) => survey.id === selectedId) ?? surveys[0] ?? null;
  useEffect(() => {
    if (selected && selected.id !== selectedId) { setSelectedId(selected.id); setDecisionNote(''); }
    if (!selected && selectedId) { setSelectedId(null); setDecisionNote(''); }
  }, [selected?.id, selectedId]);

  async function runCommand(command: DemoCommand) {
    const result = await execute(command);
    await refresh();
    return result;
  }

  async function reviewSurvey(survey: Survey, decision: 'approve' | 'reject') {
    if (!decisionNote.trim()) return;
    try {
      await runCommand({ type: 'REVIEW_SURVEY', payload: { surveyId: survey.id, decision, note: decisionNote.trim() } });
      setSelectedId(null);
      setDecisionNote('');
    } catch { /* command error is shown while the review selection stays open */ }
  }

  const title = t(locale, 'Review inbox', 'পর্যালোচনা ইনবক্স');
  return (
    <WorkspaceShell user={user} locale={locale} onLocale={setLocale} active="admin" title={title}
      description={t(locale, 'Check that questions are clear, participation is fair, and the audience fits the study. Leave a useful note with every decision.', 'প্রশ্ন পরিষ্কার কি না, অংশগ্রহণ ন্যায্য কি না এবং লক্ষ্যগোষ্ঠী উপযুক্ত কি না দেখুন। প্রতিটি সিদ্ধান্তের সাথে সহায়ক নোট দিন।')}>
      {loading && !state ? <PageLoading locale={locale} /> : null}
      {error && <ErrorNotice locale={locale} message={error} onRetry={() => void refresh()} />}
      {state && user?.role !== 'admin' && <RoleNotice locale={locale} user={user} role="admin" />}
      {state && user?.role === 'admin' && <>
        {commandError && <div className="desktop-error" role="alert"><strong>{t(locale, 'Review action not saved', 'পর্যালোচনা সংরক্ষিত হয়নি')}</strong><p>{commandError}</p></div>}
        <div className="desk-tabs" role="tablist" aria-label={t(locale, 'Admin review areas', 'অ্যাডমিন পর্যালোচনার বিভাগ')}>
          <button type="button" className="desk-tab" role="tab" aria-selected={tab === 'questionnaires'} onClick={() => setTab('questionnaires')}><FileSearch size={16} aria-hidden="true" />{t(locale, 'Questionnaires', 'প্রশ্নমালা')}<span className="desk-tab__count">{surveys.length}</span></button>
          <button type="button" className="desk-tab" role="tab" aria-selected={tab === 'account-flags'} onClick={() => setTab('account-flags')}><ShieldAlert size={16} aria-hidden="true" />{t(locale, 'Account flags', 'অ্যাকাউন্ট চিহ্ন')}<span className="desk-tab__count">{state.users.reduce((count, person) => count + unresolvedFlags(person.accountFlags ?? []).length, 0)}</span></button>
        </div>
        {tab === 'questionnaires' ? <QuestionnaireReview surveys={surveys} selected={selected} state={state} locale={locale} pending={pending} note={decisionNote} onNote={setDecisionNote} onSelect={(id) => { setSelectedId(id); setDecisionNote(''); }} onDecision={(survey, decision) => void reviewSurvey(survey, decision)} /> : <AccountFlagReview state={state} locale={locale} pending={pending} onCommand={runCommand} />}
      </>}
    </WorkspaceShell>
  );
}

function QuestionnaireReview({ surveys, selected, state, locale, pending, note, onNote, onSelect, onDecision }: { surveys: Survey[]; selected: Survey | null; state: NonNullable<ReturnType<typeof useDemoState>['state']>; locale: Locale; pending: boolean; note: string; onNote: (value: string) => void; onSelect: (id: string) => void; onDecision: (survey: Survey, decision: 'approve' | 'reject') => void }) {
  if (surveys.length === 0) return <Card className="desk-panel desk-admin-empty"><EmptyState title={t(locale, 'The review queue is clear', 'পর্যালোচনার সারি খালি')} description={t(locale, 'Funded surveys appear here after researchers submit them for ethics review. Rejected surveys return to the researcher as editable drafts.', 'গবেষকেরা নৈতিকতা পর্যালোচনায় জমা দিলে তহবিলযুক্ত জরিপ এখানে আসে। প্রত্যাখ্যাত জরিপ সম্পাদনাযোগ্য খসড়া হয়ে গবেষকের কাছে ফেরে।')} action={<span className="desk-admin-empty__check"><Check size={15} aria-hidden="true" />{t(locale, 'No pending decisions', 'কোনো সিদ্ধান্ত অপেক্ষমাণ নেই')}</span>} /></Card>;
  const researcher = state.users.find((item) => item.id === selected?.researcherId);
  return <div className="desk-admin-grid">
    <Card className="desk-panel"><div className="desk-panel__heading"><div><h2>{t(locale, 'Awaiting a decision', 'সিদ্ধান্তের অপেক্ষায়')}</h2><p>{t(locale, 'Select a submission to inspect its bilingual questionnaire.', 'দ্বিভাষিক প্রশ্নমালা দেখতে একটি জমা বেছে নিন।')}</p></div><Badge tone="warning">{surveys.length} {t(locale, 'pending', 'অপেক্ষমাণ')}</Badge></div>
      <div className="desk-inbox-list">{surveys.map((survey) => <button type="button" className="desk-inbox-item" aria-current={selected?.id === survey.id} key={survey.id} onClick={() => onSelect(survey.id)}><strong>{survey.title[locale] || survey.title.en}</strong><small>{state.users.find((item) => item.id === survey.researcherId)?.name ?? t(locale, 'Researcher', 'গবেষক')} · {dateTime(survey.updatedAt, locale)}</small><span className="desk-inbox-item__meta"><Badge tone="info">{survey.questions.length} {t(locale, 'questions', 'টি প্রশ্ন')}</Badge>{survey.sampleHistory && <Badge tone="warning">{t(locale, 'Sample history', 'নমুনা ইতিহাস')}</Badge>}</span></button>)}</div>
    </Card>
    {selected ? <Card className="desk-panel desk-question-review"><div className="desk-panel__heading"><div><p className="desktop-eyebrow">{t(locale, 'QUESTIONNAIRE PREVIEW', 'প্রশ্নমালার প্রিভিউ')}</p><h2>{selected.title[locale] || selected.title.en}</h2><p>{selected.description[locale] || selected.description.en}</p></div><Badge tone="warning">{t(locale, 'Under review', 'পর্যালোচনাধীন')}</Badge></div>
      <div className="desk-panel__body"><div className="desk-review-meta"><span>{t(locale, 'Researcher', 'গবেষক')} <strong>{researcher?.name ?? t(locale, 'Unknown', 'অজানা')}</strong></span><span>{t(locale, 'Questions', 'প্রশ্ন')} <strong>{selected.questions.length}</strong></span><span>{t(locale, 'Reward', 'পুরস্কার')} <strong>{new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', { style: 'currency', currency: 'BDT' }).format(selected.rewardPaisa / 100)}</strong></span><span>{t(locale, 'Quota', 'কোটা')} <strong>{selected.quota}</strong></span></div>
        <div className="desk-question-preview">{selected.questions.map((question, index) => <div className="desk-question-preview__item" key={question.id}><strong>{index + 1}. {question.prompt[locale] || question.prompt.en}</strong><small>{questionTypeLabel(question, locale)} · {question.required ? t(locale, 'Required', 'আবশ্যক') : t(locale, 'Optional', 'ঐচ্ছিক')}{(question.type === 'singleChoice' || question.type === 'multipleChoice') && ` · ${question.options.map((option) => option.label[locale] || option.label.en).join(' / ')}`}</small></div>)}</div>
        <div className="desk-review-note-field"><label className="desk-field"><span className="desk-field__label">{t(locale, 'Decision note', 'সিদ্ধান্তের নোট')} <span className="desk-field__hint">{t(locale, 'Required and visible to the researcher', 'আবশ্যক এবং গবেষক দেখতে পাবেন')}</span></span><Textarea value={note} onChange={(event) => onNote(event.target.value)} placeholder={t(locale, 'Approval guidance or revision request…', 'অনুমোদনের নির্দেশনা বা সংশোধনের অনুরোধ…')} /></label></div>
        <div className="desk-admin-decision-actions"><p className="desk-copy-line">{t(locale, 'An approval moves the study to Published. Researcher activation remains a separate step.', 'অনুমোদনে জরিপ Published হবে। গবেষককে আলাদাভাবে চালু করতে হবে।')}</p><div><Button variant="danger" loading={pending} disabled={!note.trim()} onClick={() => onDecision(selected, 'reject')}><X size={15} aria-hidden="true" />{t(locale, 'Request revisions', 'সংশোধন চান')}</Button><Button loading={pending} disabled={!note.trim()} onClick={() => onDecision(selected, 'approve')}><BadgeCheck size={15} aria-hidden="true" />{t(locale, 'Approve questionnaire', 'প্রশ্নমালা অনুমোদন')}</Button></div></div>
      </div>
    </Card> : <Card className="desk-panel"><EmptyState title={t(locale, 'Select a questionnaire', 'প্রশ্নমালা বেছে নিন')} description={t(locale, 'The complete bilingual preview and decision notes will appear here.', 'সম্পূর্ণ দ্বিভাষিক প্রিভিউ ও সিদ্ধান্তের নোট এখানে দেখা যাবে।')} /></Card>}
  </div>;
}

function AccountFlagReview({ state, locale, pending, onCommand }: { state: NonNullable<ReturnType<typeof useDemoState>['state']>; locale: Locale; pending: boolean; onCommand: (command: DemoCommand) => Promise<unknown> }) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const flagged = state.users.flatMap((person) => unresolvedFlags(person.accountFlags ?? []).map((flag) => ({ person, flag })));
  async function resolve(userId: string, flag: IntegrityFlag) {
    const reason = reasons[flag.id]?.trim();
    if (!reason) return;
    try { await onCommand({ type: 'RESOLVE_ACCOUNT_FLAG', payload: { userId, flagId: flag.id, reason } }); setReasons((current) => ({ ...current, [flag.id]: '' })); } catch { /* surfaced by the global command error */ }
  }
  return <Card className="desk-panel"><div className="desk-panel__heading"><div><h2>{t(locale, 'Account-level integrity flags', 'অ্যাকাউন্ট-সংক্রান্ত যাচাই চিহ্ন')}</h2><p>{t(locale, 'Only admin decisions can clear an account flag. Researchers see the block but cannot override it.', 'শুধু অ্যাডমিন অ্যাকাউন্ট চিহ্ন সরাতে পারেন। গবেষকেরা বাধাটি দেখতে পান, কিন্তু বদলাতে পারেন না।')}</p></div><Badge tone={flagged.length ? 'warning' : 'success'}>{flagged.length ? `${flagged.length} ${t(locale, 'open', 'খোলা')}` : t(locale, 'Clear', 'পরিষ্কার')}</Badge></div>
    {flagged.length === 0 ? <EmptyState title={t(locale, 'No account flags to resolve', 'সমাধানের জন্য অ্যাকাউন্ট চিহ্ন নেই')} description={t(locale, 'If the demo voice/account scenario creates an account-level flag, it will appear here with its original reason.', 'ডেমোর কণ্ঠ/অ্যাকাউন্ট পরিস্থিতি অ্যাকাউন্ট-চিহ্ন তৈরি করলে মূল কারণসহ এখানে আসবে।')} /> : <div className="desk-account-flag-list">{flagged.map(({ person, flag }) => <div className="desk-account-flag" key={`${person.id}-${flag.id}`}><div className="desk-account-flag__identity"><span className="desk-response-identity__avatar">{person.name.slice(0, 1)}</span><div><strong>{person.name}</strong><small>{person.role} · {flag.kind} {t(locale, 'flag', 'চিহ্ন')}</small></div></div><div className="desk-flag"><div className="desk-flag__top"><strong>{flag.label}</strong><Badge tone="warning">{t(locale, 'Needs admin decision', 'অ্যাডমিন সিদ্ধান্ত প্রয়োজন')}</Badge></div><p>{flag.reason}</p><small className="desk-account-flag__date">{flag.resolvedAt ? dateTime(flag.resolvedAt, locale) : t(locale, 'Open account flag', 'খোলা অ্যাকাউন্ট চিহ্ন')}</small></div><label className="desk-field"><span className="desk-field__label">{t(locale, 'Resolution reason', 'সমাধানের কারণ')}</span><Input value={reasons[flag.id] ?? ''} onChange={(event) => setReasons((current) => ({ ...current, [flag.id]: event.target.value }))} placeholder={t(locale, 'Explain the admin decision…', 'অ্যাডমিন সিদ্ধান্ত ব্যাখ্যা করুন…')} /></label><Button loading={pending} disabled={!reasons[flag.id]?.trim()} onClick={() => void resolve(person.id, flag)}><Check size={15} aria-hidden="true" />{t(locale, 'Resolve account flag', 'অ্যাকাউন্ট চিহ্ন সমাধান')}</Button></div>)}</div>}
  </Card>;
}


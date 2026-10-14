import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Eye, Plus, Save, Trash2 } from 'lucide-react';
import type { BilingualText, SurveyDefinition, SurveyQuestion } from '../../../shared/contracts';
import { useDemoCommand, useDemoSession, useDemoState } from '../../shared/state';
import { Badge, Button, Card, EmptyState, Input, Select, Textarea } from '../../shared/ui';
import { ErrorNotice, PageLoading, RoleNotice, WorkspaceShell, money, t, useFeatureLocale, type Locale } from './common';
import { questionTypeLabel } from './data';
import './researcher-admin.css';

type QuestionType = SurveyQuestion['type'];
const typeOrder: QuestionType[] = ['singleChoice', 'multipleChoice', 'likert', 'text', 'number'];
const id = () => globalThis.crypto?.randomUUID?.() ?? `question-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const blankText = (): BilingualText => ({ en: '', bn: '' });

function newQuestion(type: QuestionType, index: number): SurveyQuestion {
  const common = { id: id(), required: true, prompt: { en: `Question ${index + 1}`, bn: `প্রশ্ন ${index + 1}` } };
  if (type === 'singleChoice') return { ...common, type, options: [{ id: id(), label: { en: 'Option 1', bn: 'বিকল্প ১' } }, { id: id(), label: { en: 'Option 2', bn: 'বিকল্প ২' } }] };
  if (type === 'multipleChoice') return { ...common, type, minSelections: 1, maxSelections: 2, options: [{ id: id(), label: { en: 'Option 1', bn: 'বিকল্প ১' } }, { id: id(), label: { en: 'Option 2', bn: 'বিকল্প ২' } }] };
  if (type === 'likert') return { ...common, type, min: 1, max: 5, minLabel: { en: 'Not at all', bn: 'একদম নয়' }, maxLabel: { en: 'Very much', bn: 'অনেক' } };
  if (type === 'text') return { ...common, type, minLength: 2, maxLength: 180 };
  return { ...common, type, min: 0, max: 100000, step: 1 };
}

function changedType(question: SurveyQuestion, type: QuestionType): SurveyQuestion {
  const next = newQuestion(type, 0);
  return { ...next, id: question.id, prompt: question.prompt, required: question.required };
}

function currencyInput(paisa: number) { return (paisa / 100).toFixed(2).replace(/\.00$/, ''); }
function toPaisa(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return Math.round(amount * 100);
}
function typeName(type: QuestionType, locale: Locale) {
  const labels: Record<QuestionType, [string, string]> = {
    singleChoice: ['Single choice', 'একটি উত্তর'], multipleChoice: ['Multiple choice', 'একাধিক উত্তর'],
    likert: ['Scale', 'স্কেল'], text: ['Short answer', 'সংক্ষিপ্ত উত্তর'], number: ['Number', 'সংখ্যা'],
  };
  return labels[type][locale === 'bn' ? 1 : 0];
}

export function SurveyEditor() {
  const { surveyId } = useParams();
  const isNew = !surveyId;
  const { state, loading, error, refresh } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending, error: commandError } = useDemoCommand();
  const { locale, setLocale } = useFeatureLocale(user);
  const navigate = useNavigate();
  const survey = state?.surveys.find((item) => item.id === surveyId);
  const owner = !!survey && survey.researcherId === user?.id;
  const [title, setTitle] = useState<BilingualText>(blankText());
  const [description, setDescription] = useState<BilingualText>(blankText());
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [rewardInput, setRewardInput] = useState('100');
  const [quotaInput, setQuotaInput] = useState('20');
  const [errors, setErrors] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const initializedSurveyId = useRef<string | null>(null);

  useEffect(() => {
    if (!survey || initializedSurveyId.current === survey.id) return;
    initializedSurveyId.current = survey.id;
    setTitle({ ...survey.title });
    setDescription({ ...survey.description });
    setQuestions(survey.questions.map((question) => structuredClone(question)));
    setRewardInput(currencyInput(survey.rewardPaisa));
    setQuotaInput(String(survey.quota));
  }, [survey?.id]);

  const budgetLocked = !!survey?.fundedAt;
  const editable = isNew || (owner && survey?.status === 'Draft');
  const rewardPaisa = toPaisa(rewardInput);
  const quota = Number(quotaInput) || 0;
  const feeBps = state?.demoSettings.feeBps ?? 100;
  const estimatedBudget = useMemo(() => (rewardPaisa + Math.ceil(rewardPaisa * feeBps / 10000)) * quota, [rewardPaisa, feeBps, quota]);

  function updateQuestion(questionId: string, update: (question: SurveyQuestion) => SurveyQuestion) {
    setQuestions((current) => current.map((question) => question.id === questionId ? update(question) : question));
  }
  function moveQuestion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= questions.length) return;
    setQuestions((current) => {
      const reordered = [...current];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  }
  function validate() {
    const next: string[] = [];
    if (!title.en.trim() || !title.bn.trim()) next.push(t(locale, 'Add the survey title in both English and Bangla.', 'জরিপের শিরোনাম ইংরেজি ও বাংলায় লিখুন।'));
    if (!description.en.trim() || !description.bn.trim()) next.push(t(locale, 'Add the survey description in both English and Bangla.', 'জরিপের বিবরণ ইংরেজি ও বাংলায় লিখুন।'));
    if (questions.length === 0) next.push(t(locale, 'Add at least one question before saving.', 'সংরক্ষণের আগে অন্তত একটি প্রশ্ন যোগ করুন।'));
    questions.forEach((question, index) => {
      if (!question.prompt.en.trim() || !question.prompt.bn.trim()) next.push(t(locale, `Question ${index + 1}: add the prompt in both languages.`, `প্রশ্ন ${index + 1}: দুই ভাষাতেই প্রশ্ন লিখুন।`));
      if (question.type === 'singleChoice' || question.type === 'multipleChoice') {
        if (question.options.length < 2) next.push(t(locale, `Question ${index + 1}: add at least two choices.`, `প্রশ্ন ${index + 1}: অন্তত দুটি বিকল্প যোগ করুন।`));
        if (question.options.some((option) => !option.label.en.trim() || !option.label.bn.trim())) next.push(t(locale, `Question ${index + 1}: every choice needs both languages.`, `প্রশ্ন ${index + 1}: প্রতিটি বিকল্প দুই ভাষায় লিখুন।`));
        if (question.type === 'multipleChoice' && ((question.minSelections ?? 1) < 0 || (question.required && (question.minSelections ?? 1) < 1))) next.push(t(locale, `Question ${index + 1}: required questions need at least one choice; optional questions may allow zero.`, `প্রশ্ন ${index + 1}: আবশ্যক প্রশ্নে অন্তত একটি নির্বাচন দরকার; ঐচ্ছিক প্রশ্নে শূন্য হতে পারে।`));
        if (question.type === 'multipleChoice' && (question.maxSelections ?? question.options.length) < (question.minSelections ?? 1)) next.push(t(locale, `Question ${index + 1}: maximum choices must be at least the minimum.`, `প্রশ্ন ${index + 1}: সর্বোচ্চ নির্বাচন ন্যূনতম নির্বাচনের সমান বা বেশি হতে হবে।`));
        if (question.type === 'multipleChoice' && (question.maxSelections ?? question.options.length) > question.options.length) next.push(t(locale, `Question ${index + 1}: maximum choices cannot exceed the number of options.`, `প্রশ্ন ${index + 1}: সর্বোচ্চ নির্বাচন বিকল্পের সংখ্যার বেশি হতে পারবে না।`));
      }
      if (question.type === 'likert' && (!Number.isSafeInteger(question.min) || !Number.isSafeInteger(question.max) || question.max <= question.min)) next.push(t(locale, `Question ${index + 1}: use whole-number scale limits and set the maximum above the minimum.`, `প্রশ্ন ${index + 1}: পূর্ণসংখ্যার স্কেল সীমা দিন এবং সর্বোচ্চ মান ন্যূনতমের চেয়ে বড় রাখুন।`));
      if (question.type === 'number' && question.max !== undefined && question.min !== undefined && question.max < question.min) next.push(t(locale, `Question ${index + 1}: maximum number must be at least the minimum.`, `প্রশ্ন ${index + 1}: সর্বোচ্চ সংখ্যা ন্যূনতমের সমান বা বেশি হতে হবে।`));
      if (question.type === 'number' && question.step !== undefined && (!Number.isFinite(question.step) || question.step <= 0)) next.push(t(locale, `Question ${index + 1}: number step must be greater than zero.`, `প্রশ্ন ${index + 1}: সংখ্যার ধাপ শূন্যের বেশি হতে হবে।`));
      if (question.type === 'text' && question.maxLength !== undefined && question.minLength !== undefined && question.maxLength < question.minLength) next.push(t(locale, `Question ${index + 1}: maximum length must be at least the minimum length.`, `প্রশ্ন ${index + 1}: সর্বোচ্চ দৈর্ঘ্য ন্যূনতম দৈর্ঘ্যের সমান বা বেশি হতে হবে।`));
      if (question.type === 'text' && ((question.minLength !== undefined && (!Number.isSafeInteger(question.minLength) || question.minLength < 0)) || (question.maxLength !== undefined && (!Number.isSafeInteger(question.maxLength) || question.maxLength < 1)))) next.push(t(locale, `Question ${index + 1}: text limits must be whole non-negative character counts.`, `প্রশ্ন ${index + 1}: লেখার সীমা পূর্ণসংখ্যার অক্ষর সংখ্যা হতে হবে।`));
    });
    if (!budgetLocked && (!Number.isSafeInteger(rewardPaisa) || rewardPaisa <= 0 || quota < 1 || !Number.isSafeInteger(quota) || quota > 100000)) next.push(t(locale, 'Reward and response quota must be positive whole values; quota cannot exceed 100,000.', 'পুরস্কার ও উত্তর কোটা ধনাত্মক পূর্ণসংখ্যা হতে হবে; কোটা ১০০,০০০-এর বেশি হতে পারে না।'));
    setErrors(next);
    return next.length === 0;
  }

  async function saveDraft() {
    if (!validate() || !state || !user) return;
    const definition: SurveyDefinition = {
      title, description, questions, rewardPaisa, feeBps, quota,
      eligibility: survey?.eligibility ?? {}, manualReview: true,
      estimatedMinutes: survey?.estimatedMinutes ?? Math.max(1, Math.ceil(questions.length * .6)), topic: survey?.topic ?? 'Research',
    };
    try {
      if (isNew) {
        const result = await execute({ type: 'CREATE_SURVEY', payload: { definition } });
        if (!result.result?.surveyId) throw new Error(t(locale, 'We could not open the saved study. Return to Your surveys to check it.', 'সংরক্ষিত গবেষণা খোলা যায়নি। আপনার জরিপের তালিকায় ফিরে দেখুন।'));
        await refresh();
        navigate(`/researcher/surveys/${result.result.surveyId}`);
      } else if (surveyId) {
        await execute({ type: 'UPDATE_SURVEY', payload: { surveyId, title, description, questions, ...(budgetLocked ? {} : { rewardPaisa, feeBps, quota }) } });
        await refresh();
        navigate(`/researcher/surveys/${surveyId}`);
      }
    } catch { /* keep all local edits visible so the researcher can retry */ }
  }

  const heading = isNew ? t(locale, 'Create a survey', 'জরিপ তৈরি করুন') : t(locale, 'Edit survey', 'জরিপ সম্পাদনা');
  return (
    <WorkspaceShell user={user} locale={locale} onLocale={setLocale} active="researcher" title={heading}
      description={t(locale, 'Shape the questions and response plan before you reserve funds.', 'তহবিল সংরক্ষণের আগে প্রশ্ন ও উত্তর পরিকল্পনা তৈরি করুন।')}
      actions={survey ? <Link className="ui-button ui-button--secondary" to={`/researcher/surveys/${survey.id}`}><ArrowLeft size={15} aria-hidden="true" />{t(locale, 'Back to workspace', 'কর্মক্ষেত্রে ফিরুন')}</Link> : undefined}>
      {loading && !state ? <PageLoading locale={locale} /> : null}
      {error && <ErrorNotice locale={locale} message={error} onRetry={() => void refresh()} />}
      {state && user?.role !== 'researcher' && <RoleNotice locale={locale} user={user} role="researcher" />}
      {state && user?.role === 'researcher' && !isNew && !survey && <EmptyState title={t(locale, 'Survey not found', 'জরিপ পাওয়া যায়নি')} description={t(locale, 'This record may have been removed or the link may be incorrect.', 'রেকর্ডটি মুছে যেতে পারে অথবা লিংকটি ভুল হতে পারে.')} action={<Link className="ui-button ui-button--secondary" to="/researcher">{t(locale, 'Back to surveys', 'জরিপে ফিরুন')}</Link>} />}
      {state && user?.role === 'researcher' && (isNew || owner && survey) && <>
        {!editable && <div className="desk-sample-note"><Badge tone="warning">{survey ? survey.status : ''}</Badge>{t(locale, 'This survey is not an editable draft. After an ethics rejection, return to the draft editor to revise and resubmit.', 'এই জরিপটি সম্পাদনাযোগ্য খসড়া নয়। নৈতিকতা পর্যালোচনায় প্রত্যাখ্যাত হলে খসড়া সম্পাদকে ফিরে সংশোধন করে আবার জমা দিন।')}</div>}
        {errors.length > 0 && <div className="desktop-error" role="alert"><strong>{t(locale, 'Review these details before saving', 'সংরক্ষণের আগে এগুলো ঠিক করুন')}</strong><ul>{errors.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
        {commandError && <div className="desktop-error" role="alert"><strong>{t(locale, 'Draft not saved', 'খসড়া সংরক্ষিত হয়নি')}</strong><p>{commandError}</p></div>}
        <div className="desk-form-grid">
          <div className="desk-form-stack">
            <Card className="desk-form-card">
              <div className="desk-form-card__heading"><span className="desk-form-card__number">01</span><div><h2>{t(locale, 'Study overview', 'গবেষণার সারাংশ')}</h2><p>{t(locale, 'Clear bilingual copy helps participants understand what they are answering.', 'দ্বিভাষিক লেখা অংশগ্রহণকারীদের জরিপ বুঝতে সাহায্য করে।')}</p></div></div>
              <div className="desk-bilingual">
                <BilingualField label={t(locale, 'Survey title', 'জরিপের শিরোনাম')} value={title} onChange={(next) => setTitle(next)} multiline={false} disabled={!editable} locale={locale} />
                <BilingualField label={t(locale, 'Description', 'বিবরণ')} value={description} onChange={(next) => setDescription(next)} multiline disabled={!editable} locale={locale} />
              </div>
            </Card>

            <Card className="desk-form-card">
              <div className="desk-form-card__heading"><span className="desk-form-card__number">02</span><div><h2>{t(locale, 'Questionnaire', 'প্রশ্নমালা')}</h2><p>{t(locale, 'Five question types are supported. Use the arrows to adjust their order.', 'পাঁচ ধরনের প্রশ্ন যোগ করা যায়। তীরচিহ্ন দিয়ে ক্রম বদলান।')}</p></div></div>
              {questions.length > 0 && <div className="desk-question-list">{questions.map((question, index) => <QuestionEditor key={question.id} question={question} index={index} locale={locale} disabled={!editable} total={questions.length}
                onChange={(next) => updateQuestion(question.id, () => next)} onMove={(direction) => moveQuestion(index, direction)} onDelete={() => setQuestions((current) => current.filter((item) => item.id !== question.id))} />)}</div>}
              {questions.length === 0 && <div className="desk-callout">{t(locale, 'Add your first question to begin. The saved draft will keep all of this content editable.', 'শুরু করতে প্রথম প্রশ্নটি যোগ করুন। সংরক্ষিত খসড়ায় সব লেখা সম্পাদনাযোগ্য থাকবে।')}</div>}
              <div className="desk-section-gap"><p className="desk-field__label">{t(locale, 'Add a question', 'প্রশ্ন যোগ')}</p><div className="desk-add-question">
                {typeOrder.map((type) => <Button key={type} variant="secondary" disabled={!editable} onClick={() => setQuestions((current) => [...current, newQuestion(type, current.length)])}><Plus size={14} aria-hidden="true" />{typeName(type, locale)}</Button>)}
              </div></div>
            </Card>
          </div>

          <div className="desk-form-stack">
            <Card className="desk-form-card">
              <div className="desk-form-card__heading"><span className="desk-form-card__number">03</span><div><h2>{t(locale, 'Reward & response plan', 'পুরস্কার ও উত্তর পরিকল্পনা')}</h2><p>{t(locale, 'The local demo fee is 1%. The full amount is reserved when funded.', 'স্থানীয় ডেমো ফি ১%। তহবিল দিলে সম্পূর্ণ পরিমাণ সংরক্ষিত হবে।')}</p></div></div>
              <div className="desk-form-stack">
                <Field label={t(locale, 'Reward per response (BDT)', 'প্রতি উত্তরের পুরস্কার (BDT)')} hint={t(locale, 'Set the reward for a complete response. The platform fee is included in the reserve below.', 'সম্পূর্ণ উত্তরের পুরস্কার নির্ধারণ করুন। নিচের সংরক্ষিত অর্থে প্ল্যাটফর্ম ফি যোগ করা হয়েছে।')}><Input type="number" min="1" step="0.01" value={rewardInput} disabled={!editable || budgetLocked} onChange={(event) => setRewardInput(event.target.value)} /></Field>
                <Field label={t(locale, 'Response quota', 'উত্তরের কোটা')} hint={t(locale, 'How many completed responses should be funded?', 'কতটি সম্পূর্ণ উত্তরের জন্য তহবিল রাখবেন?')}><Input type="number" min="1" step="1" value={quotaInput} disabled={!editable || budgetLocked} onChange={(event) => setQuotaInput(event.target.value)} /></Field>
                <div className="desk-launch-aside__price"><span>{t(locale, 'Platform fee', 'প্ল্যাটফর্ম ফি')} · {(feeBps / 100).toFixed(0)}%</span><strong>{money(Math.ceil(rewardPaisa * feeBps / 10000), locale)} / {t(locale, 'response', 'উত্তর')}</strong></div>
                <div className="desk-launch-aside__price desk-launch-aside__price--total"><span>{t(locale, 'Estimated escrow', 'আনুমানিক এসক্রো')}</span><strong>{money(estimatedBudget, locale)}</strong></div>
              </div>
              {budgetLocked && <div className="desk-locked-note"><span aria-hidden="true">🔒</span><span>{t(locale, 'Reward, fee, and quota are locked after funding so the reserved escrow remains accurate. Questionnaire content can still be revised if ethics review returns the survey to Draft.', 'এসক্রো সঠিক রাখতে তহবিল যোগের পর পুরস্কার, ফি ও কোটা লক থাকে। নৈতিকতা পর্যালোচনায় জরিপ খসড়ায় ফিরলে প্রশ্নমালা সংশোধন করা যাবে।')}</span></div>}
            </Card>

            <Card className="desk-form-card">
              <div className="desk-form-card__heading"><span className="desk-form-card__number"><Eye size={15} aria-hidden="true" /></span><div><h2>{t(locale, 'Participant preview', 'অংশগ্রহণকারীর প্রিভিউ')}</h2><p>{t(locale, 'A quick look at the survey as it will appear in the respondent journey.', 'উত্তরদাতার যাত্রায় জরিপটি কেমন দেখাবে তার সংক্ষিপ্ত চিত্র।')}</p></div></div>
              <div className="desk-preview">
                <div><h3 className="desk-preview__title">{title[locale] || t(locale, 'Your survey title', 'আপনার জরিপের শিরোনাম')}</h3><p className="desk-preview__description">{description[locale] || t(locale, 'Add a short description for participants.', 'অংশগ্রহণকারীদের জন্য সংক্ষিপ্ত বিবরণ লিখুন।')}</p></div>
                {questions.slice(0, previewOpen ? questions.length : 3).map((question, index) => <div className="desk-preview__question" key={question.id}><strong>{index + 1}. {question.prompt[locale] || question.prompt.en || t(locale, 'Question prompt', 'প্রশ্ন')}</strong>{(question.type === 'singleChoice' || question.type === 'multipleChoice') && question.options.slice(0, 3).map((option) => <span className="desk-preview__option" key={option.id}>○ {option.label[locale] || option.label.en}</span>)}{question.type === 'likert' && <span className="desk-preview__option">{question.min} — {question.max}</span>}{(question.type === 'number' || question.type === 'text') && <span className="desk-preview__option">{questionTypeLabel(question, locale)}</span>}</div>)}
                {questions.length > 3 && <Button variant="ghost" onClick={() => setPreviewOpen((value) => !value)}>{previewOpen ? t(locale, 'Show fewer', 'কম দেখুন') : t(locale, `Show all ${questions.length} questions`, `সব ${questions.length}টি প্রশ্ন দেখুন`)}</Button>}
              </div>
            </Card>
          </div>
        </div>

        <div className="desk-form-actions">
          <span className="desk-copy-line">{t(locale, 'Changes stay here until the server confirms the draft save.', 'সার্ভার খসড়া সংরক্ষণ নিশ্চিত না করা পর্যন্ত পরিবর্তন এখানেই থাকবে।')}</span>
          <div className="desk-form-actions__right">{survey && <Link className="ui-button ui-button--ghost" to={`/researcher/surveys/${survey.id}`}>{t(locale, 'Cancel', 'বাতিল')}</Link>}<Button loading={pending} disabled={!editable} onClick={() => void saveDraft()}><Save size={15} aria-hidden="true" />{t(locale, 'Save draft', 'খসড়া সংরক্ষণ')}</Button></div>
        </div>
      </>}
    </WorkspaceShell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <div className="desk-field"><span className="desk-field__label">{label}</span>{children}{hint && <span className="desk-field__hint">{hint}</span>}</div>;
}

function BilingualField({ label, value, onChange, disabled, multiline, locale }: { label: string; value: BilingualText; onChange: (value: BilingualText) => void; disabled: boolean; multiline: boolean; locale: Locale }) {
  const Control = multiline ? Textarea : Input;
  return <div className="desk-field"><span className="desk-field__label">{label} <span className="desk-field__hint">· EN + বাংলা</span></span><div className="desk-bilingual">
    <div className="desk-bilingual__locale"><span className="desk-locale-pill">EN</span><Control aria-label={`${label} English`} value={value.en} disabled={disabled} placeholder={t(locale, 'Write in English', 'ইংরেজিতে লিখুন')} maxLength={multiline ? 500 : 100} onChange={(event) => onChange({ ...value, en: event.target.value })} /></div>
    <div className="desk-bilingual__locale"><span className="desk-locale-pill">বাং</span><Control aria-label={`${label} Bangla`} value={value.bn} disabled={disabled} placeholder={t(locale, 'Write in Bangla', 'বাংলায় লিখুন')} maxLength={multiline ? 500 : 100} onChange={(event) => onChange({ ...value, bn: event.target.value })} /></div>
  </div></div>;
}

function QuestionEditor({ question, index, total, locale, disabled, onChange, onMove, onDelete }: { question: SurveyQuestion; index: number; total: number; locale: Locale; disabled: boolean; onChange: (question: SurveyQuestion) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  function setPrompt(next: BilingualText) { onChange({ ...question, prompt: next } as SurveyQuestion); }
  function patchQuestion<T extends SurveyQuestion>(patch: Partial<T>) { onChange({ ...question, ...patch } as SurveyQuestion); }
  const choices = question.type === 'singleChoice' || question.type === 'multipleChoice';
  return <article className="desk-question-card">
    <div className="desk-question-card__top"><div className="desk-question-card__number"><span>{index + 1}</span>{t(locale, 'Question', 'প্রশ্ন')}</div><div className="desk-question-card__tools">
      <button type="button" className="desk-mini-button" aria-label={t(locale, `Move question ${index + 1} up`, `প্রশ্ন ${index + 1} উপরে নিন`)} disabled={disabled || index === 0} onClick={() => onMove(-1)}><ArrowUp size={15} aria-hidden="true" /></button>
      <button type="button" className="desk-mini-button" aria-label={t(locale, `Move question ${index + 1} down`, `প্রশ্ন ${index + 1} নিচে নিন`)} disabled={disabled || index === total - 1} onClick={() => onMove(1)}><ArrowDown size={15} aria-hidden="true" /></button>
      <button type="button" className="desk-mini-button desk-mini-button--danger" aria-label={t(locale, `Remove question ${index + 1}`, `প্রশ্ন ${index + 1} মুছুন`)} disabled={disabled} onClick={onDelete}><Trash2 size={14} aria-hidden="true" /></button>
    </div></div>
    <div className="desk-question-card__body">
      <div className="desk-question-card__fields">
        <BilingualField label={t(locale, 'Question prompt', 'প্রশ্ন')} value={question.prompt} onChange={setPrompt} disabled={disabled} multiline locale={locale} />
        <Field label={t(locale, 'Answer type', 'উত্তরের ধরন')}><Select value={question.type} disabled={disabled} onChange={(event) => onChange(changedType(question, event.target.value as QuestionType))}>{typeOrder.map((type) => <option key={type} value={type}>{typeName(type, locale)}</option>)}</Select></Field>
      </div>
      {choices && <div className="desk-field"><span className="desk-field__label">{t(locale, 'Choice options', 'উত্তরের বিকল্প')} · EN + বাংলা</span><div className="desk-choice-list">
        {question.options.map((option, optionIndex) => <div className="desk-choice-row" key={option.id}><Input aria-label={`${t(locale, 'Option', 'বিকল্প')} ${optionIndex + 1} English`} disabled={disabled} placeholder={t(locale, `Option ${optionIndex + 1} · EN`, `বিকল্প ${optionIndex + 1} · EN`)} value={option.label.en} onChange={(event) => onChange({ ...question, options: question.options.map((item) => item.id === option.id ? { ...item, label: { ...item.label, en: event.target.value } } : item) })} /><Input aria-label={`${t(locale, 'Option', 'বিকল্প')} ${optionIndex + 1} বাংলা`} disabled={disabled} placeholder={t(locale, `Option ${optionIndex + 1} · বাংলা`, `বিকল্প ${optionIndex + 1} · বাংলা`)} value={option.label.bn} onChange={(event) => onChange({ ...question, options: question.options.map((item) => item.id === option.id ? { ...item, label: { ...item.label, bn: event.target.value } } : item) })} /><button type="button" className="desk-mini-button desk-mini-button--danger" aria-label={t(locale, `Remove option ${optionIndex + 1}`, `বিকল্প ${optionIndex + 1} মুছুন`)} disabled={disabled || question.options.length <= 2} onClick={() => onChange({ ...question, options: question.options.filter((item) => item.id !== option.id) })}><Trash2 size={14} aria-hidden="true" /></button></div>)}
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange({ ...question, options: [...question.options, { id: id(), label: { en: '', bn: '' } }] })}><Plus size={14} aria-hidden="true" />{t(locale, 'Add option', 'বিকল্প যোগ')}</Button>
      </div></div>}
      {question.type === 'multipleChoice' && <div className="desk-field-row"><Field label={t(locale, 'Minimum selections', 'ন্যূনতম নির্বাচন')}><Input type="number" min={question.required ? 1 : 0} max={question.options.length} value={question.minSelections ?? 1} disabled={disabled} onChange={(event) => patchQuestion({ minSelections: Number(event.target.value) } as Partial<typeof question>)} /></Field><Field label={t(locale, 'Maximum selections', 'সর্বোচ্চ নির্বাচন')}><Input type="number" min="1" max={question.options.length} value={question.maxSelections ?? question.options.length} disabled={disabled} onChange={(event) => patchQuestion({ maxSelections: Number(event.target.value) } as Partial<typeof question>)} /></Field></div>}
      {question.type === 'likert' && <><div className="desk-field-row"><Field label={t(locale, 'Scale minimum', 'স্কেলের সর্বনিম্ন')}><Input type="number" value={question.min} disabled={disabled} onChange={(event) => patchQuestion({ min: Number(event.target.value) } as Partial<typeof question>)} /></Field><Field label={t(locale, 'Scale maximum', 'স্কেলের সর্বোচ্চ')}><Input type="number" value={question.max} disabled={disabled} onChange={(event) => patchQuestion({ max: Number(event.target.value) } as Partial<typeof question>)} /></Field></div><div className="desk-field-row"><BilingualField label={t(locale, 'Low-end label', 'সর্বনিম্ন মানের লেবেল')} value={question.minLabel ?? blankText()} onChange={(value) => patchQuestion({ minLabel: value } as Partial<typeof question>)} disabled={disabled} multiline={false} locale={locale} /><BilingualField label={t(locale, 'High-end label', 'সর্বোচ্চ মানের লেবেল')} value={question.maxLabel ?? blankText()} onChange={(value) => patchQuestion({ maxLabel: value } as Partial<typeof question>)} disabled={disabled} multiline={false} locale={locale} /></div></>}
      {question.type === 'number' && <div className="desk-field-row"><Field label={t(locale, 'Minimum value', 'সর্বনিম্ন মান')}><Input type="number" value={question.min ?? ''} disabled={disabled} onChange={(event) => patchQuestion({ min: event.target.value === '' ? undefined : Number(event.target.value) } as Partial<typeof question>)} /></Field><Field label={t(locale, 'Maximum value', 'সর্বোচ্চ মান')}><Input type="number" value={question.max ?? ''} disabled={disabled} onChange={(event) => patchQuestion({ max: event.target.value === '' ? undefined : Number(event.target.value) } as Partial<typeof question>)} /></Field><Field label={t(locale, 'Step', 'ধাপ')}><Input type="number" min="0.01" step="any" value={question.step ?? 1} disabled={disabled} onChange={(event) => patchQuestion({ step: Number(event.target.value) } as Partial<typeof question>)} /></Field></div>}
      {question.type === 'text' && <div className="desk-field-row"><Field label={t(locale, 'Minimum characters', 'সর্বনিম্ন অক্ষর')}><Input type="number" min="0" value={question.minLength ?? 0} disabled={disabled} onChange={(event) => patchQuestion({ minLength: Number(event.target.value) } as Partial<typeof question>)} /></Field><Field label={t(locale, 'Maximum characters', 'সর্বোচ্চ অক্ষর')}><Input type="number" min="1" value={question.maxLength ?? 180} disabled={disabled} onChange={(event) => patchQuestion({ maxLength: Number(event.target.value) } as Partial<typeof question>)} /></Field></div>}
      <div className="desk-question-card__footer"><label className="desk-check"><input type="checkbox" checked={question.required} disabled={disabled} onChange={(event) => patchQuestion({ required: event.target.checked } as Partial<typeof question>)} />{t(locale, 'Required answer', 'উত্তর আবশ্যক')}</label><span className="desk-ratio">{typeName(question.type, locale)}</span></div>
    </div>
  </article>;
}





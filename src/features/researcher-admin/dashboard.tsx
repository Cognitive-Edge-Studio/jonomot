import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ClipboardList, Coins, Plus, Users, WalletCards } from 'lucide-react';
import { useDemoCommand, useDemoSession, useDemoState } from '../../shared/state';
import { Badge, Button, Card, EmptyState, Modal, Skeleton } from '../../shared/ui';
import { ErrorNotice, RoleNotice, SurveyStatusBadge, WorkspaceShell, money, shortMoney, t, useFeatureLocale } from './common';
import { availableResearcherPaisa } from './data';
import { AudienceInsights } from './insights/AudienceInsights';
import { studyTemplates, type StudyTemplate } from './studyTemplates';
import { topicNames } from './insights/data';
import './researcher-admin.css';

export function ResearcherDashboard() {
  const { state, loading, error, refresh } = useDemoState();
  const { user } = useDemoSession();
  const { execute, pending, error: commandError } = useDemoCommand();
  const { locale, setLocale } = useFeatureLocale(user);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const navigate = useNavigate();
  const surveys = state?.surveys.filter((survey) => survey.researcherId === user?.id) ?? [];
  const responses = state?.responses.filter((response) => surveys.some((survey) => survey.id === response.surveyId)) ?? [];
  const availablePaisa = state && user ? availableResearcherPaisa(state, user.id) : 0;
  const completedCount = responses.filter((response) => response.status !== 'Draft' && !response.sampleHistory && !surveys.find((survey) => survey.id === response.surveyId)?.sampleHistory).length;
  const activeCount = surveys.filter((survey) => survey.status === 'Active' && !survey.sampleHistory).length;
  const samplesVisible = surveys.some((survey) => survey.sampleHistory || responses.some((response) => response.surveyId === survey.id && response.sampleHistory));

  async function createFromTemplate(template: StudyTemplate) {
    try {
      const result = await execute({ type: 'CREATE_SURVEY', payload: { definition: template.definition } });
      const surveyId = result.result?.surveyId;
      if (!surveyId) throw new Error(t(locale, 'We could not open the draft. Check Your surveys before trying again.', 'খসড়াটি খোলা যায়নি। আবার চেষ্টা করার আগে আপনার জরিপের তালিকা দেখুন।'));
      await refresh();
      setTemplatesOpen(false);
      navigate(`/researcher/surveys/${surveyId}/edit`);
    } catch { /* command errors are rendered below the template choices */ }
  }

  return (
    <WorkspaceShell user={user} locale={locale} onLocale={setLocale} active="researcher"
      title={t(locale, 'Research workspace', 'গবেষণা কর্মক্ষেত্র')}
      description={t(locale, 'Understand who is participating, see what needs your attention, and turn thoughtful questions into clearer decisions.', 'কারা অংশ নিচ্ছেন বুঝুন, কোন কাজে নজর দরকার দেখুন এবং অর্থপূর্ণ প্রশ্ন থেকে পরিষ্কার সিদ্ধান্তে পৌঁছান।')}
      actions={<><Button variant="secondary" onClick={() => navigate('/researcher/surveys/new')}><Plus size={16} aria-hidden="true" />{t(locale, 'Blank survey', 'খালি জরিপ')}</Button><Button onClick={() => setTemplatesOpen(true)}><ClipboardList size={16} aria-hidden="true" />{t(locale, 'Create from template', 'টেমপ্লেট থেকে তৈরি')}</Button></>}
    >
      {loading && !state ? <div className="desk-grid desk-grid--stats"><Skeleton style={{ height: 135 }} /><Skeleton style={{ height: 135 }} /><Skeleton style={{ height: 135 }} /></div> : null}
      {error && <ErrorNotice locale={locale} message={error} onRetry={() => void refresh()} />}
      {!loading && user?.role !== 'researcher' && <RoleNotice locale={locale} user={user} role="researcher" />}
      {state && user?.role === 'researcher' && <>
        {samplesVisible && <div className="desk-sample-note"><span aria-hidden="true">◈</span>{t(locale, 'Archived examples are marked “Sample history.” Your activity totals and “My studies” insights show current research only.', 'সংরক্ষিত উদাহরণগুলো “নমুনা ইতিহাস” হিসেবে চিহ্নিত। আপনার অংশগ্রহণের হিসাব ও “আমার গবেষণা” অন্তর্দৃষ্টিতে শুধু বর্তমান গবেষণা রয়েছে।')}</div>}

        <div className="desk-grid desk-grid--stats">
          <Card className="desk-stat desk-stat--balance"><div className="desk-stat__top"><span className="desk-stat__label">{t(locale, 'Available mock balance', 'ডেমোতে উপলভ্য ব্যালেন্স')}</span><span className="desk-stat__icon"><WalletCards size={17} aria-hidden="true" /></span></div><div className="desk-stat__value">{money(availablePaisa, locale)}</div><div className="desk-stat__foot">{t(locale, 'Local demo funds · no real payment is made', 'স্থানীয় ডেমো ফান্ড · কোনো আসল পেমেন্ট হয় না')}</div></Card>
          <Card className="desk-stat"><div className="desk-stat__top"><span className="desk-stat__label">{t(locale, 'Active studies', 'চলমান গবেষণা')}</span><span className="desk-stat__icon"><ActivityIcon /></span></div><div className="desk-stat__value">{activeCount.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}</div><div className="desk-stat__foot">{t(locale, 'Currently open to eligible respondents', 'যোগ্য উত্তরদাতাদের জন্য বর্তমানে উন্মুক্ত')}</div></Card>
          <Card className="desk-stat"><div className="desk-stat__top"><span className="desk-stat__label">{t(locale, 'Responses shared', 'জমা দেওয়া উত্তর')}</span><span className="desk-stat__icon"><Users size={17} aria-hidden="true" /></span></div><div className="desk-stat__value">{completedCount.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}</div><div className="desk-stat__foot">{t(locale, 'From current studies · archived samples excluded', 'বর্তমান গবেষণা থেকে · সংরক্ষিত নমুনা বাদ')}</div></Card>
        </div>

        <AudienceInsights state={state} userId={user.id} locale={locale} />
        <Card className="desk-panel">
          <div className="desk-panel__heading"><div><h2>{t(locale, 'Your surveys', 'আপনার জরিপ')}</h2><p>{t(locale, 'See which studies are collecting responses and what needs your attention next.', 'কোন জরিপে উত্তর আসছে এবং এরপর কোন কাজে নজর দেওয়া দরকার দেখুন।')}</p></div><Badge tone="neutral">{surveys.length.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')} {t(locale, 'total', 'মোট')}</Badge></div>
          {surveys.length === 0 ? <EmptyState title={t(locale, 'Your first study starts here', 'আপনার প্রথম গবেষণা এখান থেকে শুরু')}
            description={t(locale, 'Choose a focused template, define your audience, and review your questions before launching.', 'একটি লক্ষ্যভিত্তিক টেমপ্লেট বাছুন, অংশগ্রহণকারী নির্ধারণ করুন এবং চালুর আগে প্রশ্নগুলো পর্যালোচনা করুন।')}
            action={<Button onClick={() => setTemplatesOpen(true)}><Plus size={16} aria-hidden="true" />{t(locale, 'Choose a template', 'টেমপ্লেট বেছে নিন')}</Button>} /> :
            <div className="desk-survey-list">
              {surveys.map((survey) => {
                const surveyResponses = responses.filter((response) => response.surveyId === survey.id && response.status !== 'Draft');
                return <Link key={survey.id} to={`/researcher/surveys/${survey.id}`} className="desk-survey-row">
                  <span className="desk-survey-row__title"><strong>{survey.title[locale] || survey.title.en}</strong><small>{survey.sampleHistory ? `${t(locale, 'Sample history', 'নমুনা ইতিহাস')} · ` : ''}{survey.topic ?? t(locale, 'Untitled topic', 'বিষয় নির্ধারিত নয়')} · {survey.questions.length.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')} {t(locale, 'questions', 'টি প্রশ্ন')}</small></span>
                  <span className="desk-survey-row__metric"><strong>{surveyResponses.length.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')} / {survey.quota.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD')}</strong><small>{t(locale, 'Responses', 'উত্তর')}</small></span>
                  <span className="desk-survey-row__metric"><strong>{shortMoney(survey.rewardPaisa, locale)}</strong><small>{t(locale, 'Per response', 'প্রতি উত্তর')}</small></span>
                  <span className="desk-survey-row__end"><SurveyStatusBadge status={survey.status} locale={locale} /><span className="desk-survey-row__arrow"><ArrowUpRight size={17} aria-hidden="true" /></span><span className="sr-only">{t(locale, 'Open survey workspace', 'জরিপ কর্মক্ষেত্র খুলুন')}</span></span>
                </Link>;
              })}
            </div>}
        </Card>
      </>}

      <Modal open={templatesOpen} title={t(locale, 'Create a survey', 'জরিপ তৈরি করুন')} onClose={() => setTemplatesOpen(false)}>
        <p className="desk-copy-line">{t(locale, 'Start with a clear research objective and five bilingual questions. Review the wording, audience, and reward before inviting participants.', 'একটি পরিষ্কার গবেষণার উদ্দেশ্য ও পাঁচটি দ্বিভাষিক প্রশ্ন দিয়ে শুরু করুন। অংশগ্রহণকারীদের আমন্ত্রণের আগে প্রশ্ন, লক্ষ্যগোষ্ঠী ও পুরস্কার পর্যালোচনা করুন।')}</p>
        {commandError && <div className="desktop-error" role="alert"><strong>{t(locale, 'Draft not created', 'খসড়া তৈরি হয়নি')}</strong><p>{commandError}</p></div>}
        <div className="desk-section-gap">
          <Card className="desk-panel">
            <div className="desk-template-row"><div><strong>{t(locale, 'Start with a blank survey', 'খালি জরিপ দিয়ে শুরু')}</strong><p>{t(locale, 'Name your study and build each question yourself.', 'গবেষণার নাম দিন এবং নিজেই প্রশ্ন তৈরি করুন।')}</p></div><Button variant="secondary" onClick={() => { setTemplatesOpen(false); navigate('/researcher/surveys/new'); }}>{t(locale, 'Start blank', 'খালি শুরু')}</Button></div>
            {studyTemplates.map((template) => <div className="desk-template-row desk-template-row--curated" key={template.id}><div><strong>{template.name[locale]}</strong><p>{template.goal[locale]}</p><div className="desk-template-meta"><span>{topicNames[template.definition.topic ?? '']?.[locale] ?? template.definition.topic}</span><span>{t(locale, '5 questions', '৫টি প্রশ্ন')}</span><span>{t(locale, 'About 4 min', 'প্রায় ৪ মিনিট')}</span></div></div><Button loading={pending} onClick={() => void createFromTemplate(template)}>{t(locale, 'Use template', 'টেমপ্লেট ব্যবহার')}</Button></div>)}
          </Card>
        </div>
      </Modal>
    </WorkspaceShell>
  );
}

function ActivityIcon() { return <Coins size={17} aria-hidden="true" />; }




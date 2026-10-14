import type { Answers, DemoState, LedgerAccount, Survey, SurveyQuestion } from '../../../shared/contracts';
import type { Locale } from './common';
import { t } from './common';

export function accountBalance(state: DemoState, account: LedgerAccount) {
  return state.ledgerEntries.reduce((balance, entry) => {
    if (entry.toAccount === account) return balance + entry.amountPaisa;
    if (entry.fromAccount === account) return balance - entry.amountPaisa;
    return balance;
  }, 0);
}

export function feeForReward(rewardPaisa: number, feeBps: number) {
  return Math.ceil((Math.max(0, rewardPaisa) * Math.max(0, feeBps)) / 10000);
}

export function surveyBudget(survey: Pick<Survey, 'rewardPaisa' | 'feeBps' | 'quota'>) {
  return (survey.rewardPaisa + feeForReward(survey.rewardPaisa, survey.feeBps)) * survey.quota;
}

export function unresolvedFlags<T extends { resolvedAt?: string }>(flags: T[]): T[] {
  return flags.filter((flag) => !flag.resolvedAt);
}

export function answerLabel(question: SurveyQuestion, value: Answers[string] | undefined, locale: Locale) {
  if (value === undefined || value === null || value === '') return t(locale, 'No answer recorded', 'কোনো উত্তর রেকর্ড নেই');
  const values = Array.isArray(value) ? value : [value];
  if (question.type === 'singleChoice' || question.type === 'multipleChoice') {
    return values.map((raw) => {
      const option = question.options.find((item) => item.id === String(raw));
      return option ? option.label[locale] || option.label.en : String(raw);
    }).join(', ');
  }
  return values.map((item) => String(item)).join(', ');
}

export function responseStateLabel(state: DemoState, responseId: string, locale: Locale) {
  const payment = state.payments.find((item) => item.responseId === responseId);
  return payment?.status ?? state.responses.find((item) => item.id === responseId)?.status ?? t(locale, 'Unknown', 'অজানা');
}

export function questionTypeLabel(question: SurveyQuestion, locale: Locale) {
  const labels: Record<SurveyQuestion['type'], [string, string]> = {
    singleChoice: ['Single choice', 'একটি উত্তর'], multipleChoice: ['Multiple choice', 'একাধিক উত্তর'],
    likert: ['Scale', 'স্কেল'], text: ['Short answer', 'সংক্ষিপ্ত উত্তর'], number: ['Number', 'সংখ্যা'],
  };
  return labels[question.type][locale === 'bn' ? 1 : 0];
}

export function availableResearcherPaisa(state: DemoState, userId: string) {
  return accountBalance(state, `researcher:${userId}:available`);
}

export function stateForSurvey(state: DemoState, surveyId: string) {
  return {
    survey: state.surveys.find((item) => item.id === surveyId),
    responses: state.responses.filter((item) => item.surveyId === surveyId),
    payments: state.payments.filter((item) => item.surveyId === surveyId),
    ledger: state.ledgerEntries.filter((item) => item.surveyId === surveyId),
    activity: state.activityEvents.filter((item) => item.surveyId === surveyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

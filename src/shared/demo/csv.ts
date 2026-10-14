import type { DemoState } from '../../../shared/contracts';
import { DomainError } from './errors.js';

const columns = [
  'response_id', 'survey_id', 'respondent_id', 'created_at', 'submitted_at', 'response_status', 'verification_status', 'timing_seconds',
  'answers_json', 'checks_json', 'flags_json', 'reviewer_id', 'review_decision', 'review_note', 'reviewed_at', 'payment_status',
  'reward_paisa', 'fee_paisa', 'payment_attempts', 'transaction_ref', 'paid_at', 'sample_history',
];
function escapeCell(input: unknown): string {
  let value = input === undefined || input === null ? '' : typeof input === 'string' ? input : JSON.stringify(input);
  if (/^[\s\u0000-\u001f]*[=+@\-]/.test(value)) value = `'${value}`;
  return `"${value.replaceAll('"', '""')}"`;
}
export function surveyCsv(state: DemoState, surveyId: string, actorId: string): { filename: string; content: string } {
  const survey = state.surveys.find((item) => item.id === surveyId);
  if (!survey) throw new DomainError('SURVEY_NOT_FOUND', 'Survey not found.', 404);
  const user = state.users.find((item) => item.id === actorId);
  if (!user) throw new DomainError('UNKNOWN_PERSONA', 'Choose a valid demo persona.', 401);
  if (user.role !== 'admin' && survey.researcherId !== user.id) throw new DomainError('NOT_SURVEY_OWNER', 'Only the survey owner or an admin can export this survey.', 403);
  const records = state.responses.filter((response) => response.surveyId === surveyId);
  const rows = records.map((response) => {
    const payment = state.payments.find((item) => item.responseId === response.id);
    return [response.id, response.surveyId, response.respondentId, response.createdAt, response.submittedAt, response.status, response.verificationStatus,
      response.timingSeconds, response.answers, response.checks, response.flags, response.reviewDecision?.reviewerId, response.reviewDecision?.decision,
      response.reviewDecision?.note, response.reviewDecision?.at, payment?.status, payment?.rewardPaisa, payment?.feePaisa, payment?.attempts,
      payment?.transactionRef, payment?.completedAt, response.sampleHistory ? 'true' : 'false'];
  });
  const content = `\uFEFF${[columns, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')}\r\n`;
  return { filename: `${survey.id.replace(/[^a-zA-Z0-9_-]/g, '_')}-responses.csv`, content };
}

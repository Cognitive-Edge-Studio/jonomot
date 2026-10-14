const randomUUID = () => globalThis.crypto.randomUUID();
import type { DemoState, Payment, ResponseRecord, VerificationRun } from '../../../shared/contracts';
import { accountBalance, buildChecks } from './domain.js';


const VERIFICATION_DELAY_MS = 700;
const PAYMENT_DELAY_MS = 700;
const timestamp = (date: Date) => date.toISOString();
const makeId = (prefix: string) => `${prefix}-${randomUUID()}`;
function addActivity(state: DemoState, actorId: string, action: string, detail: string, response: ResponseRecord, payment?: Payment): void {
  state.activityEvents.push({ id: makeId('event'), actorId, action, detail, surveyId: response.surveyId, responseId: response.id, paymentId: payment?.id, createdAt: timestamp(new Date()) });
}
function addNotification(state: DemoState, recipientId: string, title: { en: string; bn: string }, body: { en: string; bn: string }, response: ResponseRecord, payment?: Payment): void {
  state.notifications.push({ id: makeId('notification'), recipientId, title, body, createdAt: timestamp(new Date()), linkedResponseId: response.id, linkedPaymentId: payment?.id });
}
function processVerification(state: DemoState, run: VerificationRun, completedAt: string): void {
  const response = state.responses.find((item) => item.id === run.responseId);
  if (!response || response.verificationStatus === 'Passed' || response.verificationStatus === 'Flagged') return;
  const checks = buildChecks(run.scenario);
  run.status = 'Completed'; run.completedAt = completedAt; run.checks = structuredClone(checks.checks); run.flags = structuredClone(checks.flags);
  response.checks = structuredClone(checks.checks); response.updatedAt = completedAt; response.status = 'UnderReview';
  if (run.scenario === 'reviewFlag') response.flags.push(...structuredClone(checks.flags));
  if (run.scenario === 'voiceFlag') {
    const respondent = state.users.find((user) => user.id === response.respondentId);
    if (respondent) respondent.accountFlags = [...(respondent.accountFlags ?? []), ...structuredClone(checks.flags)];
  }
  response.verificationStatus = run.scenario === 'clean' ? 'Passed' : 'Flagged';
  const survey = state.surveys.find((item) => item.id === response.surveyId);
  const ownerId = survey?.researcherId;
  addActivity(state, response.respondentId, 'verification_completed', run.scenario === 'clean' ? 'Simulated integrity checks passed.' : 'Simulated integrity checks need review.', response);
  addNotification(state, response.respondentId, { en: 'Verification complete', bn: 'যাচাই সম্পন্ন' }, { en: run.scenario === 'clean' ? 'Your response is ready for researcher review.' : 'Your response has a check that needs review.', bn: run.scenario === 'clean' ? 'আপনার উত্তর গবেষকের পর্যালোচনার জন্য প্রস্তুত।' : 'আপনার উত্তরে একটি যাচাই বিষয় পর্যালোচনা দরকার।' }, response);
  if (ownerId) addNotification(state, ownerId, { en: 'Response verification complete', bn: 'উত্তর যাচাই সম্পন্ন' }, { en: 'A response is ready for review.', bn: 'একটি উত্তর পর্যালোচনার জন্য প্রস্তুত।' }, response);
}
function processPayment(state: DemoState, payment: Payment, completedAt: string): void {
  if (payment.status !== 'Processing') return;
  const response = state.responses.find((item) => item.id === payment.responseId);
  const survey = state.surveys.find((item) => item.id === payment.surveyId);
  if (!response || !survey) { payment.status = 'Failed'; payment.lastError = 'Linked response or survey was not found.'; return; }
  if (payment.scenario === 'retry' && payment.attempts === 1) {
    payment.status = 'Failed'; payment.lastError = 'Simulated payout failure; explicit retry is available.';
    addActivity(state, survey.researcherId, 'payment_failed', payment.lastError, response, payment);
    addNotification(state, payment.respondentId, { en: 'Payment needs a retry', bn: 'পেমেন্ট আবার শুরু করতে হবে' }, { en: 'The demo payout failed once. The researcher can retry it.', bn: 'ডেমো পেমেন্ট একবার ব্যর্থ হয়েছে। গবেষক আবার চেষ্টা করতে পারেন।' }, response, payment);
    addNotification(state, survey.researcherId, { en: 'Payment failed', bn: 'পেমেন্ট ব্যর্থ' }, { en: 'Use Retry payment to run the same payout again.', bn: 'একই পেমেন্ট আবার চালাতে Retry payment ব্যবহার করুন।' }, response, payment);
    return;
  }
  const payout = payment.rewardPaisa + payment.feePaisa;
  if (accountBalance(state, `survey:${survey.id}:escrow`) < payout) {
    payment.status = 'Failed'; payment.lastError = 'Escrow balance is too low for this payout.';
    addActivity(state, survey.researcherId, 'payment_failed', payment.lastError, response, payment);
    return;
  }
  const paymentId = payment.id;
  state.ledgerEntries.push(
    { id: makeId('transfer'), fromAccount: `survey:${survey.id}:escrow`, toAccount: `respondent:${payment.respondentId}:wallet`, amountPaisa: payment.rewardPaisa, surveyId: survey.id, paymentId, createdAt: completedAt, memo: 'Approved respondent reward' },
  );
  if (payment.feePaisa > 0) state.ledgerEntries.push({ id: makeId('transfer'), fromAccount: `survey:${survey.id}:escrow`, toAccount: 'platform:fees', amountPaisa: payment.feePaisa, surveyId: survey.id, paymentId, createdAt: completedAt, memo: 'Platform fee' });
  payment.status = 'Paid'; payment.completedAt = completedAt; payment.transactionRef = `DEMO-${payment.id.slice(-12).toUpperCase()}`; delete payment.lastError;
  addActivity(state, survey.researcherId, 'payment_paid', `Paid ${payment.rewardPaisa} paisa to respondent and ${payment.feePaisa} paisa fee.`, response, payment);
  addNotification(state, payment.respondentId, { en: 'Payment received', bn: 'পেমেন্ট পেয়েছেন' }, { en: 'Your mock wallet was credited. This is demo-only money.', bn: 'আপনার ডেমো ওয়ালেটে টাকা যোগ হয়েছে। এটি বাস্তব টাকা নয়।' }, response, payment);
  addNotification(state, survey.researcherId, { en: 'Response paid', bn: 'উত্তরের পেমেন্ট সম্পন্ন' }, { en: 'The reward and platform fee were transferred from survey escrow.', bn: 'জরিপের এসক্রো থেকে পুরস্কার ও প্ল্যাটফর্ম ফি পাঠানো হয়েছে।' }, response, payment);
}

export function advanceDemo(state: DemoState, at = Date.now()): boolean {
  let changed = false;
  for (const run of state.verificationRuns) {
    if (run.status === 'Pending' && Date.parse(run.startedAt) + VERIFICATION_DELAY_MS <= at) {
      processVerification(state, run, timestamp(new Date(at)));
      changed = true;
    }
  }
  for (const payment of state.payments) {
    if (payment.status === 'Processing' && Date.parse(payment.scheduledAt) + PAYMENT_DELAY_MS <= at) {
      processPayment(state, payment, timestamp(new Date(at)));
      changed = true;
    }
  }
  return changed;
}

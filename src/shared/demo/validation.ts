import type { DemoState } from '../../../shared/contracts';

export function validateState(state: DemoState): void {
  if (state.schemaVersion !== 1 || !Number.isInteger(state.revision) || !Number.isInteger(state.resetGeneration)) throw new Error('Invalid state header.');
  const collections = [state.users, state.surveys, state.responses, state.verificationRuns, state.payments, state.ledgerEntries, state.notifications, state.activityEvents];
  if (collections.some((items) => !Array.isArray(items))) throw new Error('Invalid state collection.');
  if (!state.demoSettings || !Array.isArray(state.demoSettings.templates) || !['clean', 'reviewFlag', 'voiceFlag'].includes(state.demoSettings.responseScenario) || !['success', 'retry'].includes(state.demoSettings.paymentScenario)) throw new Error('Invalid demo settings.');
  for (const survey of state.surveys) {
    if (!Number.isSafeInteger(survey.rewardPaisa) || survey.rewardPaisa < 0 || !Number.isSafeInteger(survey.quota) || survey.quota < 0 || !Number.isSafeInteger(survey.feeBps) || survey.feeBps < 0) throw new Error(`Invalid monetary or quota fields on survey ${survey.id}.`);
  }
  for (const entry of state.ledgerEntries) if (!Number.isSafeInteger(entry.amountPaisa) || entry.amountPaisa <= 0) throw new Error(`Invalid ledger amount on ${entry.id}.`);
  for (const payment of state.payments) if (![payment.rewardPaisa, payment.feePaisa, payment.attempts].every(Number.isSafeInteger) || payment.rewardPaisa < 0 || payment.feePaisa < 0 || payment.attempts < 0) throw new Error(`Invalid payment ${payment.id}.`);
  // IDs may share readable prefixes but must be unique within their own collection.
  const perCollection = collections.map((items) => items.map((item) => (item as { id: string }).id));
  if (perCollection.some((values) => new Set(values).size !== values.length)) throw new Error('Duplicate record ID in a state collection.');

  const users = new Map(state.users.map((user) => [user.id, user]));
  const surveys = new Map(state.surveys.map((survey) => [survey.id, survey]));
  const responses = new Map(state.responses.map((response) => [response.id, response]));
  const paymentsByResponse = new Map<string, typeof state.payments>();
  for (const payment of state.payments) {
    const linked = paymentsByResponse.get(payment.responseId) ?? [];
    linked.push(payment); paymentsByResponse.set(payment.responseId, linked);
    const response = responses.get(payment.responseId); const survey = surveys.get(payment.surveyId);
    if (!response || !survey || response.surveyId !== survey.id || response.respondentId !== payment.respondentId) throw new Error(`Payment ${payment.id} has inconsistent links.`);
    if (payment.rewardPaisa !== survey.rewardPaisa || payment.feePaisa !== Math.ceil(survey.rewardPaisa * survey.feeBps / 10000)) throw new Error(`Payment ${payment.id} does not match survey pricing.`);
  }
  if (new Set(state.payments.map((payment) => payment.idempotencyKey)).size !== state.payments.length) throw new Error('Duplicate payment idempotency key.');
  for (const response of state.responses) {
    const survey = surveys.get(response.surveyId); const respondent = users.get(response.respondentId);
    if (!survey || (!response.sampleHistory && respondent?.role !== 'respondent')) throw new Error(`Response ${response.id} has inconsistent ownership links.`);
    const expectedQuota = ['Submitted', 'UnderReview', 'Approved'].includes(response.status);
    if (response.quotaConsumed !== expectedQuota) throw new Error(`Response ${response.id} has inconsistent quota state.`);
    const linkedPayments = paymentsByResponse.get(response.id) ?? [];
    if (linkedPayments.length > 1 || (response.status === 'Approved' && linkedPayments.length !== 1) || (response.status !== 'Approved' && linkedPayments.length > 0)) throw new Error(`Response ${response.id} has inconsistent payment count.`);
  }
  const responseKeys = state.responses.map((response) => `${response.surveyId}\u0000${response.respondentId}`);
  if (new Set(responseKeys).size !== responseKeys.length) throw new Error('A respondent can have only one response per survey.');
  for (const survey of state.surveys) {
    if (users.get(survey.researcherId)?.role !== 'researcher') throw new Error(`Survey ${survey.id} has no researcher owner.`);
    if (['Published', 'Active'].includes(survey.status) && (!survey.fundedAt || survey.ethicsReview?.decision !== 'approved')) throw new Error(`Survey ${survey.id} is published without funding and approval.`);
    const fundingEntries = state.ledgerEntries.filter((entry) => entry.surveyId === survey.id && entry.toAccount === `survey:${survey.id}:escrow` && (entry.fromAccount === `researcher:${survey.researcherId}:available` || entry.fromAccount === 'seed:treasury'));
    if (survey.fundedAt ? fundingEntries.length !== 1 || survey.fundingLedgerEntryId !== fundingEntries[0]?.id : fundingEntries.length !== 0) throw new Error(`Survey ${survey.id} has inconsistent funding history.`);
    if (survey.fundedAt && fundingEntries[0]?.amountPaisa !== (survey.rewardPaisa + Math.ceil(survey.rewardPaisa * survey.feeBps / 10000)) * survey.quota) throw new Error(`Survey ${survey.id} funding does not match its escrow budget.`);
    if (survey.fundedAt && fundingEntries[0]?.fromAccount === 'seed:treasury' && !/^(Seeded|Historical)/.test(fundingEntries[0]?.memo ?? '')) throw new Error(`Survey ${survey.id} has an untraceable treasury funding source.`);
  }
  const runCounts = new Map<string, number>();
  for (const run of state.verificationRuns) {
    if (!responses.has(run.responseId)) throw new Error(`Verification ${run.id} has no response.`);
    runCounts.set(run.responseId, (runCounts.get(run.responseId) ?? 0) + 1);
    const response = responses.get(run.responseId)!;
    if ((run.status === 'Pending') !== (response.verificationStatus === 'Pending')) throw new Error(`Verification ${run.id} has inconsistent status.`);
    if (run.status === 'Completed' && !['Passed', 'Flagged'].includes(response.verificationStatus)) throw new Error(`Completed verification ${run.id} has no final response status.`);
  }
  if ([...runCounts.values()].some((count) => count > 1)) throw new Error('A response can have only one verification run.');
  const paymentTransfers = new Map<string, typeof state.ledgerEntries>();
  const balances = new Map<string, number>();
  for (const entry of state.ledgerEntries) {
    balances.set(entry.fromAccount, (balances.get(entry.fromAccount) ?? 0) - entry.amountPaisa);
    balances.set(entry.toAccount, (balances.get(entry.toAccount) ?? 0) + entry.amountPaisa);
    if (entry.paymentId) { const linked = paymentTransfers.get(entry.paymentId) ?? []; linked.push(entry); paymentTransfers.set(entry.paymentId, linked); }
  }
  for (const [account, balance] of balances) if (!Number.isSafeInteger(balance) || (account !== 'seed:treasury' && balance < 0)) throw new Error(`Invalid derived balance for ${account}.`);
  for (const payment of state.payments) {
    const transfers = paymentTransfers.get(payment.id) ?? [];
    if (payment.status !== 'Paid' && transfers.length !== 0) throw new Error(`Unpaid payment ${payment.id} has ledger transfers.`);
    if (payment.status === 'Paid') {
      const reward = transfers.filter((entry) => entry.toAccount === `respondent:${payment.respondentId}:wallet` && entry.amountPaisa === payment.rewardPaisa);
      const fee = transfers.filter((entry) => entry.toAccount === 'platform:fees' && entry.amountPaisa === payment.feePaisa);
      const expected = payment.feePaisa > 0 ? 2 : 1;
      if (transfers.length !== expected || reward.length !== 1 || (payment.feePaisa > 0 && fee.length !== 1) || transfers.some((entry) => entry.fromAccount !== `survey:${payment.surveyId}:escrow`)) throw new Error(`Paid payment ${payment.id} has inconsistent ledger transfers.`);
    }
  }
  for (const notification of state.notifications) if (!users.has(notification.recipientId)) throw new Error(`Notification ${notification.id} has no recipient.`);
}

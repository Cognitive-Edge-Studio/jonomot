const randomUUID = () => globalThis.crypto.randomUUID();
import type { ActivityEvent, DemoCommand, DemoNotification, DemoState, DemoUser, IntegrityCheck, IntegrityFlag, LedgerEntry, ResponseRecord, Survey, SurveyDefinition, SurveyQuestion, VerificationRun } from '../../../shared/contracts';
import { DomainError } from './errors.js';

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${randomUUID()}`;
const text = (en: string, bn: string) => ({ en, bn });

export function accountBalance(state: DemoState, account: string): number {
  return state.ledgerEntries.reduce((balance, entry) => balance + (entry.toAccount === account ? entry.amountPaisa : 0) - (entry.fromAccount === account ? entry.amountPaisa : 0), 0);
}
export function surveyFundingCost(survey: Pick<SurveyDefinition, 'rewardPaisa' | 'quota'> & { feeBps?: number }, defaultFeeBps = 100): number {
  const fee = survey.feeBps ?? defaultFeeBps;
  return (survey.rewardPaisa + Math.ceil(survey.rewardPaisa * fee / 10000)) * survey.quota;
}
function requireUser(state: DemoState, actorId: string, role?: DemoUser['role']): DemoUser {
  const user = state.users.find((candidate) => candidate.id === actorId);
  if (!user) throw new DomainError('UNKNOWN_PERSONA', 'Choose a valid demo persona.', 401);
  if (role && user.role !== role) throw new DomainError('ROLE_FORBIDDEN', `This action requires the ${role} role.`, 403);
  return user;
}
function requireSurveyOwner(state: DemoState, actorId: string, surveyId: string): Survey {
  const survey = state.surveys.find((candidate) => candidate.id === surveyId);
  if (!survey) throw new DomainError('SURVEY_NOT_FOUND', 'Survey not found.', 404);
  if (survey.researcherId !== actorId) throw new DomainError('NOT_SURVEY_OWNER', 'Only the survey owner can perform this action.', 403);
  return survey;
}
function activity(state: DemoState, actorId: string, action: string, detail: string, related: Pick<ActivityEvent, 'surveyId' | 'responseId' | 'paymentId'> = {}): void {
  state.activityEvents.push({ id: id('event'), actorId, action, detail, createdAt: now(), ...related });
}
function notification(state: DemoState, recipientId: string, titleEn: string, titleBn: string, bodyEn: string, bodyBn: string, related: Pick<DemoNotification, 'linkedResponseId' | 'linkedPaymentId'> = {}): void {
  state.notifications.push({ id: id('notification'), recipientId, title: text(titleEn, titleBn), body: text(bodyEn, bodyBn), createdAt: now(), ...related });
}
function ledger(state: DemoState, fromAccount: LedgerEntry['fromAccount'], toAccount: LedgerEntry['toAccount'], amountPaisa: number, memo: string, related: Pick<LedgerEntry, 'surveyId' | 'paymentId'> = {}): string {
  const entryId = id('transfer');
  state.ledgerEntries.push({ id: entryId, fromAccount, toAccount, amountPaisa, memo, createdAt: now(), ...related });
  return entryId;
}
function fail(code: string, message: string, status = 400): never { throw new DomainError(code, message, status); }
function localized(value: unknown, label: string): void {
  if (!value || typeof value !== 'object' || !('en' in value) || !('bn' in value) || typeof value.en !== 'string' || typeof value.bn !== 'string' || !value.en.trim() || !value.bn.trim()) fail('INVALID_SURVEY', `${label} must include English and Bangla text.`);
}
function validateDefinition(definition: SurveyDefinition): void {
  if (!definition || typeof definition !== 'object') fail('INVALID_SURVEY', 'Survey definition is required.');
  localized(definition.title, 'Title'); localized(definition.description, 'Description');
  if (definition.manualReview === false) fail('INVALID_SURVEY', 'Demo surveys require manual researcher review.');
  if (!Array.isArray(definition.questions) || definition.questions.length < 1) fail('INVALID_SURVEY', 'Add at least one question.');
  if (!Number.isSafeInteger(definition.rewardPaisa) || definition.rewardPaisa <= 0) fail('INVALID_SURVEY', 'Reward must be a positive integer paisa amount.');
  if (!Number.isSafeInteger(definition.quota) || definition.quota < 1 || definition.quota > 100000) fail('INVALID_SURVEY', 'Quota must be a positive whole number.');
  const fee = definition.feeBps ?? 100;
  if (!Number.isSafeInteger(fee) || fee < 0 || fee > 10000) fail('INVALID_SURVEY', 'Fee must be between 0 and 10000 basis points.');
  const questionIds = new Set<string>();
  for (const question of definition.questions) {
    if (!question || typeof question !== 'object' || !['singleChoice', 'multipleChoice', 'likert', 'text', 'number'].includes(question.type)) fail('INVALID_SURVEY', 'Question type is not supported.');
    if (typeof question.id !== 'string' || !question.id || questionIds.has(question.id) || typeof question.required !== 'boolean') fail('INVALID_SURVEY', 'Question IDs must be present and unique and required must be boolean.');
    questionIds.add(question.id); localized(question.prompt, `Question ${question.id}`);
    if (question.type === 'singleChoice' || question.type === 'multipleChoice') {
      if (!Array.isArray(question.options) || question.options.length < 2 || question.options.some((option) => !option || typeof option.id !== 'string' || !option.id) || new Set(question.options.map((option) => option.id)).size !== question.options.length) fail('INVALID_SURVEY', 'Choice questions need at least two distinct bilingual options.');
      for (const option of question.options) localized(option.label, 'Choice');
      if (question.type === 'multipleChoice' && ((question.minSelections !== undefined && (!Number.isSafeInteger(question.minSelections) || question.minSelections < 0)) || (question.maxSelections !== undefined && (!Number.isSafeInteger(question.maxSelections) || question.maxSelections < (question.minSelections ?? 0))))) fail('INVALID_SURVEY', 'Multiple choice selection limits are invalid.');
    } else if (question.type === 'likert' && (!Number.isSafeInteger(question.min) || !Number.isSafeInteger(question.max) || question.max <= question.min)) fail('INVALID_SURVEY', 'Likert scale bounds are invalid.');
    else if (question.type === 'number' && ((question.min !== undefined && !Number.isFinite(question.min)) || (question.max !== undefined && !Number.isFinite(question.max)) || (question.min !== undefined && question.max !== undefined && question.max < question.min) || (question.step !== undefined && (!Number.isFinite(question.step) || question.step <= 0)))) fail('INVALID_SURVEY', 'Numeric bounds are invalid.');
    else if (question.type === 'text' && ((question.minLength !== undefined && (!Number.isSafeInteger(question.minLength) || question.minLength < 0)) || (question.maxLength !== undefined && (!Number.isSafeInteger(question.maxLength) || question.maxLength < (question.minLength ?? 0))))) fail('INVALID_SURVEY', 'Text length limits are invalid.');
  }
  if (definition.manualReview !== undefined && typeof definition.manualReview !== 'boolean') fail('INVALID_SURVEY', 'manualReview must be boolean.');
  if (definition.eligibility !== undefined && (!definition.eligibility || typeof definition.eligibility !== 'object' || ['districts', 'ageBands', 'genders'].some((key) => { const value = definition.eligibility?.[key as keyof typeof definition.eligibility]; return value !== undefined && (!Array.isArray(value) || value.some((item) => typeof item !== 'string')); }))) fail('INVALID_SURVEY', 'Eligibility rules must be lists of text values.');
}
function defaultDefinitionFromTemplate(state: DemoState, templateId: string): SurveyDefinition {
  const template = state.demoSettings.templates.find((item) => item.id === templateId);
  if (!template) fail('TEMPLATE_NOT_FOUND', 'Survey template not found.', 404);
  return { title: structuredClone(template.title), description: structuredClone(template.description), questions: structuredClone(template.questions), rewardPaisa: 10000, feeBps: state.demoSettings.feeBps, quota: 20, eligibility: {}, manualReview: true, estimatedMinutes: template.estimatedMinutes, topic: template.topic };
}
function questionErrors(question: SurveyQuestion, value: unknown): string | null {
  if (value === undefined || value === null || value === '') return question.required ? 'A required answer is missing.' : null;
  if (question.type === 'singleChoice') return typeof value === 'string' && question.options.some((option) => option.id === value) ? null : 'Choose one available option.';
  if (question.type === 'multipleChoice') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !question.options.some((option) => option.id === item))) return 'Choose valid options.';
    if (question.minSelections !== undefined && value.length < question.minSelections) return `Choose at least ${question.minSelections} options.`;
    if (question.maxSelections !== undefined && value.length > question.maxSelections) return `Choose no more than ${question.maxSelections} options.`;
    return null;
  }
  if (question.type === 'likert') return typeof value === 'number' && Number.isInteger(value) && value >= question.min && value <= question.max ? null : `Choose a whole number from ${question.min} to ${question.max}.`;
  if (question.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || (question.min !== undefined && value < question.min) || (question.max !== undefined && value > question.max)) return 'Enter a number within the allowed range.';
    if (question.step !== undefined && question.step > 0 && question.min !== undefined && Math.abs((value - question.min) / question.step - Math.round((value - question.min) / question.step)) > 1e-8) return `Use steps of ${question.step}.`;
    return null;
  }
  if (typeof value !== 'string' || (question.minLength !== undefined && value.trim().length < question.minLength) || (question.maxLength !== undefined && value.length > question.maxLength)) return 'Text answer is outside the allowed length.';
  return null;
}
function validateAnswers(survey: Survey, answers: ResponseRecord['answers'], includeRequired: boolean): void {
  const allowedIds = new Set(survey.questions.map((question) => question.id));
  if (Object.keys(answers).some((questionId) => !allowedIds.has(questionId))) fail('INVALID_ANSWER', 'Answers contain an unknown question.');
  for (const question of survey.questions) {
    if (!includeRequired && answers[question.id] === undefined) continue;
    const error = questionErrors(question, answers[question.id]);
    if (error) fail('INVALID_ANSWER', `${question.prompt.en}: ${error}`);
  }
}
function quotaUsed(state: DemoState, surveyId: string): number { return state.responses.filter((response) => response.surveyId === surveyId && response.quotaConsumed).length; }
function responseById(state: DemoState, responseId: string): ResponseRecord {
  const response = state.responses.find((candidate) => candidate.id === responseId);
  if (!response) throw new DomainError('RESPONSE_NOT_FOUND', 'Response not found.', 404);
  return response;
}
function relatedSurvey(state: DemoState, response: ResponseRecord): Survey {
  const survey = state.surveys.find((candidate) => candidate.id === response.surveyId);
  if (!survey) throw new DomainError('SURVEY_NOT_FOUND', 'Response survey no longer exists.', 404);
  return survey;
}
function unresolved(flags: IntegrityFlag[]): IntegrityFlag[] { return flags.filter((flag) => !flag.resolvedAt); }
function submitQuestionnaire(state: DemoState, actorId: string, surveyId: string): void {
  const survey = requireSurveyOwner(state, actorId, surveyId);
  if (!survey.fundedAt || survey.status !== 'Draft') fail('SURVEY_NOT_READY', 'Only a funded draft can be sent for ethics review.', 409);
  validateDefinition({ ...survey, feeBps: survey.feeBps });
  survey.status = 'UnderReview'; survey.updatedAt = now();
  activity(state, actorId, 'survey_submitted_for_review', 'Survey submitted for admin ethics review.', { surveyId });
  state.users.filter((user) => user.role === 'admin').forEach((admin) => notification(state, admin.id, 'Survey review requested', 'জরিপ পর্যালোচনা দরকার', `${survey.title.en} is ready for ethics review.`, `${survey.title.bn} নৈতিক পর্যালোচনার জন্য প্রস্তুত।`));
}

export function applyCommand(state: DemoState, actorId: string, command: DemoCommand): { surveyId?: string; responseId?: string; paymentId?: string } {
  const actor = requireUser(state, actorId);
  switch (command.type) {
    case 'CREATE_SURVEY': {
      if (actor.role !== 'researcher') fail('ROLE_FORBIDDEN', 'Only a researcher can create a survey.', 403);
      if (Boolean(command.payload.templateId) === Boolean(command.payload.definition)) fail('INVALID_COMMAND', 'Provide exactly one templateId or definition.');
      const definition = command.payload.definition ?? defaultDefinitionFromTemplate(state, command.payload.templateId!);
      validateDefinition(definition);
      const surveyId = id('survey'); const at = now();
      state.surveys.push({ ...structuredClone(definition), feeBps: definition.feeBps ?? state.demoSettings.feeBps, eligibility: structuredClone(definition.eligibility ?? {}), manualReview: definition.manualReview ?? true, id: surveyId, researcherId: actor.id, status: 'Draft', createdAt: at, updatedAt: at });
      activity(state, actor.id, 'survey_created', 'Created a draft survey.', { surveyId });
      return { surveyId };
    }
    case 'UPDATE_SURVEY': {
      const survey = requireSurveyOwner(state, actor.id, command.payload.surveyId);
      if (survey.status !== 'Draft') fail('SURVEY_NOT_EDITABLE', 'Only a draft survey can be edited.', 409);
      const patch = command.payload;
      if (survey.fundedAt && ((patch.rewardPaisa !== undefined && patch.rewardPaisa !== survey.rewardPaisa) || (patch.feeBps !== undefined && patch.feeBps !== survey.feeBps) || (patch.quota !== undefined && patch.quota !== survey.quota))) fail('FUNDED_BUDGET_LOCKED', 'Reward, fee, and quota cannot change after escrow is funded.', 409);
      const next: SurveyDefinition = { title: patch.title ?? survey.title, description: patch.description ?? survey.description, questions: patch.questions ?? survey.questions, rewardPaisa: patch.rewardPaisa ?? survey.rewardPaisa, feeBps: patch.feeBps ?? survey.feeBps, quota: patch.quota ?? survey.quota, eligibility: patch.eligibility ?? survey.eligibility, manualReview: patch.manualReview ?? survey.manualReview, estimatedMinutes: survey.estimatedMinutes, topic: survey.topic };
      validateDefinition(next);
      Object.assign(survey, structuredClone(next), { updatedAt: now() });
      if (survey.ethicsReview?.decision === 'approved') delete survey.ethicsReview;
      activity(state, actor.id, 'survey_updated', 'Saved draft survey changes.', { surveyId: survey.id });
      return { surveyId: survey.id };
    }
    case 'FUND_SURVEY': {
      const survey = requireSurveyOwner(state, actor.id, command.payload.surveyId);
      if (survey.fundedAt) fail('ALREADY_FUNDED', 'This survey has already been funded.', 409);
      if (survey.status !== 'Draft') fail('SURVEY_NOT_FUNDABLE', 'Only a draft survey can be funded.', 409);
      validateDefinition({ ...survey, feeBps: survey.feeBps });
      const amount = surveyFundingCost(survey, state.demoSettings.feeBps);
      const available = accountBalance(state, `researcher:${actor.id}:available`);
      if (available < amount) fail('INSUFFICIENT_FUNDS', 'Available balance is too low to cover reward and platform fee.', 409);
      const entryId = ledger(state, `researcher:${actor.id}:available`, `survey:${survey.id}:escrow`, amount, 'Survey reward and platform fee escrow', { surveyId: survey.id });
      survey.fundedAt = now(); survey.fundingLedgerEntryId = entryId; survey.updatedAt = now();
      activity(state, actor.id, 'survey_funded', `Transferred ${amount} paisa into escrow.`, { surveyId: survey.id });
      return { surveyId: survey.id };
    }
    case 'SUBMIT_SURVEY_REVIEW': submitQuestionnaire(state, actor.id, command.payload.surveyId); return { surveyId: command.payload.surveyId };
    case 'REVIEW_SURVEY': {
      requireUser(state, actor.id, 'admin');
      const survey = state.surveys.find((candidate) => candidate.id === command.payload.surveyId);
      if (!survey) fail('SURVEY_NOT_FOUND', 'Survey not found.', 404);
      if (survey.status !== 'UnderReview') fail('SURVEY_NOT_IN_REVIEW', 'Only a questionnaire under review can receive a decision.', 409);
      if (command.payload.decision === 'reject' && !command.payload.note.trim()) fail('REVIEW_NOTE_REQUIRED', 'Add a revision reason before rejecting the questionnaire.');
      survey.status = command.payload.decision === 'approve' ? 'Published' : 'Draft';
      survey.ethicsReview = { reviewerId: actor.id, decision: command.payload.decision === 'approve' ? 'approved' : 'rejected', note: command.payload.note.trim(), at: now() };
      survey.updatedAt = now();
      activity(state, actor.id, command.payload.decision === 'approve' ? 'survey_approved' : 'survey_rejected', command.payload.note.trim() || 'Questionnaire approved.', { surveyId: survey.id });
      notification(state, survey.researcherId, command.payload.decision === 'approve' ? 'Survey approved' : 'Survey needs a revision', command.payload.decision === 'approve' ? 'জরিপ অনুমোদিত' : 'জরিপ সংশোধন দরকার', command.payload.decision === 'approve' ? 'Your survey passed ethics review.' : command.payload.note, command.payload.decision === 'approve' ? 'আপনার জরিপ নৈতিক পর্যালোচনায় অনুমোদিত হয়েছে।' : command.payload.note);
      return { surveyId: survey.id };
    }
    case 'ACTIVATE_SURVEY': {
      const survey = requireSurveyOwner(state, actor.id, command.payload.surveyId);
      if (survey.status !== 'Published' || !survey.fundedAt || survey.ethicsReview?.decision !== 'approved') fail('SURVEY_NOT_APPROVED', 'A funded survey needs admin approval before activation.', 409);
      survey.status = 'Active'; survey.updatedAt = now();
      activity(state, actor.id, 'survey_activated', 'Survey is now discoverable by eligible respondents.', { surveyId: survey.id });
      return { surveyId: survey.id };
    }
    case 'VERIFY_OTP': {
      requireUser(state, actor.id, 'respondent');
      if (!/^\+?\d{8,15}$/.test(command.payload.phone)) fail('INVALID_PHONE', 'Enter a valid phone number.');
      if (command.payload.code !== '123456') fail('OTP_INVALID', 'The demo OTP is 123456.', 401);
      actor.phone = command.payload.phone; actor.phoneVerified = true;
      activity(state, actor.id, 'phone_verified', 'Completed the local demo OTP step.');
      return {};
    }
    case 'COMPLETE_ONBOARDING': {
      requireUser(state, actor.id, 'respondent');
      const payload = command.payload;
      if (!actor.phoneVerified) fail('PHONE_NOT_VERIFIED', 'Verify the phone with the mock OTP first.', 409);
      if (!payload.consentAccepted) fail('CONSENT_REQUIRED', 'Consent is required to continue.');
      if (!/^\d{4}$/.test(payload.nidLast4)) fail('IDENTITY_INPUT_INVALID', 'Use a fictional four-digit NID ending for this simulation.');
      if (!['bKash', 'Nagad', 'Rocket'].includes(payload.walletType)) fail('WALLET_NOT_SUPPORTED', 'Choose bKash, Nagad, or Rocket for the demo wallet.');
      if (!payload.demographics.ageBand || !payload.demographics.gender || !payload.demographics.district) fail('DEMOGRAPHICS_REQUIRED', 'Complete all demographic fields.');
      actor.consentAccepted = true; actor.demographics = structuredClone(payload.demographics); actor.walletType = payload.walletType; actor.verified = true; actor.identityStatus = 'Verified'; actor.onboardingComplete = true;
      activity(state, actor.id, 'onboarding_completed', `Completed simulated identity checks and selected ${payload.walletType}.`);
      return {};
    }
    case 'START_RESPONSE': {
      const respondent = requireUser(state, actor.id, 'respondent');
      const existing = state.responses.find((response) => response.surveyId === command.payload.surveyId && response.respondentId === actor.id);
      if (existing) return { surveyId: existing.surveyId, responseId: existing.id };
      const survey = state.surveys.find((candidate) => candidate.id === command.payload.surveyId);
      if (!survey || survey.status !== 'Active') fail('SURVEY_UNAVAILABLE', 'This survey is not open for responses.', 404);
      if (!respondent.onboardingComplete || !respondent.verified || !respondent.consentAccepted || !respondent.walletType) fail('ONBOARDING_REQUIRED', 'Complete respondent onboarding before starting a survey.', 409);
      const rules = survey.eligibility;
      if ((rules.districts?.length && !rules.districts.includes(respondent.demographics?.district ?? '')) || (rules.ageBands?.length && !rules.ageBands.includes(respondent.demographics?.ageBand ?? '')) || (rules.genders?.length && !rules.genders.includes(respondent.demographics?.gender ?? ''))) fail('NOT_ELIGIBLE', 'Your saved profile does not match this survey’s eligibility rules.', 403);
      if (quotaUsed(state, survey.id) >= survey.quota) fail('QUOTA_FULL', 'All response slots for this survey are currently taken.', 409);
      const responseId = id('response'); const at = now();
      state.responses.push({ id: responseId, surveyId: survey.id, respondentId: actor.id, answers: {}, status: 'Draft', verificationStatus: 'NotStarted', createdAt: at, updatedAt: at, checks: {}, flags: [], quotaConsumed: false });
      activity(state, actor.id, 'response_started', 'Started a response draft.', { surveyId: survey.id, responseId });
      return { surveyId: survey.id, responseId };
    }
    case 'SAVE_DRAFT': {
      const response = responseById(state, command.payload.responseId);
      if (response.respondentId !== actor.id) fail('NOT_RESPONSE_OWNER', 'Only the respondent can save this draft.', 403);
      if (response.status !== 'Draft') fail('RESPONSE_NOT_EDITABLE', 'Only a response draft can be edited.', 409);
      const survey = relatedSurvey(state, response);
      validateAnswers(survey, command.payload.answers, false);
      if (command.payload.timingSeconds !== undefined && (!Number.isSafeInteger(command.payload.timingSeconds) || command.payload.timingSeconds < 0)) fail('INVALID_TIMING', 'Timing must be a non-negative whole number of seconds.');
      response.answers = structuredClone(command.payload.answers); response.timingSeconds = command.payload.timingSeconds ?? response.timingSeconds; response.updatedAt = now();
      return { surveyId: survey.id, responseId: response.id };
    }
    case 'SUBMIT_RESPONSE': {
      const response = responseById(state, command.payload.responseId);
      if (response.respondentId !== actor.id) fail('NOT_RESPONSE_OWNER', 'Only the respondent can submit this response.', 403);
      if (response.status !== 'Draft') fail('RESPONSE_ALREADY_SUBMITTED', 'This response has already been submitted.', 409);
      const survey = relatedSurvey(state, response);
      if (survey.status !== 'Active') fail('SURVEY_UNAVAILABLE', 'This survey is no longer accepting responses.', 409);
      validateAnswers(survey, response.answers, true);
      if (quotaUsed(state, survey.id) >= survey.quota) fail('QUOTA_FULL', 'All response slots for this survey are currently taken.', 409);
      response.status = 'Submitted'; response.submittedAt = now(); response.updatedAt = now(); response.quotaConsumed = true;
      activity(state, actor.id, 'response_submitted', 'Submitted survey answers; verification and researcher review are next.', { surveyId: survey.id, responseId: response.id });
      notification(state, survey.researcherId, 'New response submitted', 'নতুন উত্তর জমা হয়েছে', 'A respondent submitted answers for your survey.', 'একজন উত্তরদাতা আপনার জরিপে উত্তর জমা দিয়েছেন।', { linkedResponseId: response.id });
      return { surveyId: survey.id, responseId: response.id };
    }
    case 'CAPTURE_AUDIO': {
      const response = responseById(state, command.payload.responseId);
      if (response.respondentId !== actor.id) fail('NOT_RESPONSE_OWNER', 'Only the respondent can start verification.', 403);
      if (!['Submitted', 'UnderReview'].includes(response.status)) fail('RESPONSE_NOT_SUBMITTED', 'Submit the response before starting verification.', 409);
      if (command.payload.phrase !== undefined) localized(command.payload.phrase, 'Prompt phrase');
      const prior = state.verificationRuns.find((run) => run.responseId === response.id);
      if (prior) return { surveyId: response.surveyId, responseId: response.id };
      const run: VerificationRun = { id: id('verification'), responseId: response.id, scenario: state.demoSettings.responseScenario, status: 'Pending', startedAt: now(), phrase: command.payload.phrase ?? text('I choose where my opinion goes.', 'আমার মতামত কোথায় যাবে তা আমি বেছে নিই।'), clipRef: `sample://capture/${response.id}`, clipDurationMs: command.payload.clipDurationMs ?? 2400, checks: {}, flags: [] };
      if (!Number.isSafeInteger(run.clipDurationMs) || run.clipDurationMs < 0) fail('INVALID_AUDIO', 'Clip duration must be a non-negative integer.');
      state.verificationRuns.push(run); response.verificationStatus = 'Pending'; response.updatedAt = now();
      activity(state, actor.id, 'verification_started', 'Started persisted simulated audio and integrity checks.', { surveyId: response.surveyId, responseId: response.id });
      return { surveyId: response.surveyId, responseId: response.id };
    }
    case 'RESOLVE_RESPONSE_FLAG': {
      const response = responseById(state, command.payload.responseId); const survey = relatedSurvey(state, response);
      if (survey.researcherId !== actor.id) fail('NOT_SURVEY_OWNER', 'Only the survey owner can resolve this response flag.', 403);
      if (!command.payload.reason.trim()) fail('RESOLUTION_REASON_REQUIRED', 'Add a reason for the resolution.');
      const flag = response.flags.find((item) => item.id === command.payload.flagId);
      if (!flag) fail('FLAG_NOT_FOUND', 'Response flag not found.', 404);
      if (!flag.resolvedAt) { flag.resolvedAt = now(); flag.resolvedBy = actor.id; flag.resolutionReason = command.payload.reason.trim(); }
      const run = state.verificationRuns.find((item) => item.responseId === response.id);
      const runFlag = run?.flags.find((item) => item.id === flag.id);
      if (runFlag && !runFlag.resolvedAt) Object.assign(runFlag, { resolvedAt: flag.resolvedAt, resolvedBy: actor.id, resolutionReason: flag.resolutionReason });
      activity(state, actor.id, 'response_flag_resolved', command.payload.reason.trim(), { surveyId: survey.id, responseId: response.id });
      return { surveyId: survey.id, responseId: response.id };
    }
    case 'RESOLVE_ACCOUNT_FLAG': {
      requireUser(state, actor.id, 'admin');
      const target = state.users.find((item) => item.id === command.payload.userId);
      if (!target) fail('USER_NOT_FOUND', 'Account not found.', 404);
      if (!command.payload.reason.trim()) fail('RESOLUTION_REASON_REQUIRED', 'Add a reason for the resolution.');
      const flag = target.accountFlags?.find((item) => item.id === command.payload.flagId);
      if (!flag) fail('FLAG_NOT_FOUND', 'Account flag not found.', 404);
      if (!flag.resolvedAt) { flag.resolvedAt = now(); flag.resolvedBy = actor.id; flag.resolutionReason = command.payload.reason.trim(); }
      const runFlag = state.verificationRuns.flatMap((run) => run.flags).find((item) => item.id === flag.id);
      if (runFlag && !runFlag.resolvedAt) Object.assign(runFlag, { resolvedAt: flag.resolvedAt, resolvedBy: actor.id, resolutionReason: flag.resolutionReason });
      activity(state, actor.id, 'account_flag_resolved', command.payload.reason.trim());
      return {};
    }
    case 'REVIEW_RESPONSE': {
      const response = responseById(state, command.payload.responseId); const survey = relatedSurvey(state, response);
      if (survey.researcherId !== actor.id) fail('NOT_SURVEY_OWNER', 'Only the survey owner can review this response.', 403);
      if (response.status === 'Approved') {
        if (command.payload.decision === 'approve') return { surveyId: survey.id, responseId: response.id, paymentId: state.payments.find((item) => item.responseId === response.id)?.id };
        fail('RESPONSE_ALREADY_REVIEWED', 'An approved response cannot be changed.', 409);
      }
      if (response.status === 'Rejected') {
        if (command.payload.decision === 'reject') return { surveyId: survey.id, responseId: response.id };
        fail('RESPONSE_ALREADY_REVIEWED', 'A rejected response cannot be changed.', 409);
      }
      if (!['Submitted', 'UnderReview'].includes(response.status)) fail('RESPONSE_NOT_REVIEWABLE', 'This response is not ready for review.', 409);
      if (command.payload.decision === 'reject') {
        if (!command.payload.note.trim()) fail('REVIEW_NOTE_REQUIRED', 'Add a reason before rejecting a response.');
        response.status = 'Rejected'; response.quotaConsumed = false; response.reviewDecision = { reviewerId: actor.id, decision: 'rejected', note: command.payload.note.trim(), at: now() };
        activity(state, actor.id, 'response_rejected', command.payload.note.trim(), { surveyId: survey.id, responseId: response.id });
        notification(state, response.respondentId, 'Response reviewed', 'উত্তর পর্যালোচনা হয়েছে', 'Your response was not approved for payment. Review the note in your response details.', 'আপনার উত্তরটি পেমেন্টের জন্য অনুমোদিত হয়নি। বিস্তারিত দেখুন।', { linkedResponseId: response.id });
        return { surveyId: survey.id, responseId: response.id };
      }
      const verification = state.verificationRuns.find((run) => run.responseId === response.id && run.status === 'Completed');
      if (!verification) fail('VERIFICATION_REQUIRED', 'A completed simulated audio verification is required before approval.', 409);
      if (unresolved(response.flags).length) fail('UNRESOLVED_RESPONSE_FLAGS', 'Resolve response integrity flags before approval.', 409);
      if (unresolved(state.users.find((user) => user.id === response.respondentId)?.accountFlags ?? []).length) fail('UNRESOLVED_ACCOUNT_FLAGS', 'An admin must clear account integrity flags before approval.', 409);
      const priorPayment = state.payments.find((payment) => payment.responseId === response.id);
      if (priorPayment) fail('PAYMENT_ALREADY_SCHEDULED', 'A payment already exists for this response.', 409);
      const amountToPay = survey.rewardPaisa + Math.ceil(survey.rewardPaisa * survey.feeBps / 10000);
      if (accountBalance(state, `survey:${survey.id}:escrow`) < amountToPay) fail('ESCROW_INSUFFICIENT', 'Survey escrow cannot cover this response and fee.', 409);
      response.status = 'Approved'; response.reviewDecision = { reviewerId: actor.id, decision: 'approved', note: command.payload.note.trim(), at: now() }; response.updatedAt = now();
      const paymentId = id('payment');
      state.payments.push({ id: paymentId, responseId: response.id, surveyId: survey.id, respondentId: response.respondentId, rewardPaisa: survey.rewardPaisa, feePaisa: Math.ceil(survey.rewardPaisa * survey.feeBps / 10000), status: 'Processing', attempts: 1, idempotencyKey: `jonomot:${response.id}:payout`, scenario: state.demoSettings.paymentScenario, scheduledAt: now() });
      activity(state, actor.id, 'response_approved', command.payload.note.trim() || 'Response approved; payout scheduled.', { surveyId: survey.id, responseId: response.id, paymentId });
      notification(state, response.respondentId, 'Response approved', 'উত্তর অনুমোদিত', 'Your response passed review and a mock payment is processing.', 'আপনার উত্তর অনুমোদিত হয়েছে এবং ডেমো পেমেন্ট প্রক্রিয়াধীন।', { linkedResponseId: response.id, linkedPaymentId: paymentId });
      return { surveyId: survey.id, responseId: response.id, paymentId };
    }
    case 'RETRY_PAYMENT': {
      const payment = state.payments.find((item) => item.id === command.payload.paymentId);
      if (!payment) fail('PAYMENT_NOT_FOUND', 'Payment not found.', 404);
      const survey = state.surveys.find((item) => item.id === payment.surveyId);
      if (!survey || survey.researcherId !== actor.id) fail('NOT_SURVEY_OWNER', 'Only the survey owner can retry this payment.', 403);
      if (payment.status !== 'Failed') return { surveyId: payment.surveyId, responseId: payment.responseId, paymentId: payment.id };
      payment.status = 'Processing'; payment.attempts += 1; payment.scheduledAt = now(); delete payment.lastError;
      activity(state, actor.id, 'payment_retry_started', `Retry attempt ${payment.attempts} uses the same payment identity.`, { surveyId: survey.id, responseId: payment.responseId, paymentId: payment.id });
      notification(state, payment.respondentId, 'Payment retry started', 'পেমেন্ট আবার শুরু হয়েছে', 'The researcher retried your mock payout.', 'গবেষক আপনার ডেমো পেমেন্ট আবার শুরু করেছেন।', { linkedResponseId: payment.responseId, linkedPaymentId: payment.id });
      return { surveyId: survey.id, responseId: payment.responseId, paymentId: payment.id };
    }
    case 'MARK_NOTIFICATION_READ': {
      const item = state.notifications.find((notificationItem) => notificationItem.id === command.payload.notificationId);
      if (!item) fail('NOTIFICATION_NOT_FOUND', 'Notification not found.', 404);
      if (item.recipientId !== actor.id) fail('NOT_NOTIFICATION_OWNER', 'Only the recipient can mark this notification as read.', 403);
      item.readAt ??= now(); return {};
    }
    case 'SET_DEMO_SCENARIO': {
      if (command.payload.responseScenario === undefined && command.payload.paymentScenario === undefined) fail('INVALID_COMMAND', 'Choose a response or payment scenario to update.');
      if (command.payload.responseScenario) state.demoSettings.responseScenario = command.payload.responseScenario;
      if (command.payload.paymentScenario) state.demoSettings.paymentScenario = command.payload.paymentScenario;
      activity(state, actor.id, 'demo_scenario_changed', `Future operations: response ${state.demoSettings.responseScenario}, payment ${state.demoSettings.paymentScenario}.`);
      return {};
    }
    case 'RESET_DEMO':
      // Reset is handled by the browser demo adapter.
      fail('RESET_ROUTE_REQUIRED', 'Use the confirmed reset endpoint so the complete state is restored atomically.', 409);
  }
}

export function makeFlag(kind: IntegrityFlag['kind'], label: string, reason: string): IntegrityFlag { return { id: id('flag'), kind, label, reason }; }
export function buildChecks(scenario: DemoState['demoSettings']['responseScenario']): { checks: Record<string, IntegrityCheck>; flags: IntegrityFlag[] } {
  const at = now();
  const check = (passed: boolean, detail: string): IntegrityCheck => ({ passed, detail, checkedAt: at });
  const checks: Record<string, IntegrityCheck> = {
    device: check(true, 'One local demo session and device profile observed.'),
    timing: check(true, 'Completion time is within the expected demo range.'),
    attention: check(true, 'Attention prompt was answered consistently.'),
    voice: check(true, 'Prompted phrase metadata is consistent; no biometric matching is performed.'),
  };
  const flags: IntegrityFlag[] = [];
  if (scenario === 'reviewFlag') {
    checks.attention = check(false, 'The seeded attention prompt did not match. Researcher review is required.');
    flags.push(makeFlag('attention', 'Attention check needs review', 'The seeded attention prompt did not match.'));
  }
  if (scenario === 'voiceFlag') {
    checks.voice = check(false, 'The simulated voice check needs admin account review. No real voice identity was evaluated.');
    flags.push(makeFlag('voice', 'Simulated voice flag', 'The optional demo voice scenario routes this account to admin review.'));
  }
  return { checks, flags };
}

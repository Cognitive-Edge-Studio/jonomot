export type Id = string;
export type Role = 'researcher' | 'respondent' | 'admin';
export type BilingualText = { en: string; bn: string };
export type SurveyStatus = 'Draft' | 'UnderReview' | 'Published' | 'Active' | 'Paused' | 'Closed' | 'Archived';
export type ResponseStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected';
export type VerificationStatus = 'NotStarted' | 'Pending' | 'Passed' | 'Flagged';
export type PaymentStatus = 'Processing' | 'Failed' | 'Paid';
export type DemoScenario = 'clean' | 'reviewFlag' | 'voiceFlag';
export type PaymentScenario = 'success' | 'retry';
export type WalletType = 'bKash' | 'Nagad' | 'Rocket';

export interface DemoUser {
  id: Id; name: string; role: Role; verified: boolean; phone?: string;
  phoneVerified?: boolean;
  consentAccepted?: boolean; onboardingComplete?: boolean;
  demographics?: { ageBand?: string; gender?: string; district?: string };
  walletType?: WalletType; identityStatus?: 'NotStarted' | 'Pending' | 'Verified' | 'Flagged';
  accountFlags?: IntegrityFlag[]; preferredLanguage?: 'en' | 'bn';
}
export interface ChoiceOption { id: Id; label: BilingualText }
export interface SingleChoiceQuestion { id: Id; type: 'singleChoice'; prompt: BilingualText; required: boolean; options: ChoiceOption[] }
export interface MultipleChoiceQuestion { id: Id; type: 'multipleChoice'; prompt: BilingualText; required: boolean; options: ChoiceOption[]; minSelections?: number; maxSelections?: number }
export interface LikertQuestion { id: Id; type: 'likert'; prompt: BilingualText; required: boolean; min: number; max: number; minLabel?: BilingualText; maxLabel?: BilingualText }
export interface TextQuestion { id: Id; type: 'text'; prompt: BilingualText; required: boolean; minLength?: number; maxLength?: number }
export interface NumberQuestion { id: Id; type: 'number'; prompt: BilingualText; required: boolean; min?: number; max?: number; step?: number }
export type SurveyQuestion = SingleChoiceQuestion | MultipleChoiceQuestion | LikertQuestion | TextQuestion | NumberQuestion;
export type SurveyAnswer = string | string[] | number;
export type Answers = Record<Id, SurveyAnswer>;
export interface EligibilityRules { districts?: string[]; ageBands?: string[]; genders?: string[] }
export interface Survey {
  id: Id; researcherId: Id; title: BilingualText; description: BilingualText; questions: SurveyQuestion[];
  rewardPaisa: number; feeBps: number; quota: number; eligibility: EligibilityRules;
  manualReview: boolean; status: SurveyStatus; createdAt: string; updatedAt: string;
  fundedAt?: string; fundingLedgerEntryId?: Id; ethicsReview?: { reviewerId: Id; decision: 'approved' | 'rejected'; note: string; at: string };
  sampleHistory?: boolean; estimatedMinutes?: number; topic?: string;
}
export interface IntegrityCheck { passed: boolean; detail: string; checkedAt: string }
export interface IntegrityFlag { id: Id; kind: 'device' | 'timing' | 'attention' | 'voice' | 'identity' | 'other'; label: string; reason: string; resolvedAt?: string; resolvedBy?: Id; resolutionReason?: string }
export interface ResponseRecord {
  id: Id; surveyId: Id; respondentId: Id; answers: Answers; status: ResponseStatus; verificationStatus: VerificationStatus;
  createdAt: string; updatedAt: string; submittedAt?: string; timingSeconds?: number; checks: Record<string, IntegrityCheck>;
  flags: IntegrityFlag[]; reviewDecision?: { reviewerId: Id; decision: 'approved' | 'rejected'; note: string; at: string };
  quotaConsumed: boolean; sampleHistory?: boolean;
}
export interface VerificationRun { id: Id; responseId: Id; scenario: DemoScenario; status: 'Pending' | 'Completed'; startedAt: string; completedAt?: string; phrase: BilingualText; clipRef: string; clipDurationMs: number; checks: Record<string, IntegrityCheck>; flags: IntegrityFlag[] }
export interface Payment {
  id: Id; responseId: Id; surveyId: Id; respondentId: Id; rewardPaisa: number; feePaisa: number;
  status: PaymentStatus; attempts: number; idempotencyKey: string; scenario: PaymentScenario;
  scheduledAt: string; transactionRef?: string; completedAt?: string; sampleHistory?: boolean; lastError?: string;
}
export type LedgerAccount = `researcher:${string}:available` | `survey:${string}:escrow` | `respondent:${string}:wallet` | 'platform:fees' | 'seed:treasury';
export interface LedgerEntry { id: Id; fromAccount: LedgerAccount; toAccount: LedgerAccount; amountPaisa: number; surveyId?: Id; paymentId?: Id; createdAt: string; memo: string; sampleHistory?: boolean }
export interface DemoNotification { id: Id; recipientId: Id; title: BilingualText; body: BilingualText; createdAt: string; readAt?: string; linkedResponseId?: Id; linkedPaymentId?: Id }
export interface ActivityEvent { id: Id; actorId: Id; action: string; surveyId?: Id; responseId?: Id; paymentId?: Id; createdAt: string; detail: string }
export interface SurveyTemplate { id: Id; name: BilingualText; title: BilingualText; description: BilingualText; questions: SurveyQuestion[]; estimatedMinutes: number; topic: string }
export interface DemoSettings { responseScenario: DemoScenario; paymentScenario: PaymentScenario; feeBps: number; templates: SurveyTemplate[] }
export interface DemoState {
  schemaVersion: 1; revision: number; resetGeneration: number; users: DemoUser[]; surveys: Survey[];
  responses: ResponseRecord[]; verificationRuns: VerificationRun[]; payments: Payment[];
  ledgerEntries: LedgerEntry[]; notifications: DemoNotification[]; activityEvents: ActivityEvent[]; demoSettings: DemoSettings;
}

export interface SurveyDefinition { title: BilingualText; description: BilingualText; questions: SurveyQuestion[]; rewardPaisa: number; feeBps?: number; quota: number; eligibility?: EligibilityRules; manualReview?: boolean; estimatedMinutes?: number; topic?: string }
export type DemoCommand =
  | { type: 'CREATE_SURVEY'; payload: { templateId?: string; definition?: SurveyDefinition } }
  | { type: 'UPDATE_SURVEY'; payload: { surveyId: Id; title?: BilingualText; description?: BilingualText; questions?: SurveyQuestion[]; rewardPaisa?: number; feeBps?: number; quota?: number; eligibility?: EligibilityRules; manualReview?: boolean } }
  | { type: 'FUND_SURVEY'; payload: { surveyId: Id } }
  | { type: 'SUBMIT_SURVEY_REVIEW'; payload: { surveyId: Id } }
  | { type: 'REVIEW_SURVEY'; payload: { surveyId: Id; decision: 'approve' | 'reject'; note: string } }
  | { type: 'ACTIVATE_SURVEY'; payload: { surveyId: Id } }
  | { type: 'VERIFY_OTP'; payload: { phone: string; code: string } }
  | { type: 'COMPLETE_ONBOARDING'; payload: { consentAccepted: boolean; demographics: { ageBand: string; gender: string; district: string }; walletType: WalletType; nidLast4: string } }
  | { type: 'START_RESPONSE'; payload: { surveyId: Id } }
  | { type: 'SAVE_DRAFT'; payload: { responseId: Id; answers: Answers; timingSeconds?: number } }
  | { type: 'SUBMIT_RESPONSE'; payload: { responseId: Id } }
  | { type: 'CAPTURE_AUDIO'; payload: { responseId: Id; phrase?: BilingualText; clipDurationMs?: number } }
  | { type: 'RESOLVE_RESPONSE_FLAG'; payload: { responseId: Id; flagId: Id; reason: string } }
  | { type: 'RESOLVE_ACCOUNT_FLAG'; payload: { userId: Id; flagId: Id; reason: string } }
  | { type: 'REVIEW_RESPONSE'; payload: { responseId: Id; decision: 'approve' | 'reject'; note: string } }
  | { type: 'RETRY_PAYMENT'; payload: { paymentId: Id } }
  | { type: 'MARK_NOTIFICATION_READ'; payload: { notificationId: Id } }
  | { type: 'SET_DEMO_SCENARIO'; payload: { responseScenario?: DemoScenario; paymentScenario?: PaymentScenario } }
  | { type: 'RESET_DEMO'; payload: { confirm: true } };
export interface CommandOutcome { surveyId?: Id; responseId?: Id; paymentId?: Id }
export interface CommandResult { state: DemoState; result?: CommandOutcome }
export interface ErrorEnvelope { error: { code: string; message: string } }
export interface HealthResponse { status: 'ok'; revision: number }

export type Language = 'en' | 'bn';

export const copy = {
  en: {
    brand: 'Jonomot', simulated: 'Demo · simulated checks and wallet', language: 'বাংলা', explore: 'Explore',
    earnings: 'Earnings', profile: 'Profile', welcome: 'Your opinion matters', choosePersona: 'Choose a respondent profile to continue.',
    continueAs: 'Continue as', noRespondents: 'No respondent profiles are available yet.', missingUser: 'This demo profile is no longer available.',
    chooseAgain: 'Choose another profile', wrongRole: 'This profile belongs to another demo role.', switchRole: 'Switch to a respondent profile', loading: 'Getting things ready…',
    loadError: 'We could not load the demo right now.', retry: 'Try again', onboarding: 'A few quick steps', onboardingIntro: 'A few details help match you with relevant studies. Use fictional contact and identity details in this demo.',
    stepOf: 'Step {step} of {total}', phoneStep: 'Verify your phone', phoneLabel: 'Mobile number', phoneHint: 'Use a fictional number for this demo.', otpLabel: '6-digit demo code', otpHint: 'The visible demo code is 123456.', verifyContinue: 'Verify and continue',
    consentStep: 'Your consent', consentTitle: 'I agree to take part in this simulated research demo and understand my answers are sample data.',
    identityStep: 'Sample identity check', identityIntro: 'This is a fictional verification flow. No identity document or camera is used.', nidLabel: 'Fictional NID last 4 digits', selfieTitle: 'Selfie check', selfieCopy: 'Simulated only · no photo is captured',
    profileStep: 'About you', ageLabel: 'Age range', genderLabel: 'Gender', districtLabel: 'District', selectOne: 'Choose one',
    walletStep: 'Mock wallet', walletIntro: 'Choose where a sample reward would appear. No payment is sent.', walletLabel: 'Preferred wallet', finishSetup: 'Save profile',
    requiredFields: 'Complete the highlighted fields to continue.', otpInvalid: 'Enter a valid 6-digit code.', otpWrong: 'The demo code is 123456.', consentRequired: 'Please accept the demo consent to continue.',
    onboardingSaved: 'Your sample profile is ready.', onboardingNeeded: 'Finish your sample profile to unlock surveys.',
    hello: 'Hello, {name}', todaysSurveys: 'Surveys for you', exploreIntro: 'Explore a study’s purpose, time, and reward before sharing your perspective.',
    available: 'Available', minutes: 'min', verifiedResearcher: 'Verified researcher', reward: 'Sample reward', details: 'View details',
    noSurveys: 'No surveys match your profile right now.', noSurveysCopy: 'Matching opportunities appear when researchers activate their studies. You can check your profile or return later.', quotaLeft: '{count} spots left',
    aboutSurvey: 'About this survey', questions: 'questions', startSurvey: 'Start survey', resumeSurvey: 'Resume survey', eligibility: 'You match the listed requirements.',
    surveyClosed: 'This survey is no longer available.', backExplore: 'Back to explore', question: 'Question', of: 'of', required: 'Required', optional: 'Optional',
    chooseAnswer: 'Choose an answer to continue.', selectAtLeast: 'Choose at least {count}.', selectAtMost: 'Choose no more than {count}.',
    answerTooShort: 'Enter at least {count} characters.', answerTooLong: 'Keep your answer under {count} characters.', numberTooSmall: 'Enter {count} or more.', numberTooLarge: 'Enter {count} or less.', numberStep: 'Use steps of {count}.',
    previous: 'Previous', next: 'Next', reviewAnswers: 'Review answers', saveDraft: 'Save draft', saving: 'Saving…', saved: 'Saved', saveError: 'Your edits are still here, but could not be saved.', retrySave: 'Retry save',
    draftCount: 'Your answers are saved as a draft.', submitSurvey: 'Submit survey', submitConfirmTitle: 'Ready to send your answers?', submitConfirmCopy: 'You can review them once more before submitting. Submitting uses one survey spot.', confirmSubmit: 'Submit answers',
    submitted: 'Answers submitted', submittedCopy: 'Next, record a short sample phrase for the demo checks.', startVerification: 'Continue to voice check', leaveSurvey: 'Leave survey', leaveWarning: 'Your latest edits are still saving. Please wait before leaving.',
    audioTitle: 'A quick verification step', audioIntro: 'Complete this simulated voice step to send your answers for review. The phrase below shows how the check works.',
    speakPhrase: 'Example phrase', recordSample: 'Run sample check', recording: 'Preparing the sample…', checking: 'Starting demo checks…', sampleLength: 'About 3 seconds',
    audioDisclaimer: 'Demo audio only. Your microphone remains off.', verificationPending: 'Verification pending', reviewPending: 'Waiting for researcher review',
    verificationComplete: 'Verification receipt', responseStatus: 'Response status', verificationStatus: 'Voice check', deviceCheck: 'Device', timingCheck: 'Timing', attentionCheck: 'Attention', voiceCheck: 'Voice',
    passed: 'Passed', flagged: 'Flagged for review', notRun: 'Not run', checkPending: 'Pending', flaggedCopy: 'One check needs attention. A researcher will review it before a reward is scheduled.',
    cleanCopy: 'Checks complete. A researcher will review your answers before your reward is scheduled.', awaitingCapture: 'Record the sample phrase to begin verification.',
    responseSubmitted: 'Submitted', underReview: 'Under review', approved: 'Approved', rejected: 'Not approved', draft: 'Draft', processing: 'Payment processing', paid: 'Paid', failed: 'Payment failed',
    nextAction: 'What happens next', noCash: 'Demo only · no money is sent to a real wallet.',
    pendingRewards: 'Pending rewards', paidTotal: 'Paid total', paymentHistory: 'Payment history', earningsIntro: 'See which demo rewards are being processed, which need a retry, and which are paid.', noPayments: 'No rewards yet', noPaymentsCopy: 'Complete a survey to see its payment status here.',
    paidReceipt: 'Reward receipt', mockWallet: 'Mock wallet', transaction: 'Transaction', timestamp: 'Date and time', openSurvey: 'Open survey', sampleHistory: 'Sample history',
    paymentFailedCopy: 'The mock transfer failed. The researcher can retry it from their workspace.', paymentProcessingCopy: 'This sample reward is waiting for the demo payment processor.', receiptReference: 'Receipt reference',
    profileTitle: 'Your sample profile', profileIntro: 'Review your contact preferences, study-matching details, and verification status.', identityBadge: 'Identity check', verificationBadge: 'Profile check', phoneBadge: 'Phone on file', wallet: 'Wallet', demographics: 'Demographics',
    languagePreference: 'Language', english: 'English', bangla: 'বাংলা', notifications: 'Notifications', noNotifications: 'You’re all caught up.', markRead: 'Mark as read', read: 'Read', verified: 'Verified', notVerified: 'Not verified', consent: 'Consent',
    age18to24: '18–24', age25to34: '25–34', age35to44: '35–44', age45plus: '45+', genderWoman: 'Woman', genderMan: 'Man', genderNonbinary: 'Non-binary', genderPreferNot: 'Prefer not to say',
    districtDhaka: 'Dhaka', districtChattogram: 'Chattogram', districtOther: 'Other', goToExplore: 'Explore surveys', viewEarnings: 'View earnings',
    errorTitle: 'Something needs attention', commandError: 'That action could not be completed.', close: 'Close', status: 'Status', topic: 'Topic',
  },
  bn: {
    brand: 'জনমত', simulated: 'ডেমো · অনুকরণভিত্তিক যাচাই ও ওয়ালেট', language: 'EN', explore: 'জরিপ খুঁজুন',
    earnings: 'আয়', profile: 'প্রোফাইল', welcome: 'আপনার মতামত গুরুত্বপূর্ণ', choosePersona: 'চালিয়ে যেতে একজন উত্তরদাতার প্রোফাইল বেছে নিন।',
    continueAs: 'এগিয়ে যান', noRespondents: 'এখন কোনো উত্তরদাতার প্রোফাইল নেই।', missingUser: 'এই ডেমো প্রোফাইলটি আর পাওয়া যাচ্ছে না।',
    chooseAgain: 'অন্য প্রোফাইল বেছে নিন', wrongRole: 'এই প্রোফাইলটি ডেমোর অন্য একটি ভূমিকার।', switchRole: 'উত্তরদাতার প্রোফাইল বেছে নিন', loading: 'প্রস্তুত হচ্ছে…',
    loadError: 'এখন ডেমো লোড করা যাচ্ছে না।', retry: 'আবার চেষ্টা করুন', onboarding: 'আরও কয়েকটি ধাপ', onboardingIntro: 'কয়েকটি তথ্য আপনার উপযুক্ত গবেষণা খুঁজে পেতে সাহায্য করবে। এই ডেমোতে কাল্পনিক যোগাযোগ ও পরিচয়ের তথ্য দিন।',
    stepOf: '{total}-এর মধ্যে ধাপ {step}', phoneStep: 'ফোন যাচাই', phoneLabel: 'মোবাইল নম্বর', phoneHint: 'এই ডেমোতে কাল্পনিক নম্বর ব্যবহার করুন।', otpLabel: '৬ সংখ্যার ডেমো কোড', otpHint: 'ডেমো কোডটি হলো 123456।', verifyContinue: 'যাচাই করে এগিয়ে যান',
    consentStep: 'আপনার সম্মতি', consentTitle: 'আমি এই অনুকরণভিত্তিক গবেষণা ডেমোতে অংশ নিতে সম্মত এবং বুঝি যে আমার উত্তরগুলো নমুনা তথ্য।',
    identityStep: 'নমুনা পরিচয় যাচাই', identityIntro: 'এটি কাল্পনিক যাচাই প্রক্রিয়া। কোনো পরিচয়পত্র বা ক্যামেরা ব্যবহার হয় না।', nidLabel: 'কাল্পনিক NID-এর শেষ ৪ সংখ্যা', selfieTitle: 'সেলফি যাচাই', selfieCopy: 'শুধু অনুকরণ · কোনো ছবি তোলা হয় না',
    profileStep: 'আপনার সম্পর্কে', ageLabel: 'বয়সের পরিসর', genderLabel: 'লিঙ্গ', districtLabel: 'জেলা', selectOne: 'একটি বেছে নিন',
    walletStep: 'মক ওয়ালেট', walletIntro: 'নমুনা পুরস্কার কোথায় দেখাবেন বেছে নিন। কোনো অর্থ পাঠানো হবে না।', walletLabel: 'পছন্দের ওয়ালেট', finishSetup: 'প্রোফাইল সংরক্ষণ',
    requiredFields: 'এগোতে চিহ্নিত ঘরগুলো পূরণ করুন।', otpInvalid: '৬ সংখ্যার সঠিক কোড লিখুন।', otpWrong: 'ডেমো কোডটি হলো 123456।', consentRequired: 'এগোতে ডেমোর সম্মতি দিন।',
    onboardingSaved: 'আপনার নমুনা প্রোফাইল তৈরি হয়েছে।', onboardingNeeded: 'জরিপ দেখতে নমুনা প্রোফাইল সম্পূর্ণ করুন।',
    hello: 'স্বাগতম, {name}', todaysSurveys: 'আপনার জন্য জরিপ', exploreIntro: 'মতামত দেওয়ার আগে গবেষণার উদ্দেশ্য, সময় ও পুরস্কার জেনে নিন।',
    available: 'খোলা আছে', minutes: 'মিনিট', verifiedResearcher: 'যাচাইকৃত গবেষক', reward: 'নমুনা পুরস্কার', details: 'বিস্তারিত দেখুন',
    noSurveys: 'এখন আপনার প্রোফাইলের সঙ্গে মেলে এমন জরিপ নেই।', noSurveysCopy: 'গবেষণা চালু হলে আপনার উপযুক্ত সুযোগ এখানে দেখা যাবে। প্রোফাইল দেখে নিতে পারেন বা পরে ফিরে আসতে পারেন।', quotaLeft: '{count}টি আসন বাকি',
    aboutSurvey: 'জরিপ সম্পর্কে', questions: 'টি প্রশ্ন', startSurvey: 'জরিপ শুরু করুন', resumeSurvey: 'জরিপ চালিয়ে যান', eligibility: 'তালিকাভুক্ত শর্তের সঙ্গে আপনার মিল আছে।',
    surveyClosed: 'এই জরিপটি আর খোলা নেই।', backExplore: 'জরিপে ফিরুন', question: 'প্রশ্ন', of: '/', required: 'আবশ্যক', optional: 'ঐচ্ছিক',
    chooseAnswer: 'এগোতে একটি উত্তর বেছে নিন।', selectAtLeast: 'অন্তত {count}টি বেছে নিন।', selectAtMost: 'সর্বোচ্চ {count}টি বেছে নিন।',
    answerTooShort: 'অন্তত {count} অক্ষর লিখুন।', answerTooLong: '{count} অক্ষরের মধ্যে উত্তর দিন।', numberTooSmall: '{count} বা তার বেশি লিখুন।', numberTooLarge: '{count} বা তার কম লিখুন।', numberStep: '{count} করে সংখ্যা দিন।',
    previous: 'আগেরটি', next: 'পরেরটি', reviewAnswers: 'উত্তর দেখুন', saveDraft: 'খসড়া সংরক্ষণ', saving: 'সংরক্ষণ হচ্ছে…', saved: 'সংরক্ষিত', saveError: 'আপনার সম্পাদনা আছে, কিন্তু সংরক্ষণ করা যায়নি।', retrySave: 'আবার সংরক্ষণ',
    draftCount: 'আপনার উত্তর খসড়া হিসেবে সংরক্ষিত আছে।', submitSurvey: 'জরিপ জমা দিন', submitConfirmTitle: 'উত্তর পাঠাতে প্রস্তুত?', submitConfirmCopy: 'জমা দেওয়ার আগে আরেকবার দেখে নিতে পারেন। জমা দিলে জরিপের একটি আসন ব্যবহৃত হবে।', confirmSubmit: 'উত্তর জমা দিন',
    submitted: 'উত্তর জমা হয়েছে', submittedCopy: 'এরপর ডেমো যাচাইয়ের জন্য একটি ছোট বাক্য রেকর্ড করুন।', startVerification: 'কণ্ঠ যাচাই চালিয়ে যান', leaveSurvey: 'জরিপ ছেড়ে যান', leaveWarning: 'সর্বশেষ সম্পাদনা সংরক্ষণ হচ্ছে। যাওয়ার আগে অপেক্ষা করুন।',
    audioTitle: 'একটি দ্রুত যাচাইয়ের ধাপ', audioIntro: 'পর্যালোচনার জন্য উত্তর পাঠাতে এই অনুকরণভিত্তিক কণ্ঠের ধাপটি সম্পন্ন করুন। নিচের বাক্যটি যাচাইয়ের পদ্ধতি দেখায়।',
    speakPhrase: 'উদাহরণ বাক্য', recordSample: 'নমুনা যাচাই চালান', recording: 'নমুনা প্রস্তুত হচ্ছে…', checking: 'ডেমো যাচাই শুরু হচ্ছে…', sampleLength: 'প্রায় ৩ সেকেন্ড',
    audioDisclaimer: 'শুধু ডেমো অডিও। আপনার মাইক্রোফোন বন্ধ থাকে।', verificationPending: 'যাচাই অপেক্ষমাণ', reviewPending: 'গবেষকের পর্যালোচনার অপেক্ষায়',
    verificationComplete: 'যাচাই রসিদ', responseStatus: 'উত্তরের অবস্থা', verificationStatus: 'কণ্ঠ যাচাই', deviceCheck: 'ডিভাইস', timingCheck: 'সময়', attentionCheck: 'মনোযোগ', voiceCheck: 'কণ্ঠ',
    passed: 'উত্তীর্ণ', flagged: 'পর্যালোচনার জন্য চিহ্নিত', notRun: 'চালানো হয়নি', checkPending: 'অপেক্ষমাণ', flaggedCopy: 'একটি যাচাইয়ে নজর দেওয়া দরকার। পুরস্কার নির্ধারণের আগে গবেষক সেটি পর্যালোচনা করবেন।',
    cleanCopy: 'যাচাই সম্পন্ন। পুরস্কার নির্ধারণের আগে গবেষক আপনার উত্তর পর্যালোচনা করবেন।', awaitingCapture: 'যাচাই শুরু করতে নমুনা বাক্য রেকর্ড করুন।',
    responseSubmitted: 'জমা হয়েছে', underReview: 'পর্যালোচনাধীন', approved: 'অনুমোদিত', rejected: 'অনুমোদিত হয়নি', draft: 'খসড়া', processing: 'পেমেন্ট প্রক্রিয়াধীন', paid: 'পরিশোধিত', failed: 'পেমেন্ট ব্যর্থ',
    nextAction: 'এরপর কী হবে', noCash: 'শুধু ডেমো · বাস্তব ওয়ালেটে টাকা পাঠানো হয় না।',
    pendingRewards: 'অপেক্ষমাণ পুরস্কার', paidTotal: 'পরিশোধিত মোট', paymentHistory: 'পেমেন্টের ইতিহাস', earningsIntro: 'কোন ডেমো পুরস্কার প্রক্রিয়াধীন, কোনটি আবার চেষ্টা করা দরকার এবং কোনটি পরিশোধিত দেখুন।', noPayments: 'এখনও কোনো পুরস্কার নেই', noPaymentsCopy: 'জরিপ সম্পন্ন করলে এখানে পেমেন্টের অবস্থা দেখবেন।',
    paidReceipt: 'পুরস্কারের রসিদ', mockWallet: 'মক ওয়ালেট', transaction: 'লেনদেন', timestamp: 'তারিখ ও সময়', openSurvey: 'জরিপ খুলুন', sampleHistory: 'নমুনা ইতিহাস',
    paymentFailedCopy: 'মক ট্রান্সফারটি ব্যর্থ হয়েছে। গবেষক তার কর্মক্ষেত্র থেকে আবার চেষ্টা করতে পারবেন।', paymentProcessingCopy: 'এই নমুনা পুরস্কার ডেমো পেমেন্ট প্রসেসরের অপেক্ষায় আছে।', receiptReference: 'রসিদ নম্বর',
    profileTitle: 'আপনার নমুনা প্রোফাইল', profileIntro: 'যোগাযোগের পছন্দ, গবেষণার সাথে মিল খুঁজতে ব্যবহৃত তথ্য এবং যাচাইয়ের অবস্থা দেখুন।', identityBadge: 'পরিচয় যাচাই', verificationBadge: 'প্রোফাইল যাচাই', phoneBadge: 'ফোন নম্বর', wallet: 'ওয়ালেট', demographics: 'জনতাত্ত্বিক তথ্য',
    languagePreference: 'ভাষা', english: 'English', bangla: 'বাংলা', notifications: 'বিজ্ঞপ্তি', noNotifications: 'নতুন কোনো বিজ্ঞপ্তি নেই।', markRead: 'পড়া হয়েছে চিহ্নিত করুন', read: 'পড়া হয়েছে', verified: 'যাচাইকৃত', notVerified: 'যাচাইকৃত নয়', consent: 'সম্মতি',
    age18to24: '১৮–২৪', age25to34: '২৫–৩৪', age35to44: '৩৫–৪৪', age45plus: '৪৫+', genderWoman: 'নারী', genderMan: 'পুরুষ', genderNonbinary: 'নন-বাইনারি', genderPreferNot: 'বলতে চাই না',
    districtDhaka: 'ঢাকা', districtChattogram: 'চট্টগ্রাম', districtOther: 'অন্যান্য', goToExplore: 'জরিপ খুঁজুন', viewEarnings: 'আয় দেখুন',
    errorTitle: 'একটি সমস্যা হয়েছে', commandError: 'কাজটি সম্পন্ন করা যায়নি।', close: 'বন্ধ করুন', status: 'অবস্থা', topic: 'বিষয়',
  },
} as const;

export type CopyKey = keyof typeof copy.en;
export function t(language: Language, key: CopyKey, values: Record<string, string | number> = {}): string {
  let value: string = copy[language][key] ?? copy.en[key];
  for (const [name, replacement] of Object.entries(values)) value = value.replace(`{${name}}`, String(replacement));
  return value;
}

export function localize(value: { en: string; bn: string } | undefined, language: Language): string {
  if (!value) return '';
  return language === 'bn' && value.bn ? value.bn : value.en;
}



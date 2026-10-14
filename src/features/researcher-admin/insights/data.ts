import type { DemoState } from '../../../../shared/contracts.js';
import { mapRegions } from './mapRegions.js';

export interface InsightResponse {
  id: string; region: string | null; topic: string; date: string;
  submitted: boolean; reviewed: boolean; paid: boolean; verified: boolean; flagged: boolean;
}
export { mapRegions };
export const topicNames: Record<string, { en: string; bn: string }> = {
  Shopping: { en: 'Shopping', bn: 'কেনাকাটা' }, Mobility: { en: 'Mobility', bn: 'যাতায়াত' },
  'Digital access': { en: 'Digital access', bn: 'ডিজিটাল সেবা' }, 'Household budget': { en: 'Household budget', bn: 'পরিবারের বাজেট' },
};
const aliases: Record<string, string> = {
  dhaka: 'dhaka', 'ঢাকা': 'dhaka', chattogram: 'chattogram', chittagong: 'chattogram', 'চট্টগ্রাম': 'chattogram',
  rajshahi: 'rajshahi', 'রাজশাহী': 'rajshahi', khulna: 'khulna', 'খুলনা': 'khulna', sylhet: 'sylhet', 'সিলেট': 'sylhet',
  rangpur: 'rangpur', 'রংপুর': 'rangpur', barishal: 'barishal', barisal: 'barishal', 'বরিশাল': 'barishal',
  mymensingh: 'mymensingh', 'ময়মনসিংহ': 'mymensingh',
};
export const dayKey = (date: string | number | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));

export function previewResponses(now = Date.now()): InsightResponse[] {
  const sizes: Record<string, number> = { dhaka: 100, chattogram: 64, rajshahi: 36, khulna: 29, sylhet: 24, rangpur: 26, barishal: 19, mymensingh: 22 };
  const topics = Object.keys(topicNames);
  return mapRegions.flatMap((region, regionIndex) => Array.from({ length: sizes[region.id] }, (_, index) => {
    const phase = index % 10;
    const submitted = phase >= 2;
    const reviewed = phase >= 4;
    const flagged = submitted && !reviewed && index % 3 === 0;
    return {
      id: 'preview-' + region.id + '-' + index, region: region.id,
      topic: topics[(index * 7 + regionIndex * 3 + Math.floor(index / 5)) % topics.length],
      date: new Date(now - ((index * 5 + regionIndex * 3) % 14) * 86400000 - (index % 10) * 60000).toISOString(),
      submitted, reviewed, paid: phase >= 6, verified: submitted && !flagged, flagged,
    };
  }));
}

export function studyResponses(state: DemoState, researcherId: string): InsightResponse[] {
  const studies = new Map(state.surveys.filter((survey) => survey.researcherId === researcherId && !survey.sampleHistory).map((survey) => [survey.id, survey]));
  const users = new Map(state.users.map((user) => [user.id, user]));
  const paid = new Set(state.payments.filter((payment) => payment.status === 'Paid' && !payment.sampleHistory).map((payment) => payment.responseId));
  return state.responses.filter((response) => studies.has(response.surveyId) && !response.sampleHistory).map((response) => {
    const district = users.get(response.respondentId)?.demographics?.district?.trim().toLowerCase();
    return {
      id: response.id, region: district ? aliases[district] ?? null : null,
      topic: studies.get(response.surveyId)?.topic || 'Unspecified topic', date: response.submittedAt ?? response.createdAt,
      submitted: response.status !== 'Draft', reviewed: response.status === 'Approved' || response.status === 'Rejected',
      paid: paid.has(response.id), verified: response.verificationStatus === 'Passed',
      flagged: response.flags.some((flag) => !flag.resolvedAt),
    };
  });
}

export function summarize(records: InsightResponse[]) {
  const submitted = records.filter((record) => record.submitted).length;
  const reviewed = records.filter((record) => record.reviewed).length;
  return {
    started: records.length, submitted, reviewed, paid: records.filter((record) => record.paid).length,
    verified: records.filter((record) => record.verified).length, flagged: records.filter((record) => record.flagged).length,
    reviewRate: submitted ? reviewed / submitted * 100 : null,
    topics: new Set(records.filter((record) => record.submitted).map((record) => record.topic)).size,
  };
}

export function maxSubmitted(records: InsightResponse[], grouping: 'region' | 'region-topic') {
  const totals = new Map<string, number>();
  records.filter((record) => record.submitted && record.region !== null).forEach((record) => {
    const key = grouping === 'region' ? record.region! : JSON.stringify([record.region, record.topic]);
    totals.set(key, (totals.get(key) ?? 0) + 1);
  });
  return Math.max(0, ...totals.values());
}

export function inPeriod(records: InsightResponse[], days: number, now = Date.now()) {
  const from = new Date(dayKey(now - (days - 1) * 86400000) + 'T00:00:00+06:00').getTime();
  return records.filter((record) => { const timestamp = Date.parse(record.date); return timestamp >= from && timestamp <= now; });
}

export function dailySubmissions(records: InsightResponse[], days: number, now = Date.now()) {
  const counts = new Map<string, number>();
  records.filter((record) => record.submitted).forEach((record) => counts.set(dayKey(record.date), (counts.get(dayKey(record.date)) ?? 0) + 1));
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now - (days - index - 1) * 86400000);
    const key = dayKey(date);
    return { key, date: date.toISOString(), count: counts.get(key) ?? 0 };
  });
}

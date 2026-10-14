import { BookOpen, GraduationCap, Landmark, type LucideIcon } from 'lucide-react';

const contexts: { icon: LucideIcon; title: [string, string]; description: [string, string] }[] = [
  { icon: GraduationCap, title: ['Thesis & dissertation', 'থিসিস ও অভিসন্দর্ভ'], description: ['Turn a focused research question into a questionnaire and a structured dataset.', 'গবেষণার প্রশ্ন থেকে লক্ষ্যভিত্তিক প্রশ্নপত্র ও সুশৃঙ্খল ডেটাসেট তৈরি করুন।'] },
  { icon: BookOpen, title: ['Faculty-led studies', 'শিক্ষকদের গবেষণা'], description: ['Follow data collection, review response quality, and retain the context behind each result.', 'তথ্য সংগ্রহের অগ্রগতি ও উত্তরের মান দেখুন, প্রতিটি ফলাফলের প্রসঙ্গ সংরক্ষণ করুন।'] },
  { icon: Landmark, title: ['Applied & policy research', 'প্রয়োগমূলক ও নীতি গবেষণা'], description: ['Explore participation across places and topics to inform further investigation.', 'এলাকা ও বিষয় অনুযায়ী অংশগ্রহণ তুলনা করে পরবর্তী অনুসন্ধানের দিক নির্ধারণ করুন।'] },
];

export function LandingResearchContexts({ bn }: { bn: boolean }) {
  return <section className="landing-research-contexts landing-container" aria-labelledby="research-contexts-heading">
    <div className="landing-research-contexts__intro" data-reveal><p className="landing-eyebrow">{bn ? 'গবেষকদের জন্য' : 'FOR RESEARCHERS'} </p><h2 id="research-contexts-heading">{bn ? 'আপনার গবেষণার পরবর্তী ধাপ।' : 'Your next research chapter.'}</h2><p>{bn ? 'গবেষণার প্রশ্ন থেকে তথ্য সংগ্রহ ও বিশ্লেষণ পর্যন্ত।' : 'From defining a question to examining the evidence.'}</p></div>
    <div className="landing-research-contexts__grid">{contexts.map(({ icon: Icon, title, description }) => <article key={title[0]} data-reveal><Icon size={21} strokeWidth={1.5} /><h3>{title[bn ? 1 : 0]}</h3><p>{description[bn ? 1 : 0]}</p></article>)}</div>
  </section>;
}

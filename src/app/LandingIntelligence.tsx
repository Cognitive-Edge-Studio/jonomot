import { useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, Database, FileCheck2, GitBranch, ScanLine, ShieldCheck, Sparkles, WandSparkles, type LucideIcon } from 'lucide-react';
import { Button } from '../shared/ui';
import './landing-intelligence.css';

type Copy = [string, string];
type Engine = {
  id: string;
  label: Copy;
  icon: LucideIcon;
  eyebrow: Copy;
  title: Copy;
  description: Copy;
  points: Copy[];
  image: string;
  alt: Copy;
  summary: Copy;
  signals: Copy[];
};

const engines: Engine[] = [
  {
    id: 'trust', label: ['Trust engine', 'আস্থার ইঞ্জিন'], icon: ShieldCheck,
    eyebrow: ['AI-POWERED TRUST ENGINE', 'এআই-চালিত আস্থার ইঞ্জিন'],
    title: ['Give every signal a reason.', 'প্রতিটি সংকেতের কারণ বুঝুন।'],
    description: ['Bring verification, response timing, and answer consistency into a reviewable summary. The proposed AI layer helps reviewers understand what needs attention and why.', 'যাচাই, উত্তর দেওয়ার সময় ও উত্তরের সামঞ্জস্য একসাথে পর্যালোচনা করুন। প্রস্তাবিত এআই স্তর পর্যালোচককে কোন বিষয়ে নজর দেওয়া দরকার এবং কেন তা বুঝতে সাহায্য করবে।'],
    points: [
      ['Explain the signal behind each flag', 'প্রতিটি চিহ্নের পেছনের কারণ দেখুন'],
      ['Keep supporting evidence beside the response', 'উত্তরের পাশে সংশ্লিষ্ট তথ্য রাখুন'],
      ['Leave the final decision with a reviewer', 'চূড়ান্ত সিদ্ধান্ত পর্যালোচকের হাতে রাখুন'],
    ],
    image: 'trust-reviewer',
    alt: ['A research operations reviewer examining a checklist at her desk.', 'ডেস্কে বসে যাচাইয়ের তালিকা দেখছেন একজন গবেষণা পর্যালোচক।'],
    summary: ['Evidence before a decision.', 'সিদ্ধান্তের আগে প্রমাণ।'],
    signals: [['Verification signal', 'যাচাইয়ের সংকেত'], ['Response context', 'উত্তরের প্রসঙ্গ'], ['Human review', 'মানুষের পর্যালোচনা']],
  },
  {
    id: 'templates', label: ['Template assistant', 'টেমপ্লেট সহকারী'], icon: WandSparkles,
    eyebrow: ['AI-ASSISTED TEMPLATES', 'এআই-সহায়তায় টেমপ্লেট'],
    title: ['Connect your research objective to each question.', 'গবেষণার লক্ষ্যের সঙ্গে প্রতিটি প্রশ্ন মিলিয়ে নিন।'],
    description: ['Turn a research objective into a suggested questionnaire. The concept assistant proposes question types, flags leading wording, and helps align Bangla and English versions before you publish.', 'গবেষণার লক্ষ্য থেকে প্রস্তাবিত প্রশ্নপত্র তৈরি করুন। এই ধারণাভিত্তিক সহকারী প্রশ্নের ধরন প্রস্তাব করবে, প্রভাবিত করতে পারে এমন ভাষা চিহ্নিত করবে এবং প্রকাশের আগে বাংলা ও ইংরেজি প্রশ্ন মেলাতে সাহায্য করবে।'],
    points: [
      ['Choose a clear recall period and response scale', 'স্পষ্ট সময়সীমা ও উত্তরের স্কেল বেছে নিন'],
      ['Make sensitive or unnecessary questions optional', 'সংবেদনশীল বা অপ্রয়োজনীয় প্রশ্ন ঐচ্ছিক রাখুন'],
      ['Edit and approve every suggestion yourself', 'প্রতিটি প্রস্তাব নিজে সম্পাদনা ও অনুমোদন করুন'],
    ],
    image: 'study-designer',
    alt: ['A researcher planning survey questions with a notebook and laptop.', 'নোটবুক ও ল্যাপটপ নিয়ে জরিপের প্রশ্ন সাজাচ্ছেন একজন গবেষক।'],
    summary: ['A thoughtful first draft.', 'সুচিন্তিত একটি প্রথম খসড়া।'],
    signals: [['Study objective', 'গবেষণার লক্ষ্য'], ['Suggested questions', 'প্রস্তাবিত প্রশ্ন'], ['Researcher edits', 'গবেষকের সম্পাদনা']],
  },
  {
    id: 'escalation', label: ['Escalation engine', 'এসকেলেশন ইঞ্জিন'], icon: GitBranch,
    eyebrow: ['AI-POWERED ESCALATION ENGINE', 'এআই-চালিত এসকেলেশন ইঞ্জিন'],
    title: ['Put the right exception in the right hands.', 'সঠিক সমস্যাটি সঠিক পর্যালোচকের কাছে পাঠান।'],
    description: ['Organize exceptions by reason, urgency, and reviewer responsibility. The proposed engine prepares a case summary and suggests a route, so reviewers can resolve the issue with its full context.', 'কারণ, জরুরি অবস্থা ও পর্যালোচকের দায়িত্ব অনুযায়ী সমস্যা সাজান। প্রস্তাবিত ইঞ্জিন ঘটনার সারসংক্ষেপ তৈরি করবে ও উপযুক্ত পর্যালোচক প্রস্তাব করবে, যাতে সম্পূর্ণ তথ্য নিয়ে সমাধান করা যায়।'],
    points: [
      ['Separate response issues from account-level concerns', 'উত্তরের সমস্যা ও অ্যাকাউন্টের সমস্যা আলাদা করুন'],
      ['Carry evidence and reviewer notes through the handoff', 'প্রমাণ ও পর্যালোচকের নোট একসাথে পাঠান'],
      ['Record the resolution and its reasoning', 'সমাধান ও তার কারণ সংরক্ষণ করুন'],
    ],
    image: 'trust-reviewer',
    alt: ['A research reviewer considering a case with its supporting notes.', 'সংশ্লিষ্ট নোটসহ একটি ঘটনা দেখছেন একজন গবেষণা পর্যালোচক।'],
    summary: ['A clear route to resolution.', 'সমাধানের একটি স্পষ্ট পথ।'],
    signals: [['Exception identified', 'সমস্যা চিহ্নিত'], ['Reviewer assigned', 'পর্যালোচক নির্ধারিত'], ['Resolution recorded', 'সমাধান সংরক্ষিত']],
  },
];

function EditorialPhoto({ name, alt, bn }: { name: string; alt: string; bn: boolean }) {
  return <figure className="landing-editorial-photo">
    <img src={`/images/landing/${name}-1000.webp`} srcSet={`/images/landing/${name}-600.webp 600w, /images/landing/${name}-1000.webp 1000w`} sizes="(max-width: 840px) 90vw, 45vw" width="1000" height="667" loading="lazy" decoding="async" alt={alt} />
    <figcaption>{bn ? 'এআই দিয়ে তৈরি কল্পিত দৃশ্য' : 'AI-generated illustrative scene'}</figcaption>
  </figure>;
}

export function LandingIntelligence({ bn, onResearcher, onAdmin, researcherReady, adminReady }: {
  bn: boolean; onResearcher: () => void; onAdmin: () => void; researcherReady: boolean; adminReady: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const engine = engines[selected];
  const text = (copy: Copy) => copy[bn ? 1 : 0];
  const Icon = engine.icon;
  const changeWithKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % engines.length;
    else if (event.key === 'ArrowLeft') next = (index + engines.length - 1) % engines.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = engines.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    buttons.current[next]?.focus();
  };

  return <section className="landing-intelligence" id="ai-research">
    <div className="landing-container">
      <div className="landing-section-heading" data-reveal>
        <div><p className="landing-eyebrow">{text(['AI ASSISTANCE FOR RESEARCH TEAMS', 'গবেষণা দলের জন্য এআইয়ের সহায়তা'])}</p><h2>{text(['Support the method.', 'গবেষণার পদ্ধতিতে সহায়তা।'])}<em>{text(['Retain the researcher’s judgment.', 'সিদ্ধান্তে গবেষকের বিবেচনা।'])}</em></h2></div>
        <p>{text(['Explore how AI could support study design, trust checks, and exception handling—while keeping people responsible for the outcome.', 'গবেষণা সাজানো, আস্থার যাচাই ও সমস্যা সমাধানে এআই কীভাবে সহায়তা করতে পারে তা দেখুন—ফলাফলের দায়িত্ব থাকবে মানুষের হাতে।'])}</p>
      </div>
      <div className="landing-concept-note" data-reveal><Sparkles size={17} /><p><strong>{text(['AI concept preview', 'এআই ধারণার প্রিভিউ'])}</strong>{text(['These AI capabilities are proposed. The current demo uses curated templates, simulated checks, and human review.', 'এই এআই সুবিধাগুলো প্রস্তাবিত। বর্তমান ডেমোতে প্রস্তুত টেমপ্লেট, অনুকৃত যাচাই ও মানুষের পর্যালোচনা রয়েছে।'])}</p></div>
      <div className="landing-engine-tabs" role="tablist" aria-label={text(['Explore AI capabilities', 'এআইয়ের সুবিধাগুলো দেখুন'])} data-reveal>
        {engines.map((item, index) => { const TabIcon = item.icon; return <button type="button" key={item.id} ref={(element) => { buttons.current[index] = element; }} id={`engine-tab-${item.id}`} role="tab" aria-selected={index === selected} aria-controls={`engine-panel-${item.id}`} tabIndex={index === selected ? 0 : -1} onClick={() => setSelected(index)} onKeyDown={(event) => changeWithKey(event, index)}><TabIcon size={18} /><span>{text(item.label)}</span><ArrowUpRight size={15} /></button>; })}
      </div>
      <div className="landing-engine-panel" role="tabpanel" id={`engine-panel-${engine.id}`} aria-labelledby={`engine-tab-${engine.id}`} tabIndex={0} key={engine.id}>
        <div className="landing-engine-panel__copy"><span className="landing-engine-panel__icon"><Icon size={24} strokeWidth={1.5} /></span><p className="landing-eyebrow">{text(engine.eyebrow)}</p><h3>{text(engine.title)}</h3><p>{text(engine.description)}</p><ul>{engine.points.map((point) => <li key={point[0]}><Check size={16} /><span>{text(point)}</span></li>)}</ul>
          <Button variant="secondary" disabled={engine.id === 'escalation' ? !adminReady : !researcherReady} onClick={engine.id === 'escalation' ? onAdmin : onResearcher}>{text(engine.id === 'templates' ? ['Try the curated templates', 'প্রস্তুত টেমপ্লেট দেখুন'] : engine.id === 'escalation' ? ['Explore the review inbox', 'পর্যালোচনা ইনবক্স দেখুন'] : ['Explore response review', 'উত্তরের পর্যালোচনা দেখুন'])}<ArrowUpRight size={16} /></Button>
        </div>
        <div className="landing-engine-panel__visual"><EditorialPhoto name={engine.image} alt={text(engine.alt)} bn={bn} /><div className="landing-engine-summary"><span className="landing-engine-summary__tag">{text(['ILLUSTRATIVE WORKFLOW', 'নমুনা কার্যপ্রবাহ'])}</span><strong>{text(engine.summary)}</strong><ol>{engine.signals.map((signal, index) => <li key={signal[0]}><span>0{index + 1}</span>{text(signal)}</li>)}</ol></div></div>
      </div>
    </div>
  </section>;
}

const dataStages: { icon: LucideIcon; title: Copy; description: Copy }[] = [
  { icon: FileCheck2, title: ['Validate the structure', 'তথ্যের গঠন যাচাই'], description: ['Check expected fields, answer types, and missing values before a dataset moves forward.', 'ডেটাসেট পরবর্তী ধাপে যাওয়ার আগে প্রয়োজনীয় ঘর, উত্তরের ধরন ও অনুপস্থিত তথ্য যাচাই করুন।'] },
  { icon: ScanLine, title: ['Sanitize with context', 'প্রসঙ্গ বুঝে তথ্য পরিশোধন'], description: ['Propose consistent formats and flag possible personal details for review. Keep the original response available.', 'তথ্যের সামঞ্জস্যপূর্ণ বিন্যাস প্রস্তাব করুন এবং ব্যক্তিগত তথ্য থাকতে পারে এমন অংশ পর্যালোচনার জন্য চিহ্নিত করুন। মূল উত্তর সংরক্ষণ করুন।'] },
  { icon: GitBranch, title: ['Track every transformation', 'প্রতিটি পরিবর্তনের হিসাব'], description: ['Attach a reason and a source to each change so engineers and reviewers can trace it back.', 'প্রতিটি পরিবর্তনের কারণ ও উৎস রাখুন, যাতে প্রকৌশলী ও পর্যালোচক মূল তথ্য খুঁজে পান।'] },
  { icon: Database, title: ['Prepare for analysis', 'বিশ্লেষণের জন্য প্রস্তুতি'], description: ['Carry review status, geography, and study context into an analysis-ready dataset.', 'পর্যালোচনার অবস্থা, এলাকা ও গবেষণার প্রসঙ্গসহ বিশ্লেষণের উপযোগী ডেটাসেট তৈরি করুন।'] },
];

export function LandingDataQuality({ bn, onResearcher, researcherReady }: { bn: boolean; onResearcher: () => void; researcherReady: boolean }) {
  const text = (copy: Copy) => copy[bn ? 1 : 0];
  return <section className="landing-data-quality" id="data-quality"><div className="landing-container">
    <div className="landing-data-quality__intro" data-reveal><div><p className="landing-eyebrow">{text(['FOR DATA ENGINEERS & ANALYTICS TEAMS', 'ডেটা প্রকৌশলী ও বিশ্লেষক দলের জন্য'])}</p><h2>{text(['Make data useful.', 'তথ্যকে কাজে লাগান।'])}<em>{text(['Keep its story intact.', 'তার প্রসঙ্গ অটুট রাখুন।'])}</em></h2></div><p>{text(['Reliable analysis starts before the chart. Give your team a clear path from raw responses to consistent data, with a record of what changed and why.', 'নির্ভরযোগ্য বিশ্লেষণ শুরু হয় চার্টের আগে। মূল উত্তর থেকে সামঞ্জস্যপূর্ণ তথ্য পর্যন্ত প্রতিটি ধাপ স্পষ্ট করুন, কী বদলেছে এবং কেন তার হিসাব রাখুন।'])}</p></div>
    <div className="landing-data-quality__body"><div className="landing-data-quality__visual" data-reveal><EditorialPhoto name="data-engineers" alt={text(['Two data engineers discussing a visualization at their workstation.', 'নিজেদের কর্মক্ষেত্রে তথ্যের চার্ট নিয়ে আলোচনা করছেন দুই ডেটা প্রকৌশলী।'])} bn={bn} /><div className="landing-data-sample"><div><span>{text(['SANITIZATION CONCEPT', 'তথ্য পরিশোধনের ধারণা'])}</span><span className="landing-mini-badge">{text(['Preview', 'প্রিভিউ'])}</span></div><strong>{text(['Consistent formats. Traceable changes.', 'সামঞ্জস্যপূর্ণ বিন্যাস। পরিবর্তনের হিসাব।'])}</strong><div className="landing-data-sample__row"><span>{text(['Original location', 'মূল এলাকার নাম'])}<code> dhaka </code></span><ArrowRight size={17} /><span>{text(['Suggested format', 'প্রস্তাবিত বিন্যাস'])}<code>Dhaka</code></span></div><p><ShieldCheck size={14} />{text(['Illustrative transformation · Original retained', 'নমুনা পরিবর্তন · মূল তথ্য সংরক্ষিত'])}</p></div></div>
      <div className="landing-data-quality__copy" data-reveal><p className="landing-data-quality__preview"><Sparkles size={15} />{text(['Proposed data preparation workflow', 'প্রস্তাবিত তথ্য প্রস্তুতির কার্যপ্রবাহ'])}</p><ol className="landing-data-stages">{dataStages.map(({ icon: Icon, title, description }, index) => <li key={title[0]}><span className="landing-data-stages__icon"><Icon size={20} strokeWidth={1.5} /></span><div><span className="landing-data-stages__number">0{index + 1}</span><h3>{text(title)}</h3><p>{text(description)}</p></div></li>)}</ol></div>
    </div>
    <div className="landing-analytics-bridge" data-reveal><div><span className="landing-analytics-bridge__label">{text(['EXPLORE IN THE DEMO TODAY', 'বর্তমান ডেমোতে দেখুন'])}</span><h3>{text(['From a dataset to a clearer picture.', 'ডেটাসেট থেকে আরও পরিষ্কার ধারণা।'])}</h3><p>{text(['Explore regional maps, topic heatmaps, daily response trends, and the review-to-reward journey. Filter by location, topic, and date, or export a study’s response details.', 'এলাকার মানচিত্র, বিষয়ভিত্তিক হিটম্যাপ, দৈনিক উত্তরের প্রবণতা ও পর্যালোচনা থেকে পুরস্কারের অগ্রগতি দেখুন। এলাকা, বিষয় ও তারিখ অনুযায়ী বাছাই করুন অথবা গবেষণার উত্তর ডাউনলোড করুন।'])}</p></div><Button variant="secondary" disabled={!researcherReady} onClick={onResearcher}>{text(['Explore audience & insights', 'অংশগ্রহণ ও বিশ্লেষণ দেখুন'])}<ArrowUpRight size={17} /></Button></div>
  </div></section>;
}

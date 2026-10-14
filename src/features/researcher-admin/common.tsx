import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Activity, ArrowUpRight, BadgeCheck, BookOpenCheck, CircleHelp, House, LayoutDashboard, ShieldCheck } from 'lucide-react';
import type { DemoUser, SurveyStatus } from '../../../shared/contracts';
import { Badge, Button } from '../../shared/ui';

export type Locale = 'en' | 'bn';
export function t(locale: Locale, en: string, bn: string) { return locale === 'bn' ? bn : en; }
export function useFeatureLocale(user?: DemoUser | null) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const global = sessionStorage.getItem('jonomot:language');
    if (global === 'bn' || global === 'en') return global;
    const saved = sessionStorage.getItem('jonomot:researcher-admin-locale');
    return saved === 'bn' || saved === 'en' ? saved : user?.preferredLanguage ?? 'en';
  });
  useEffect(() => {
    const onLanguage = (event: Event) => {
      const next = (event as CustomEvent<Locale>).detail;
      if (next === 'en' || next === 'bn') { sessionStorage.setItem('jonomot:researcher-admin-locale', next); setLocaleState(next); }
    };
    window.addEventListener('jonomot:language', onLanguage);
    return () => window.removeEventListener('jonomot:language', onLanguage);
  }, []);
  useEffect(() => {
    if (sessionStorage.getItem('jonomot:language') === null && user?.preferredLanguage) {
      sessionStorage.setItem('jonomot:language', user.preferredLanguage);
      sessionStorage.setItem('jonomot:researcher-admin-locale', user.preferredLanguage);
      setLocaleState(user.preferredLanguage);
      window.dispatchEvent(new CustomEvent('jonomot:language', { detail: user.preferredLanguage }));
    }
  }, [user?.id, user?.preferredLanguage]);
  const setLocale = (next: Locale) => {
    sessionStorage.setItem('jonomot:language', next);
    sessionStorage.setItem('jonomot:researcher-admin-locale', next);
    sessionStorage.setItem('jonomot:respondent-language', next);
    setLocaleState(next);
    window.dispatchEvent(new CustomEvent('jonomot:language', { detail: next }));
  };
  return { locale, setLocale };
}

export function money(paisa: number, locale: Locale = 'en') {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((paisa || 0) / 100);
}
export function shortMoney(paisa: number, locale: Locale = 'en') {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format((paisa || 0) / 100);
}
export function dateTime(value: string | undefined, locale: Locale = 'en') {
  if (!value) return t(locale, 'Not recorded', 'রেকর্ড নেই');
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return t(locale, 'Not recorded', 'রেকর্ড নেই');
  return new Intl.DateTimeFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
export function relativeLabel(value: string | undefined, locale: Locale = 'en') {
  if (!value) return t(locale, 'No date', 'তারিখ নেই');
  return dateTime(value, locale);
}
export function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (['Active', 'Published', 'Approved', 'Paid', 'Passed'].includes(status)) return 'success';
  if (['UnderReview', 'Submitted', 'UnderReview', 'Pending', 'Processing'].includes(status)) return 'warning';
  if (['Rejected', 'Failed', 'Flagged'].includes(status)) return 'danger';
  if (['Draft', 'NotStarted', 'Paused', 'Closed', 'Archived'].includes(status)) return 'neutral';
  return 'info';
}
export function prettyStatus(status: string, locale: Locale = 'en') {
  const labels: Record<string, [string, string]> = {
    Draft: ['Draft', 'খসড়া'], UnderReview: ['Under review', 'পর্যালোচনাধীন'], Published: ['Published', 'অনুমোদিত'], Active: ['Active', 'চালু'],
    Paused: ['Paused', 'বিরতি'], Closed: ['Closed', 'বন্ধ'], Archived: ['Archived', 'সংরক্ষিত'], Submitted: ['Submitted', 'জমা হয়েছে'],
    Approved: ['Approved', 'অনুমোদিত'], Rejected: ['Rejected', 'প্রত্যাখ্যাত'], Pending: ['Pending', 'অপেক্ষমাণ'], Passed: ['Passed', 'পাস'],
    Flagged: ['Flagged', 'চিহ্নিত'], Processing: ['Processing', 'প্রক্রিয়াধীন'], Failed: ['Failed', 'ব্যর্থ'], Paid: ['Paid', 'পরিশোধিত'], NotStarted: ['Not started', 'শুরু হয়নি'],
  };
  return labels[status]?.[locale === 'bn' ? 1 : 0] ?? status.replaceAll('_', ' ');
}
export function SurveyStatusBadge({ status, locale }: { status: SurveyStatus; locale: Locale }) {
  return <Badge tone={statusTone(status)}>{prettyStatus(status, locale)}</Badge>;
}

export function WorkspaceShell({
  children, user, locale, title, description, eyebrow, actions, active,
}: {
  children: ReactNode; user: DemoUser | null; locale: Locale; onLocale: (locale: Locale) => void;
  title: string; description?: string; eyebrow?: string; actions?: ReactNode; active: 'researcher' | 'admin';
}) {
  const navText = {
    workspace: active === 'admin' ? t(locale, 'Review workspace', 'পর্যালোচনা কর্মক্ষেত্র') : t(locale, 'Research workspace', 'গবেষণা কর্মক্ষেত্র'),
    surveys: t(locale, 'Surveys', 'জরিপ'), reviews: t(locale, 'Review inbox', 'পর্যালোচনা ইনবক্স'),
    help: t(locale, 'Demo help', 'ডেমো সহায়তা'),
  };
  return (
    <div className="desktop-workspace" lang={locale === 'bn' ? 'bn' : 'en'}>
      <aside className="desktop-sidebar">
        <Link to="/" className="desktop-brand" aria-label="Jonomot home">
          <span className="desktop-brand__mark" aria-hidden="true"><img src="/brand/jonomot-mark.svg" alt="" /></span>
          <span><strong>jonomot</strong><small>Research, with people</small></span>
        </Link>
        <div className="desktop-sidebar__section-label">{navText.workspace}</div>
        <nav className="desktop-nav" aria-label={navText.workspace}>
          <NavLink to="/" className="desktop-nav__link"><House size={18} aria-hidden="true" /><span>{t(locale, 'Jonomot overview', 'জনমত পরিচিতি')}</span><ArrowUpRight className="desktop-nav__arrow" size={15} aria-hidden="true" /></NavLink>
          {active === 'researcher' && <NavLink to="/researcher" end className={({ isActive }) => `desktop-nav__link ${isActive ? 'is-active' : ''}`}>
            <LayoutDashboard size={18} aria-hidden="true" /><span>{navText.surveys}</span><ArrowUpRight className="desktop-nav__arrow" size={15} aria-hidden="true" />
          </NavLink>}
          {active === 'admin' && <NavLink to="/admin/reviews" className={({ isActive }) => `desktop-nav__link ${isActive ? 'is-active' : ''}`}>
            <BookOpenCheck size={18} aria-hidden="true" /><span>{navText.reviews}</span><ArrowUpRight className="desktop-nav__arrow" size={15} aria-hidden="true" />
          </NavLink>}
        </nav>
        <div className="desktop-sidebar__bottom">
          <div className="desktop-help-card">
            <span className="desktop-help-card__icon"><CircleHelp size={17} aria-hidden="true" /></span>
            <strong>{navText.help}</strong>
            <p>{t(locale, 'Switch personas to explore the whole journey. Checks and rewards are simulated; archived examples are clearly marked.', 'সম্পূর্ণ যাত্রা দেখতে পরিচয় বদলান। যাচাই ও পুরস্কার অনুকরণভিত্তিক; সংরক্ষিত উদাহরণ আলাদা করে চিহ্নিত।')}</p>
          </div>
          <div className="desktop-persona">
            <span className="desktop-persona__avatar">{user?.name?.slice(0, 1) ?? 'J'}</span>
            <span className="desktop-persona__details"><strong>{user?.name ?? t(locale, 'Choose a persona', 'একটি পরিচয় বেছে নিন')}</strong><small>{user?.role ?? t(locale, 'Local demo', 'স্থানীয় ডেমো')}</small></span>
            {user?.verified && <BadgeCheck size={16} className="desktop-persona__verified" aria-label={t(locale, 'Verified persona', 'যাচাইকৃত পরিচয়')} />}
          </div>
        </div>
      </aside>

      <main className="desktop-main">
        <header className="desktop-topbar">
          <div className="desktop-topbar__context"><span className="desktop-live-dot" /><span>{t(locale, 'LOCAL DEMO', 'স্থানীয় ডেমো')}</span><span className="desktop-topbar__divider">/</span><span>{t(locale, 'Simulated verification & payments', 'অনুকৃত যাচাই ও পেমেন্ট')}</span></div>
          <div className="desktop-topbar__tools">
            <span className="desktop-persona-chip"><ShieldCheck size={15} aria-hidden="true" />{user?.role ?? t(locale, 'No persona', 'পরিচয় নেই')}</span>
          </div>
        </header>

        <div className="desktop-content">
          <div className="desktop-page-heading">
            <div>
              <p className="desktop-eyebrow">{eyebrow ?? (active === 'admin' ? t(locale, 'ADMINISTRATION', 'প্রশাসন') : t(locale, 'RESEARCH STUDIO', 'গবেষণা স্টুডিও'))}</p>
              <h1>{title}</h1>
              {description && <p className="desktop-page-heading__description">{description}</p>}
            </div>
            {actions && <div className="desktop-page-heading__actions">{actions}</div>}
          </div>
          {children}
        </div>
        <footer className="desktop-footer"><span><Activity size={14} aria-hidden="true" /> {t(locale, 'Research with people · Times shown in Dhaka time', 'মানুষকে নিয়ে গবেষণা · ঢাকার সময় অনুযায়ী')}</span><span>Jonomot <span aria-hidden="true">·</span> 2026</span></footer>
      </main>
    </div>
  );
}

export function RoleNotice({ role, locale, user }: { role: 'researcher' | 'admin'; locale: Locale; user: DemoUser | null }) {
  return (
    <div className="desktop-role-notice" role="alert">
      <div className="desktop-role-notice__icon"><ShieldCheck size={22} aria-hidden="true" /></div>
      <div><strong>{user ? t(locale, 'This workspace is for the right persona.', 'এই কর্মক্ষেত্রটি সঠিক পরিচয়ের জন্য।') : t(locale, 'Choose a demo persona to continue.', 'চালিয়ে যেতে একটি ডেমো পরিচয় বেছে নিন।')}</strong><p>{user ? t(locale, `You are signed in as ${user.role}. Switch to a ${role} persona from the launcher.`, `আপনি ${user.role} পরিচয়ে আছেন। লঞ্চার থেকে ${role} পরিচয়ে যান।`) : t(locale, `Open the launcher and choose ${role}.`, `লঞ্চার খুলে ${role} বেছে নিন।`)}</p><Link to="/">{t(locale, 'Go to persona launcher', 'পরিচয় লঞ্চারে যান')} →</Link></div>
    </div>
  );
}

export function PageLoading({ locale, label }: { locale: Locale; label?: string }) {
  return <div className="desktop-loading" role="status"><span className="desktop-loading__spinner" /><span>{label ?? t(locale, 'Loading workspace…', 'কর্মক্ষেত্র লোড হচ্ছে…')}</span></div>;
}

export function ErrorNotice({ message, locale, onRetry }: { message: string; locale: Locale; onRetry?: () => void }) {
  return <div className="desktop-error" role="alert"><strong>{t(locale, 'Something needs attention', 'একটি সমস্যা হয়েছে')}</strong><p>{message}</p>{onRetry && <Button variant="secondary" onClick={onRetry}>{t(locale, 'Try again', 'আবার চেষ্টা করুন')}</Button>}</div>;
}


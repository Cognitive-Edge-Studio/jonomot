import { useEffect, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { LoaderCircle, X } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
}

export function Button({ variant = 'primary', loading = false, disabled, children, className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`ui-button ui-button--${variant} ${className}`.trim()}
      data-variant={variant}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <><LoaderCircle className="ui-button__spinner" aria-hidden="true" /> <span>{children}</span></> : children}
    </button>
  );
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`ui-card ${className}`.trim()} />;
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({ tone = 'neutral', className = '', ...props }: BadgeProps) {
  return <span {...props} className={`ui-badge ui-badge--${tone} ${className}`.trim()} data-tone={tone} />;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ui-input ${className}`.trim()} />;
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`ui-select ${className}`.trim()} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`ui-textarea ${className}`.trim()} />;
}

interface OverlayProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

function Overlay({ open, title, onClose, children, footer, variant }: OverlayProps & { variant: 'modal' | 'drawer' }) {
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const panel = panelRef.current;
    const focusable = panel?.querySelector<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])');
    (focusable ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
        .filter((item) => item.getAttribute('aria-hidden') !== 'true');
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;
  const Panel = variant === 'modal' ? 'section' : 'aside';
  return (
    <div
      className={`ui-overlay ui-overlay--${variant}`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <Panel ref={panelRef as never} role="dialog" aria-modal="true" aria-labelledby="ui-overlay-title" className={`ui-overlay__panel ui-overlay__panel--${variant}`} tabIndex={-1}>
        <header className="ui-overlay__header">
          <div><p className="ui-eyebrow">Jonomot workspace</p><h2 id="ui-overlay-title">{title}</h2></div>
          <button type="button" className="ui-icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        <div className="ui-overlay__content">{children}</div>
        {footer && <footer className="ui-overlay__footer">{footer}</footer>}
      </Panel>
    </div>
  );
}

export function Modal(props: OverlayProps) {
  return <Overlay {...props} variant="modal" />;
}

export function Drawer(props: OverlayProps) {
  return <Overlay {...props} variant="drawer" />;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="ui-empty-state">
      <span className="ui-empty-state__mark" aria-hidden="true">J</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </section>
  );
}

export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" {...props} className={`ui-skeleton ${className}`.trim()} />;
}

import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Check, CircleAlert, CircleCheck, Eye, EyeOff, Info, LoaderCircle } from 'lucide-react';
import { ApiError, Logo, fabConfig, useAuth } from '@/lib/fab-client';
import { cn } from '@/lib/utils';
import { AUTH } from './config';
import { useAuthText, type AuthKey } from './strings';
import './auth.css';
import './tokens.css';

/**
 * The pieces every sign-in screen is built from. The twelve layouts change where things sit and how the page feels;
 * the fields, states, errors and accessibility below are the same in all of them, so they are right once.
 */

export type ProfileField = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

/** `fine` pointer = mouse or trackpad. Autofocus only there: on a phone it opens the keyboard over the layout. */
export function useFinePointer() {
  // Read at the FIRST render: `autoFocus` only acts when the input mounts, so a value that turns true in an effect
  // arrives too late and the field never takes focus. The app is a client-side SPA, so `window` is there.
  const [fine] = React.useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: fine)').matches
  );
  return fine;
}

/** True while a media query matches; used to avoid downloading a photo a phone will never show. */
export function useMedia(query: string) {
  const [match, setMatch] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, [query]);
  return match;
}

/** Where to go after signing in: back to the protected page that sent the person here, else the app's home. */
export function useAfterAuth(): string {
  const location = useLocation();
  const state = location.state as { from?: { pathname?: string; search?: string } | string } | null;
  const from =
    typeof state?.from === 'string'
      ? state.from
      : state?.from?.pathname
        ? `${state.from.pathname}${state.from.search ?? ''}`
        : '';
  const query = new URLSearchParams(location.search).get('redirect') || '';
  const target = from || query;
  // Only same-app paths: a `?redirect=https://…` must never turn the sign-in page into an open redirect.
  if (
    target &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !/^\/(login|signup|forgot-password|reset-password)\b/.test(target)
  )
    return target;
  return AUTH.home || '/';
}

/**
 * The brand's name for copy like "Sign in to your {app} account". A plan often titles the app with a descriptor
 * ("Studio Aurora - Online booking"); the sign-in screens speak the brand, so only the part before the separator.
 */
export function useAppName(): string {
  const full = (fabConfig.logoName || '').trim();
  const brand = full.split(/\s+[—–|:-]\s+/)[0].trim();
  return brand.length >= 2 ? brand : full;
}

/** Turns any failure into words a person can act on. `kind` picks the message for a wrong-credentials answer. */
export function useErrorText() {
  const t = useAuthText();
  return (err: unknown, kind: 'credentials' | 'signup' | 'code' | 'generic' = 'generic'): string => {
    if (err instanceof ApiError) {
      if (err.status === 429) return t('error.rate');
      if (kind === 'credentials' && (err.status === 400 || err.status === 401)) return t('error.credentials');
      if (kind === 'code' && (err.status === 400 || err.status === 401)) return t('error.codeInvalid');
      if (kind === 'signup' && err.status === 409) return t('error.emailTaken');
      if (err.status >= 500) return t('error.generic');
      // A 4xx the server explained (a policy, a paused app, an unverified account): its own words are the most precise.
      if (err.message && err.message.length < 220) return err.message;
      return t('error.generic');
    }
    if (err instanceof TypeError) return t('error.network');
    return t('error.generic');
  };
}

export function normalizeEmail(raw: string): string {
  const v = raw.trim();
  const at = v.lastIndexOf('@');
  return at > 0 ? v.slice(0, at) + '@' + v.slice(at + 1).toLowerCase() : v;
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/** Seconds left before "send again" is allowed. `start()` restarts the countdown. */
export function useCooldown(seconds = 45) {
  const [left, setLeft] = React.useState(0);
  React.useEffect(() => {
    if (left <= 0) return;
    const id = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [left]);
  return { left, start: () => setLeft(seconds) };
}

// ---------------------------------------------------------------------------------------------------------------

/** One field: the label above, the control, then the error (or the hint) linked by `aria-describedby`. */
export function AuthField({
  id,
  label,
  error,
  hint,
  optional,
  children,
  className,
}: {
  id: string;
  label: React.ReactNode;
  error?: string | null;
  hint?: React.ReactNode;
  optional?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
  className?: string;
}) {
  const t = useAuthText();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const described =
    [error ? errorId : null, hint && !error ? hintId : null, children.props['aria-describedby'] as string | undefined]
      .filter(Boolean)
      .join(' ') || undefined;
  const control = React.cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': described,
  });
  return (
    <div className={cn('auth-field grid gap-1.5', className)}>
      <label htmlFor={id} className="auth-label text-sm font-medium text-foreground">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">({t('common.optional')})</span> : null}
      </label>
      {control}
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-[13px] leading-5 text-destructive">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <div id={hintId} className="text-[13px] leading-5 text-muted-foreground">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

export const inputClass =
  'auth-input h-12 w-full min-w-0 rounded-[var(--auth-radius-control)] border border-input bg-background px-3 text-base text-foreground caret-primary ' +
  'placeholder:text-muted-foreground/80 transition-[border-color,box-shadow] duration-200 hover:border-foreground/30 ' +
  'focus-visible:outline-none focus-visible:border-ring aria-[invalid=true]:border-destructive disabled:opacity-60 md:h-11 md:text-sm';

export const AuthInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(function AuthInput(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />;
});

/** A password input with the show/hide toggle and a Caps Lock warning. The caret survives the toggle. */
export const PasswordInput = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(function PasswordInput(
  { className, onKeyUp, ...props },
  outerRef
) {
  const t = useAuthText();
  const [shown, setShown] = React.useState(false);
  const [caps, setCaps] = React.useState(false);
  const inner = React.useRef<HTMLInputElement | null>(null);
  const setRefs = (el: HTMLInputElement | null) => {
    inner.current = el;
    if (typeof outerRef === 'function') outerRef(el);
    else if (outerRef) outerRef.current = el;
  };
  const toggle = () => {
    const el = inner.current;
    const start = el?.selectionStart ?? null;
    const end = el?.selectionEnd ?? null;
    setShown((s) => !s);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      if (start !== null && end !== null) el.setSelectionRange(start, end);
    });
  };
  return (
    <div className="grid gap-1">
      <div className="relative">
        <input
          ref={setRefs}
          type={shown ? 'text' : 'password'}
          spellCheck={false}
          autoCapitalize="none"
          className={cn(inputClass, 'pr-12', className)}
          onKeyUp={(e) => {
            setCaps(!!e.getModifierState?.('CapsLock'));
            onKeyUp?.(e);
          }}
          {...props}
        />
        <button
          type="button"
          onClick={toggle}
          aria-pressed={shown}
          aria-label={shown ? t('common.hide') : t('common.show')}
          className="auth-eye absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[var(--auth-radius-control)] text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="relative block size-[18px]">
            <Eye
              className={cn(
                'absolute inset-0 size-[18px] transition-[opacity,transform] duration-150',
                shown ? 'scale-75 opacity-0' : 'opacity-100'
              )}
              aria-hidden
            />
            <EyeOff
              className={cn(
                'absolute inset-0 size-[18px] transition-[opacity,transform] duration-150',
                shown ? 'opacity-100' : 'scale-75 opacity-0'
              )}
              aria-hidden
            />
          </span>
        </button>
      </div>
      {caps ? (
        <p className="text-[13px] text-foreground/80" role="status">
          {t('common.capsLock')}
        </p>
      ) : null}
    </div>
  );
});

/** The length rule, shown BEFORE typing and ticked as it is met. Never red while the person is still typing. */
export function PasswordRules({ id, value, min }: { id: string; value: string; min: number }) {
  const t = useAuthText();
  const met = value.length >= min;
  return (
    <ul id={id} className="grid gap-1 text-[13px]">
      <li className={cn('flex items-center gap-2', met ? 'text-foreground' : 'text-muted-foreground')}>
        <span
          className={cn(
            'grid size-4 place-items-center rounded-full border',
            met ? 'border-transparent bg-success/15 text-success' : 'border-border'
          )}
        >
          {met ? <Check className="auth-tick size-3" strokeWidth={3} aria-hidden /> : null}
        </span>
        {t('rules.min', { n: min })}
      </li>
    </ul>
  );
}

/**
 * The submit button: enabled until the request starts; then busy, with the spinner appearing only after 150ms and
 * staying at least 400ms, so a fast answer does not flicker. The label never changes width.
 */
export function SubmitButton({
  busy,
  children,
  busyLabel,
  className,
  ...props
}: {
  busy: boolean;
  busyLabel?: string;
  children: React.ReactNode;
} & React.ComponentProps<'button'>) {
  const [spin, setSpin] = React.useState(false);
  const shownAt = React.useRef(0);
  React.useEffect(() => {
    if (busy) {
      const id = window.setTimeout(() => {
        setSpin(true);
        shownAt.current = Date.now();
      }, 150);
      return () => window.clearTimeout(id);
    }
    if (!spin) return;
    const wait = Math.max(0, 400 - (Date.now() - shownAt.current));
    const id = window.setTimeout(() => setSpin(false), wait);
    return () => window.clearTimeout(id);
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy || undefined}
        className={cn(
          'auth-btn relative inline-flex h-12 w-full items-center justify-center gap-2 rounded-[var(--auth-radius-button)] bg-primary shadow-[var(--auth-button-shadow)] px-5 text-base font-semibold text-primary-foreground',
          'transition-[transform,box-shadow] duration-150 hover:bg-primary/90 active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-progress md:h-11 md:text-sm',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'auth-spin inline-flex transition-[opacity,transform,width] duration-150',
            spin ? 'w-4 opacity-100' : 'w-0 -translate-x-1 opacity-0'
          )}
          aria-hidden
        >
          <LoaderCircle className="size-4 animate-spin" />
        </span>
        <span>{children}</span>
        <span className="auth-arrow" aria-hidden />
      </button>
      <span className="sr-only" aria-live="polite">
        {busy && busyLabel ? busyLabel : ''}
      </span>
    </>
  );
}

/** A notice inside the form. Errors are `role=alert` (read at once); success and info are polite. */
export function AuthNotice({
  tone,
  title,
  children,
  className,
}: {
  tone: 'error' | 'success' | 'info';
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const Icon = tone === 'error' ? CircleAlert : tone === 'success' ? CircleCheck : Info;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'auth-notice flex gap-3 rounded-[var(--auth-radius-control)] border p-3 text-sm',
        tone === 'error' && 'auth-nudge border-destructive/40 bg-destructive/5 text-foreground',
        tone === 'success' && 'border-success/40 bg-success/10 text-foreground',
        tone === 'info' && 'border-border bg-muted text-foreground',
        className
      )}
    >
      <Icon
        className={cn(
          'mt-0.5 size-4 shrink-0',
          tone === 'error' ? 'text-destructive' : tone === 'success' ? 'text-success' : 'text-muted-foreground'
        )}
        aria-hidden
      />
      <div className="grid gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? (
          <div className="text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">{children}</div>
        ) : null}
      </div>
    </div>
  );
}

export function OrDivider() {
  const t = useAuthText();
  return (
    <div className="auth-divider flex items-center gap-3" role="separator" aria-label={t('common.or')}>
      <span className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground" aria-hidden>
        {t('common.or')}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** A standalone text link with a hit area of at least 44px, without moving the text. */
export function TextLink({ to, children, className }: { to: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      to={to}
      className={cn(
        'auth-link -my-2 inline-flex items-center py-2 font-medium text-primary-text underline-offset-4 hover:underline',
        'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {children}
    </Link>
  );
}

// ---- Social sign-in --------------------------------------------------------------------------------------------

const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google',
  apple: 'Apple',
  microsoft: 'Microsoft',
  facebook: 'Facebook',
  github: 'GitHub',
  discord: 'Discord',
};

/** Google's standard "G". Its colours are fixed by Google's branding rules and are the only fixed colours in the kit. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-[18px]" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function ProviderMark({ provider }: { provider: string }) {
  if (provider === 'google') return <GoogleMark />;
  if (provider === 'apple')
    return (
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
        <path d="M16.37 12.6c-.03-2.6 2.13-3.86 2.22-3.92-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.95-3.94.95-.82 0-2.07-.93-3.4-.9-1.75.03-3.37 1.02-4.27 2.58-1.82 3.16-.47 7.83 1.31 10.4.87 1.25 1.9 2.66 3.26 2.61 1.31-.05 1.8-.85 3.38-.85 1.57 0 2.02.85 3.4.82 1.41-.02 2.3-1.27 3.15-2.53.99-1.45 1.4-2.86 1.42-2.93-.03-.01-2.73-1.05-2.76-4.19zM13.78 4.95c.72-.88 1.21-2.09 1.08-3.3-1.04.04-2.3.69-3.04 1.57-.67.77-1.25 2.01-1.1 3.2 1.16.09 2.34-.59 3.06-1.47z" />
      </svg>
    );
  if (provider === 'microsoft')
    return (
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
        <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
        <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
        <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
      </svg>
    );
  if (provider === 'github')
    return (
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5z" />
      </svg>
    );
  return (
    <span className="font-display text-sm font-bold" aria-hidden>
      {(PROVIDER_NAMES[provider] ?? provider).slice(0, 1)}
    </span>
  );
}

/** The owner's enabled providers, same height and radius as the form, logo left and text centered. */
export function ProviderButtons({ className }: { className?: string }) {
  const { loginWithProvider } = useAuth();
  const t = useAuthText();
  const [pending, setPending] = React.useState<string | null>(null);
  // Inside a frame (the Studio's preview) the provider opens in a NEW TAB and this page stays: without a way back
  // the buttons would stay disabled for good.
  React.useEffect(() => {
    if (!pending) return;
    const id = window.setTimeout(() => setPending(null), 6000);
    return () => window.clearTimeout(id);
  }, [pending]);
  const providers = AUTH.providers.filter((p) => p in PROVIDER_NAMES);
  if (!providers.length) return null;
  // Apple first when it is offered (store review expects it to be at least as prominent as the others).
  const ordered = [...providers].sort((a, b) => (a === 'apple' ? -1 : b === 'apple' ? 1 : 0));
  return (
    <div className={cn('grid gap-2.5', className)}>
      {ordered.map((p) => (
        <button
          key={p}
          type="button"
          disabled={pending !== null}
          aria-busy={pending === p || undefined}
          onClick={() => {
            setPending(p);
            loginWithProvider(p, window.location.origin + currentPath());
          }}
          className={cn(
            'auth-provider relative inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[var(--auth-radius-button)] border px-3 text-sm font-medium md:h-11',
            'transition-transform duration-150 active:scale-[0.98] disabled:opacity-70',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            p === 'google'
              ? 'auth-google'
              : p === 'apple'
                ? 'auth-apple'
                : 'border-input bg-background text-foreground hover:bg-muted'
          )}
        >
          <span className="absolute left-3 grid place-items-center">
            {pending === p ? (
              <LoaderCircle className="size-[18px] animate-spin" aria-hidden />
            ) : (
              <ProviderMark provider={p} />
            )}
          </span>
          {t('common.continueWith', { provider: PROVIDER_NAMES[p] })}
        </button>
      ))}
    </div>
  );
}

/** The path a social sign-in comes back to: the same page, so it lands where it started. */
function currentPath(): string {
  return typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
}

// ---- Signup profile fields -------------------------------------------------------------------------------------

/** One extra signup field from the app's user model, rendered by its type. */
export function ProfileInput({
  field,
  value,
  onChange,
  error,
  name,
}: {
  field: ProfileField;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string | null;
  name: string;
}) {
  const t = useAuthText();
  const id = `signup-${field.id}`;
  const type = (field.type || 'text').toLowerCase();
  const common = { name, required: field.required, placeholder: field.placeholder };
  let control: React.ReactElement<Record<string, unknown>>;
  if ((type === 'select' || type === 'enum') && field.options?.length) {
    control = (
      <select
        {...common}
        className={cn(inputClass, 'pr-3')}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t('common.select')}</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  } else if (type === 'boolean' || type === 'bool' || type === 'checkbox') {
    return (
      <label htmlFor={id} className="auth-check flex cursor-pointer items-start gap-3 py-1 text-sm">
        <input
          id={id}
          type="checkbox"
          name={name}
          className="mt-0.5 size-5 rounded border-input accent-[var(--primary)]"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          {field.label}
          {field.required ? null : <span className="ml-1 text-muted-foreground">({t('common.optional')})</span>}
        </span>
      </label>
    );
  } else if (type === 'textarea' || type === 'longtext' || type === 'richtext') {
    control = (
      <textarea
        {...common}
        rows={3}
        className={cn(inputClass, 'h-auto min-h-24 py-2.5')}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  } else {
    const htmlType =
      type === 'number' || type === 'integer'
        ? 'number'
        : type === 'date'
          ? 'date'
          : type === 'phone' || type === 'tel'
            ? 'tel'
            : type === 'email'
              ? 'email'
              : type === 'url'
                ? 'url'
                : 'text';
    const auto = htmlType === 'tel' ? 'tel' : htmlType === 'url' ? 'url' : htmlType === 'email' ? 'email' : undefined;
    control = (
      <AuthInput
        {...common}
        type={htmlType}
        inputMode={htmlType === 'tel' ? 'tel' : htmlType === 'number' ? 'decimal' : undefined}
        autoComplete={auto}
        value={String(value ?? '')}
        onChange={(e) =>
          onChange(htmlType === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)
        }
      />
    );
  }
  return (
    <AuthField id={id} label={field.label} error={error} optional={!field.required}>
      {control}
    </AuthField>
  );
}

// ---- Screen chrome ---------------------------------------------------------------------------------------------

/** The skeleton shown while the session is being read, so a signed-in person never sees the form flash. */
export function AuthLoading() {
  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-6" aria-busy="true">
      <div className="grid w-full max-w-sm gap-4">
        <div className="h-7 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-2/3 animate-pulse rounded-md bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}

/** Focus moves to the heading when a screen (or a screen's state) changes, so screen readers announce it. */
export function useHeadingFocus(dep: unknown) {
  const ref = React.useRef<HTMLHeadingElement | null>(null);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus();
  }, [dep]);
  return ref;
}

export function useDocumentTitle(screenTitle: string) {
  const app = useAppName();
  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const prev = document.title;
    document.title = app ? `${screenTitle} · ${app}` : screenTitle;
    return () => {
      document.title = prev;
    };
  }, [screenTitle, app]);
}

/** What every layout receives. The page owns the form; the frame owns where it sits and how the page feels. */
export type FrameProps = {
  /** the task, in the h1 ("Sign in", "Create your account"). */
  title: string;
  subtitle?: React.ReactNode;
  /** the form (or the state that replaced it). */
  children: React.ReactNode;
  /** the cross links under the form ("No account yet? Create an account"). */
  footer?: React.ReactNode;
  /** focus target when the screen changes state. */
  headingRef?: React.Ref<HTMLHeadingElement>;
};

/** The brand, linking home. With no logo uploaded it is the app's name as a wordmark, never an invented icon. */
export function BrandLink({
  className,
  variant = 'full',
  textClassName,
  imgClassName,
}: {
  className?: string;
  variant?: 'full' | 'mark' | 'wordmark' | 'auto';
  textClassName?: string;
  imgClassName?: string;
}) {
  const name = useAppName();
  const t = useAuthText();
  return (
    <Link
      to="/"
      aria-label={name || t('common.home')}
      className={cn(
        'auth-brand inline-flex items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <Logo
        variant={variant}
        textClassName={cn('font-display font-semibold tracking-tight', textClassName)}
        imgClassName={imgClassName}
      />
    </Link>
  );
}

/** The screen's one h1. `tabIndex=-1` lets focus land on it after a state change without adding a tab stop. */
export function AuthHeading({
  title,
  subtitle,
  headingRef,
  className,
  titleClassName,
}: {
  title: string;
  subtitle?: React.ReactNode;
  headingRef?: React.Ref<HTMLHeadingElement>;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn('grid gap-2', className)}>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className={cn(
          'auth-title text-balance font-display text-2xl text-foreground outline-none md:text-[1.75rem]',
          titleClassName
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className="auth-sub text-pretty text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

/** The column every layout puts the form in: heading, form, footer, with the house rhythm (24px between groups). */
export function FormColumn({
  title,
  subtitle,
  children,
  footer,
  headingRef,
  className,
}: FrameProps & { className?: string }) {
  return (
    <div className={cn('auth-column grid w-full max-w-sm gap-6', className)}>
      <div className="auth-rise" style={{ '--i': 1 } as React.CSSProperties}>
        <AuthHeading title={title} subtitle={subtitle} headingRef={headingRef} />
      </div>
      <div className="auth-rise grid gap-6" style={{ '--i': 2 } as React.CSSProperties}>
        {children}
      </div>
      {footer ? (
        <div
          className="auth-rise auth-footer grid gap-1 text-sm text-muted-foreground"
          style={{ '--i': 3 } as React.CSSProperties}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export type { AuthKey };

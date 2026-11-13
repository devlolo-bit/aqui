import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/fab-client';
import AuthFrame from '@/auth/AuthFrame';
import { AUTH } from '@/auth/config';
import {
  AuthField,
  AuthInput,
  AuthLoading,
  AuthNotice,
  OrDivider,
  PasswordInput,
  PasswordRules,
  ProfileInput,
  ProviderButtons,
  SubmitButton,
  TextLink,
  isEmail,
  normalizeEmail,
  useAfterAuth,
  useAppName,
  useCooldown,
  useDocumentTitle,
  useErrorText,
  useFinePointer,
  useHeadingFocus,
  type ProfileField,
} from '@/auth/kit';
import { useAuthText } from '@/auth/strings';

/**
 * The extra fields this app's user model asks for at signup. They are written here, literally, because this screen
 * and the user model are one contract: a required field the screen does not send would block every new account.
 * Keep the ids in sync with the user model when either side changes.
 */
const PROFILE_FIELDS: ProfileField[] = /*@fab:signup-fields*/ [
  {
    id: 'phone',
    label: 'Telefone',
    type: 'phone',
    required: false,
  },
  {
    id: 'city',
    label: 'Cidade',
    type: 'text',
    required: false,
  },
  {
    id: 'bio',
    label: 'Apresentação',
    type: 'text',
    required: false,
  },
]; /*@fab:end*/

export default function Signup() {
  const { user, isLoggedIn, isLoading, signup, resendVerification } = useAuth();
  const t = useAuthText();
  const errorText = useErrorText();
  const app = useAppName();
  const target = useAfterAuth();
  const navigate = useNavigate();
  const fine = useFinePointer();
  const cooldown = useCooldown(45);

  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [profile, setProfile] = React.useState<Record<string, unknown>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pendingEmail, setPendingEmail] = React.useState<string | null>(null);
  const [resent, setResent] = React.useState(false);
  const headingRef = useHeadingFocus(pendingEmail);

  useDocumentTitle(t('signup.title'));

  if (isLoading) return <AuthLoading />;
  const waitingForEmail =
    pendingEmail !== null || (!!user && AUTH.emailVerification === 'required' && user.email_verified === false);
  if (isLoggedIn && !waitingForEmail) return <Navigate to={target} replace />;

  if (!AUTH.signupOpen) {
    return (
      <AuthFrame
        title={t('signup.closedTitle')}
        footer={
          <p>
            <TextLink to="/login">{t('common.backToLogin')}</TextLink>
          </p>
        }
      >
        <AuthNotice tone="info">{t('signup.closedBody', { app: app || '' })}</AuthNotice>
      </AuthFrame>
    );
  }

  if (waitingForEmail) {
    const shown = pendingEmail ?? user?.email ?? '';
    return (
      <AuthFrame
        title={t('signup.checkTitle')}
        headingRef={headingRef}
        footer={
          <p>
            <TextLink to="/login">{t('common.backToLogin')}</TextLink>
          </p>
        }
      >
        <div className="grid gap-4">
          <AuthNotice tone="info">{t('signup.checkBody', { email: shown })}</AuthNotice>
          {resent ? <AuthNotice tone="success">{t('login.verificationSent')}</AuthNotice> : null}
          <button
            type="button"
            disabled={cooldown.left > 0}
            onClick={async () => {
              try {
                await resendVerification(window.location.origin + '/');
                setResent(true);
                cooldown.start();
              } catch (err) {
                setFormError(errorText(err));
              }
            }}
            className="auth-btn-secondary inline-flex h-12 items-center justify-center rounded-[var(--auth-radius-button)] border border-input bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-60 md:h-11"
          >
            <span className="tabular-nums">
              {cooldown.left > 0 ? t('common.resendIn', { s: cooldown.left }) : t('common.resend')}
            </span>
          </button>
          {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
          <p className="text-[13px] text-muted-foreground">{t('common.spam')}</p>
        </div>
      </AuthFrame>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = t('error.required', { field: t('common.name').toLowerCase() });
    if (!email.trim()) next.email = t('error.required', { field: t('common.email').toLowerCase() });
    else if (!isEmail(email)) next.email = t('error.emailInvalid');
    if (password.length < AUTH.minPassword) next.password = t('rules.min', { n: AUTH.minPassword });
    for (const f of PROFILE_FIELDS) {
      const v = profile[f.id];
      if (f.required && (v === undefined || v === null || v === '' || v === false))
        next[f.id] = t('error.required', { field: f.label.toLowerCase() });
    }
    setErrors(next);
    const first = ['name', 'email', 'password', ...PROFILE_FIELDS.map((f) => f.id)].find((k) => next[k]);
    if (first) {
      document.getElementById(`signup-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const clean = Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== '' && v !== undefined));
      const created = await signup({
        name: name.trim(),
        email: normalizeEmail(email),
        password,
        passwordConfirmation: password,
        profile: Object.keys(clean).length ? (clean as Parameters<typeof signup>[0]['profile']) : undefined,
      });
      if (AUTH.emailVerification === 'required' && created.email_verified === false)
        setPendingEmail(created.email ?? normalizeEmail(email));
      else navigate(target, { replace: true });
    } catch (err) {
      setFormError(errorText(err, 'signup'));
    } finally {
      setBusy(false);
    }
  }

  const social = <ProviderButtons />;
  const hasSocial = AUTH.providers.length > 0;

  return (
    <AuthFrame
      title={t('signup.title')}
      subtitle={PROFILE_FIELDS.length <= 1 ? t('signup.subtitle') : undefined}
      headingRef={headingRef}
      footer={
        <p>
          {t('signup.haveAccount')} <TextLink to="/login">{t('signup.signIn')}</TextLink>
        </p>
      }
    >
      <div className="grid gap-5">
        {hasSocial && AUTH.socialFirst ? (
          <>
            {social}
            <OrDivider />
          </>
        ) : null}
        <form onSubmit={submit} noValidate className="grid gap-4">
          <AuthField id="signup-name" label={t('common.name')} error={errors.name}>
            <AuthInput
              name="name"
              type="text"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              autoFocus={fine}
              placeholder={t('common.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </AuthField>
          <AuthField id="signup-email" label={t('common.email')} error={errors.email}>
            <AuthInput
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="next"
              placeholder={t('common.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => email && !isEmail(email) && setErrors((p) => ({ ...p, email: t('error.emailInvalid') }))}
              required
            />
          </AuthField>
          <AuthField id="signup-password" label={t('common.password')} error={errors.password}>
            <PasswordInput
              name="new-password"
              autoComplete="new-password"
              enterKeyHint={PROFILE_FIELDS.length ? 'next' : 'done'}
              minLength={AUTH.minPassword}
              aria-describedby="signup-password-rules"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </AuthField>
          <PasswordRules id="signup-password-rules" value={password} min={AUTH.minPassword} />
          {PROFILE_FIELDS.map((f) => (
            <ProfileInput
              key={f.id}
              field={f}
              name={f.id}
              value={profile[f.id]}
              error={errors[f.id]}
              onChange={(v) => setProfile((p) => ({ ...p, [f.id]: v }))}
            />
          ))}
          {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
          <SubmitButton busy={busy} busyLabel={t('common.sending')}>
            {t('signup.submit')}
          </SubmitButton>
        </form>
        {hasSocial && !AUTH.socialFirst ? (
          <>
            <OrDivider />
            {social}
          </>
        ) : null}
      </div>
    </AuthFrame>
  );
}

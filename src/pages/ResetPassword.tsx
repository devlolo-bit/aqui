import * as React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { ApiError, useAuth } from '@/lib/fab-client';
import AuthFrame from '@/auth/AuthFrame';
import { AUTH } from '@/auth/config';
import {
  AuthField,
  AuthLoading,
  AuthNotice,
  PasswordInput,
  PasswordRules,
  SubmitButton,
  TextLink,
  useAfterAuth,
  useDocumentTitle,
  useErrorText,
  useFinePointer,
  useHeadingFocus,
} from '@/auth/kit';
import { useAuthText } from '@/auth/strings';

export default function ResetPassword() {
  const { isLoading, resetPassword } = useAuth();
  const t = useAuthText();
  const errorText = useErrorText();
  const target = useAfterAuth();
  const navigate = useNavigate();
  const fine = useFinePointer();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const headingRef = useHeadingFocus(expired);

  useDocumentTitle(t('reset.title'));

  if (isLoading) return <AuthLoading />;

  const footer = (
    <p>
      <TextLink to="/login">{t('common.backToLogin')}</TextLink>
    </p>
  );
  const askNew = (
    <Link
      to="/forgot-password"
      className="auth-btn inline-flex h-12 items-center justify-center rounded-[var(--auth-radius-button)] bg-primary shadow-[var(--auth-button-shadow)] px-5 text-base font-semibold text-primary-foreground transition-transform duration-150 hover:bg-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-11 md:text-sm"
    >
      {t('reset.requestNew')}
    </Link>
  );

  if (!token || expired) {
    return (
      <AuthFrame
        title={token ? t('reset.expiredTitle') : t('reset.missingTitle')}
        headingRef={headingRef}
        footer={footer}
      >
        <div className="grid gap-4">
          <AuthNotice tone="info">{token ? t('reset.expiredBody') : t('reset.missingBody')}</AuthNotice>
          {askNew}
        </div>
      </AuthFrame>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    if (password.length < AUTH.minPassword) {
      setError(t('rules.min', { n: AUTH.minPassword }));
      document.getElementById('reset-password')?.focus();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await resetPassword(token, password, password);
      toast.success(t('reset.done'));
      navigate(target, { replace: true });
    } catch (err) {
      // 400 = the token is invalid, expired or already used: the form cannot succeed, so the screen says why.
      if (err instanceof ApiError && err.status === 400 && /token/i.test(err.message)) setExpired(true);
      else setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={t('reset.title')}
      subtitle={t('reset.subtitle', { n: AUTH.minPassword })}
      headingRef={headingRef}
      footer={footer}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        {/* lets the password manager update the right saved entry */}
        <input type="text" name="username" autoComplete="username" hidden readOnly value="" />
        <AuthField id="reset-password" label={t('common.newPassword')} error={error}>
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            enterKeyHint="done"
            autoFocus={fine}
            minLength={AUTH.minPassword}
            aria-describedby="reset-password-rules"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>
        <PasswordRules id="reset-password-rules" value={password} min={AUTH.minPassword} />
        {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
        <SubmitButton busy={busy} busyLabel={t('common.sending')}>
          {t('reset.submit')}
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}

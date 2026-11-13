import * as React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, useAuth } from '@/lib/fab-client';
import AuthFrame from '@/auth/AuthFrame';
import { AUTH } from '@/auth/config';
import {
  AuthField,
  AuthInput,
  AuthLoading,
  AuthNotice,
  PasswordInput,
  PasswordRules,
  SubmitButton,
  TextLink,
  useAppName,
  useDocumentTitle,
  useErrorText,
  useFinePointer,
} from '@/auth/kit';
import { useAuthText } from '@/auth/strings';

/** The invitation link lands here (`/accept-invite?token=…`): the person picks a name and a password and is in. */
export default function AcceptInvite() {
  const { isLoggedIn, isLoading, acceptInvite } = useAuth();
  const t = useAuthText();
  const errorText = useErrorText();
  const app = useAppName();
  const navigate = useNavigate();
  const fine = useFinePointer();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [name, setName] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ name?: string; password?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [invalid, setInvalid] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  useDocumentTitle(t('invite.title'));

  if (isLoading) return <AuthLoading />;
  if (isLoggedIn && !token) return <Navigate to={AUTH.home || '/'} replace />;

  const footer = (
    <p>
      <TextLink to="/login">{t('common.backToLogin')}</TextLink>
    </p>
  );

  if (!token || invalid) {
    return (
      <AuthFrame title={t('invite.invalidTitle')} footer={footer}>
        <AuthNotice tone="info">{t('invite.invalidBody')}</AuthNotice>
      </AuthFrame>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const next: typeof errors = {};
    if (!name.trim()) next.name = t('error.required', { field: t('common.name').toLowerCase() });
    if (password.length < AUTH.minPassword) next.password = t('rules.min', { n: AUTH.minPassword });
    setErrors(next);
    if (next.name) return document.getElementById('invite-name')?.focus();
    if (next.password) return document.getElementById('invite-password')?.focus();
    setBusy(true);
    try {
      await acceptInvite(token, name.trim(), password);
      navigate(AUTH.home || '/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 404 || err.status === 410)) setInvalid(true);
      else setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title={t('invite.title')} subtitle={app ? t('invite.subtitle', { app }) : undefined} footer={footer}>
      <form onSubmit={submit} noValidate className="grid gap-4">
        <AuthField id="invite-name" label={t('common.name')} error={errors.name}>
          <AuthInput
            name="name"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            autoFocus={fine}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </AuthField>
        <AuthField id="invite-password" label={t('common.password')} error={errors.password}>
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            enterKeyHint="done"
            minLength={AUTH.minPassword}
            aria-describedby="invite-password-rules"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>
        <PasswordRules id="invite-password-rules" value={password} min={AUTH.minPassword} />
        {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
        <SubmitButton busy={busy} busyLabel={t('common.sending')}>
          {t('invite.submit', { app: app || '' }).trim()}
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}

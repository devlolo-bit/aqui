import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/fab-client';
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
} from '@/auth/kit';
import { useAuthText } from '@/auth/strings';

/**
 * Change the password. A person whose account was created by an admin (`must_change_password`) is sent here right
 * after signing in, and does not need the current password; everyone else does.
 */
export default function ChangePassword() {
  const { user, isLoggedIn, isLoading, changePassword } = useAuth();
  const t = useAuthText();
  const errorText = useErrorText();
  const target = useAfterAuth();
  const navigate = useNavigate();
  const fine = useFinePointer();

  const [current, setCurrent] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errors, setErrors] = React.useState<{ current?: string; password?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const mustChange = !!user?.must_change_password;
  useDocumentTitle(mustChange ? t('change.titleMust') : t('change.titleChange'));

  if (isLoading) return <AuthLoading />;
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: { pathname: '/change-password' } }} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const next: typeof errors = {};
    if (!mustChange && !current)
      next.current = t('error.required', { field: t('common.currentPassword').toLowerCase() });
    if (password.length < AUTH.minPassword) next.password = t('rules.min', { n: AUTH.minPassword });
    setErrors(next);
    if (next.current) return document.getElementById('change-current')?.focus();
    if (next.password) return document.getElementById('change-password')?.focus();
    setBusy(true);
    try {
      await changePassword(password, mustChange ? undefined : current);
      toast.success(t('change.done'));
      navigate(target === '/change-password' ? AUTH.home || '/' : target, { replace: true });
    } catch (err) {
      setFormError(errorText(err, 'credentials'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame
      title={mustChange ? t('change.titleMust') : t('change.titleChange')}
      subtitle={mustChange ? t('change.subMust') : t('change.subChange')}
      footer={
        mustChange ? undefined : (
          <p>
            <TextLink to={AUTH.home || '/'}>{t('change.back')}</TextLink>
          </p>
        )
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <input type="text" name="username" autoComplete="username" hidden readOnly value={user?.email ?? ''} />
        {!mustChange ? (
          <AuthField id="change-current" label={t('common.currentPassword')} error={errors.current}>
            <PasswordInput
              name="current-password"
              autoComplete="current-password"
              enterKeyHint="next"
              autoFocus={fine}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              required
            />
          </AuthField>
        ) : null}
        <AuthField id="change-password" label={t('common.newPassword')} error={errors.password}>
          <PasswordInput
            name="new-password"
            autoComplete="new-password"
            enterKeyHint="done"
            autoFocus={fine && mustChange}
            minLength={AUTH.minPassword}
            aria-describedby="change-password-rules"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthField>
        <PasswordRules id="change-password-rules" value={password} min={AUTH.minPassword} />
        {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
        <SubmitButton busy={busy} busyLabel={t('common.sending')}>
          {t('change.submit')}
        </SubmitButton>
      </form>
    </AuthFrame>
  );
}

import * as React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/fab-client';
import { PhoneInput } from '@/components/ui/phone-input';
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
  isEmail,
  normalizeEmail,
  useAfterAuth,
  useCooldown,
  useDocumentTitle,
  useErrorText,
  useFinePointer,
  useHeadingFocus,
} from '@/auth/kit';
import { useAuthText } from '@/auth/strings';

export default function ForgotPassword() {
  const { isLoggedIn, isLoading, forgotPassword, phoneLogin, sendPhoneCode, resetPasswordSms } = useAuth();
  const t = useAuthText();
  const errorText = useErrorText();
  const target = useAfterAuth();
  const navigate = useNavigate();
  const fine = useFinePointer();
  const cooldown = useCooldown(45);

  const [bySms, setBySms] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{ email?: string; phone?: string; code?: string; password?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const headingRef = useHeadingFocus(`${bySms}-${sentTo}`);

  useDocumentTitle(t('forgot.title'));

  if (isLoading) return <AuthLoading />;
  // Signed in already: changing the password is the right screen, it does not need an email round trip.
  if (isLoggedIn) return <Navigate to="/change-password" replace />;

  async function requestLink(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!isEmail(email)) {
      setErrors({
        email: email.trim() ? t('error.emailInvalid') : t('error.required', { field: t('common.email').toLowerCase() }),
      });
      document.getElementById('forgot-email')?.focus();
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await forgotPassword(normalizeEmail(email), `${window.location.origin}/reset-password`);
      setSentTo(normalizeEmail(email));
      cooldown.start();
    } catch (err) {
      setFormError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function smsStep(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    if (!sentTo) {
      if (phone.replace(/\D/g, '').length < 10) return setErrors({ phone: t('error.phoneInvalid') });
      setErrors({});
      setBusy(true);
      try {
        await sendPhoneCode(phone, 'reset');
        setSentTo(phone);
        cooldown.start();
      } catch (err) {
        setFormError(errorText(err));
      } finally {
        setBusy(false);
      }
      return;
    }
    const next: typeof errors = {};
    if (code.replace(/\D/g, '').length < 6) next.code = t('error.codeInvalid');
    if (password.length < AUTH.minPassword) next.password = t('rules.min', { n: AUTH.minPassword });
    setErrors(next);
    if (next.code || next.password) return;
    setBusy(true);
    try {
      await resetPasswordSms(phone, code.replace(/\D/g, ''), password);
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(errorText(err, 'code'));
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <p>
      <TextLink to="/login">{t('common.backToLogin')}</TextLink>
    </p>
  );
  const switcher = phoneLogin ? (
    <button
      type="button"
      onClick={() => {
        setBySms((v) => !v);
        setSentTo(null);
        setErrors({});
        setFormError(null);
      }}
      className="auth-link -my-2 justify-self-start py-2 text-sm font-medium text-primary-text underline-offset-4 hover:underline"
    >
      {bySms ? t('forgot.byEmail') : t('forgot.bySms')}
    </button>
  ) : null;

  // The answer is the same whether or not the address has an account, so nobody learns who is registered here.
  if (!bySms && sentTo) {
    return (
      <AuthFrame title={t('forgot.sentTitle')} headingRef={headingRef} footer={footer}>
        <div className="grid gap-4">
          <AuthNotice tone="success">{t('forgot.sentBody', { email: sentTo })}</AuthNotice>
          <p className="text-[13px] text-muted-foreground">{t('common.spam')}</p>
          {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              disabled={cooldown.left > 0}
              onClick={() => requestLink()}
              className="auth-link -my-2 py-2 font-medium text-primary-text underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              <span className="tabular-nums">
                {cooldown.left > 0 ? t('common.resendIn', { s: cooldown.left }) : t('common.resend')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setEmail('');
              }}
              className="auth-link -my-2 py-2 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t('common.useAnotherEmail')}
            </button>
          </div>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title={t('forgot.title')}
      subtitle={bySms ? undefined : t('forgot.subtitle')}
      headingRef={headingRef}
      footer={footer}
    >
      {bySms ? (
        <form onSubmit={smsStep} noValidate className="grid gap-4">
          {!sentTo ? (
            <AuthField id="forgot-phone" label={t('common.phone')} error={errors.phone}>
              <PhoneInput value={phone} onChange={setPhone} autoComplete="tel" />
            </AuthField>
          ) : (
            <>
              <AuthNotice tone="info">{t('login.codeSent', { target: sentTo })}</AuthNotice>
              <AuthField id="forgot-code" label={t('common.code')} error={errors.code}>
                <AuthInput
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9 -]*"
                  maxLength={10}
                  className="text-center font-mono text-xl tracking-[0.35em] tabular-nums md:text-xl"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </AuthField>
              <AuthField id="forgot-new-password" label={t('common.newPassword')} error={errors.password}>
                <PasswordInput
                  name="new-password"
                  autoComplete="new-password"
                  minLength={AUTH.minPassword}
                  aria-describedby="forgot-password-rules"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </AuthField>
              <PasswordRules id="forgot-password-rules" value={password} min={AUTH.minPassword} />
            </>
          )}
          {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
          <SubmitButton busy={busy} busyLabel={t('common.sending')}>
            {sentTo ? t('forgot.smsSubmit') : t('login.sendCode')}
          </SubmitButton>
          {switcher}
        </form>
      ) : (
        <form onSubmit={requestLink} noValidate className="grid gap-4">
          <AuthField id="forgot-email" label={t('common.email')} error={errors.email}>
            <AuthInput
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              autoFocus={fine}
              placeholder={t('common.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </AuthField>
          {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
          <SubmitButton busy={busy} busyLabel={t('common.sending')}>
            {t('forgot.submit')}
          </SubmitButton>
          {switcher}
        </form>
      )}
    </AuthFrame>
  );
}

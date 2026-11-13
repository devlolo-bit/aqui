import * as React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/fab-client';
import { PhoneInput } from '@/components/ui/phone-input';
import AuthFrame from '@/auth/AuthFrame';
import { AUTH } from '@/auth/config';
import {
  AuthField,
  AuthInput,
  AuthLoading,
  AuthNotice,
  OrDivider,
  PasswordInput,
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
} from '@/auth/kit';
import { useAuthText } from '@/auth/strings';

type Mode = 'password' | 'code' | 'phone';

export default function Login() {
  const {
    user,
    isLoggedIn,
    isLoading,
    login,
    logout,
    phoneLogin,
    emailCodeLogin,
    sendEmailCode,
    loginWithEmailCode,
    sendPhoneCode,
    loginWithPhone,
    resendVerification,
  } = useAuth();
  const t = useAuthText();
  const errorText = useErrorText();
  const app = useAppName();
  const target = useAfterAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fine = useFinePointer();
  const cooldown = useCooldown(45);

  const modes: Mode[] = [
    'password',
    ...(emailCodeLogin ? (['code'] as Mode[]) : []),
    ...(phoneLogin ? (['phone'] as Mode[]) : []),
  ];
  const [mode, setMode] = React.useState<Mode>('password');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [code, setCode] = React.useState('');
  const [codeSent, setCodeSent] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; password?: string; phone?: string; code?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [resent, setResent] = React.useState(false);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const headingRef = useHeadingFocus(`${mode}-${codeSent}`);
  const resetDone = new URLSearchParams(location.search).get('reset') === '1';

  useDocumentTitle(t('login.title'));

  // A required confirmation keeps an unverified person here, with the way to get the email again.
  const mustVerify = !!user && AUTH.emailVerification === 'required' && user.email_verified === false;

  if (isLoading) return <AuthLoading />;
  if (isLoggedIn && user?.must_change_password) return <Navigate to="/change-password" replace />;
  if (isLoggedIn && !mustVerify) return <Navigate to={target} replace />;

  if (mustVerify) {
    return (
      <AuthFrame
        title={t('login.unverifiedTitle')}
        headingRef={headingRef}
        footer={
          <button
            type="button"
            onClick={() => logout()}
            className="auth-link -my-2 justify-self-start py-2 font-medium text-primary-text underline-offset-4 hover:underline"
          >
            {t('common.backToLogin')}
          </button>
        }
      >
        <div className="grid gap-4">
          <AuthNotice tone="info">{t('login.unverifiedBody', { email: user?.email ?? '' })}</AuthNotice>
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
            {cooldown.left > 0 ? t('common.resendIn', { s: cooldown.left }) : t('login.resendVerification')}
          </button>
          {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
          <p className="text-[13px] text-muted-foreground">{t('common.spam')}</p>
        </div>
      </AuthFrame>
    );
  }

  const done = (signedIn: { must_change_password?: boolean; email_verified?: boolean }) => {
    if (signedIn.must_change_password) navigate('/change-password', { replace: true });
    else if (!(AUTH.emailVerification === 'required' && signedIn.email_verified === false))
      navigate(target, { replace: true });
  };

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const next: typeof errors = {};
    if (!email.trim()) next.email = t('error.required', { field: t('common.email').toLowerCase() });
    else if (!isEmail(email)) next.email = t('error.emailInvalid');
    if (!password) next.password = t('error.required', { field: t('common.password').toLowerCase() });
    setErrors(next);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();
    setBusy(true);
    try {
      done(await login(normalizeEmail(email), password));
    } catch (err) {
      setFormError(errorText(err, 'credentials'));
      setPassword('');
      passwordRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setFormError(null);
    const viaPhone = mode === 'phone';
    if (!codeSent) {
      if (viaPhone ? phone.replace(/\D/g, '').length < 10 : !isEmail(email)) {
        setErrors(viaPhone ? { phone: t('error.phoneInvalid') } : { email: t('error.emailInvalid') });
        return;
      }
      setErrors({});
      setBusy(true);
      try {
        if (viaPhone) await sendPhoneCode(phone, 'login');
        else await sendEmailCode(normalizeEmail(email));
        setCodeSent(true);
        cooldown.start();
      } catch (err) {
        setFormError(errorText(err));
      } finally {
        setBusy(false);
      }
      return;
    }
    const digits = code.replace(/\D/g, '');
    if (digits.length < 6) return setErrors({ code: t('error.codeInvalid') });
    setBusy(true);
    try {
      done(viaPhone ? await loginWithPhone(phone, digits) : await loginWithEmailCode(normalizeEmail(email), digits));
    } catch (err) {
      setFormError(errorText(err, 'code'));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    try {
      if (mode === 'phone') await sendPhoneCode(phone, 'login');
      else await sendEmailCode(normalizeEmail(email));
      cooldown.start();
    } catch (err) {
      setFormError(errorText(err));
    }
  }

  const social = <ProviderButtons />;
  const hasSocial = AUTH.providers.length > 0;
  const modeLabel: Record<Mode, string> = {
    password: t('login.tabPassword'),
    code: t('login.tabCode'),
    phone: t('login.tabPhone'),
  };

  const passwordForm = (
    <form onSubmit={submitPassword} noValidate className="grid gap-4">
      <AuthField id="login-email" label={t('common.email')} error={errors.email}>
        <AuthInput
          ref={emailRef}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          autoFocus={fine}
          placeholder={t('common.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && !isEmail(email) && setErrors((p) => ({ ...p, email: t('error.emailInvalid') }))}
          required
        />
      </AuthField>
      <AuthField
        id="login-password"
        label={<span className="flex w-full items-baseline justify-between gap-3">{t('common.password')}</span>}
        error={errors.password}
      >
        <PasswordInput
          ref={passwordRef}
          name="password"
          autoComplete="current-password"
          enterKeyHint="go"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </AuthField>
      <div className="-mt-1 flex justify-end text-sm">
        <TextLink to="/forgot-password">{t('login.forgot')}</TextLink>
      </div>
      {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
      <SubmitButton busy={busy} busyLabel={t('common.signingIn')}>
        {t('login.submit')}
      </SubmitButton>
    </form>
  );

  const codeForm = (
    <form onSubmit={submitCode} noValidate className="grid gap-4">
      {!codeSent ? (
        mode === 'phone' ? (
          <AuthField id="login-phone" label={t('common.phone')} error={errors.phone}>
            <PhoneInput value={phone} onChange={setPhone} autoComplete="tel" className="auth-input-phone" />
          </AuthField>
        ) : (
          <AuthField id="login-code-email" label={t('common.email')} error={errors.email}>
            <AuthInput
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              placeholder={t('common.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </AuthField>
        )
      ) : (
        <>
          <AuthNotice tone="info">{t('login.codeSent', { target: mode === 'phone' ? phone : email })}</AuthNotice>
          <AuthField id="login-code" label={t('common.code')} error={errors.code}>
            <AuthInput
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 -]*"
              maxLength={10}
              spellCheck={false}
              enterKeyHint="go"
              className="text-center font-mono text-xl tracking-[0.35em] tabular-nums md:text-xl"
              value={code}
              onChange={(e) => {
                const v = e.target.value;
                setCode(v);
                if (v.replace(/\D/g, '').length === 6) setErrors({});
              }}
              required
            />
          </AuthField>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              disabled={cooldown.left > 0}
              onClick={resend}
              className="auth-link -my-2 py-2 font-medium text-primary-text underline-offset-4 hover:underline disabled:text-muted-foreground disabled:no-underline"
            >
              <span className="tabular-nums">
                {cooldown.left > 0 ? t('common.resendIn', { s: cooldown.left }) : t('common.resend')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode('');
              }}
              className="auth-link -my-2 py-2 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t('login.changeTarget')}
            </button>
          </div>
        </>
      )}
      {formError ? <AuthNotice tone="error">{formError}</AuthNotice> : null}
      <SubmitButton busy={busy} busyLabel={t('common.sending')}>
        {codeSent ? t('login.verify') : t('login.sendCode')}
      </SubmitButton>
    </form>
  );

  return (
    <AuthFrame
      title={t('login.title')}
      subtitle={app ? t('login.subtitle', { app }) : undefined}
      headingRef={headingRef}
      footer={
        AUTH.signupOpen ? (
          <p>
            {t('login.noAccount')} <TextLink to="/signup">{t('login.createAccount')}</TextLink>
          </p>
        ) : (
          <p>{t('login.inviteHint')}</p>
        )
      }
    >
      <div className="grid gap-5">
        {resetDone ? <AuthNotice tone="success">{t('login.resetDone')}</AuthNotice> : null}
        {hasSocial && AUTH.socialFirst ? (
          <>
            {social}
            <OrDivider />
          </>
        ) : null}
        {modes.length > 1 ? (
          <div
            role="radiogroup"
            aria-label={t('login.title')}
            className="auth-modes grid grid-flow-col gap-1 rounded-[var(--auth-radius-control)] bg-muted p-1"
          >
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                onClick={() => {
                  setMode(m);
                  setCodeSent(false);
                  setCode('');
                  setErrors({});
                  setFormError(null);
                }}
                className="h-10 rounded-[calc(var(--radius)-4px)] px-3 text-sm font-medium text-muted-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {modeLabel[m]}
              </button>
            ))}
          </div>
        ) : null}
        {mode === 'password' ? passwordForm : codeForm}
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
